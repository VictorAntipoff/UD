// Telegram notification helper.
//
// Single entrypoint for pushing messages from the UD backend to a user's
// Telegram chat via the @ud_system_bot bot. Uses the Bot API directly
// (no separate service required).
//
// Usage:
//   await sendTelegramMessage({ userId: 'abc-123', text: 'Hello' });
//   await sendTelegramMessageToChatId({ chatId: '987654321', text: 'Hello' });
//
// Behaviour:
//   - Silently no-op if user has no telegramChatId linked (logs at info level).
//   - Silently no-op if TELEGRAM_BOT_TOKEN is missing in env (logs warn).
//   - Catches all errors (network, Telegram API, etc.) and returns { ok, error }.
//     Never throws; never crashes the parent request.
//
// Why direct fetch and not the bot service:
//   The telegram-bot/ service is for inbound bot interactions (users sending
//   /start, /menu, etc.). For outbound notifications we don't need a bot
//   loop — just the Telegram Bot API's sendMessage endpoint.

import { prisma } from '../lib/prisma.js';

const TELEGRAM_API = 'https://api.telegram.org';

// Cloudinary-hosted Material outline icons (grey #64748b on white) that match
// the sidebar visual identity. When passed as iconUrl on sendTelegramMessage,
// the caller's text becomes the photo caption underneath the icon.
const CLOUDINARY_TRANSFORM = 'f_png,w_512,h_512,c_pad,b_white,e_colorize:100,co_rgb:64748b';
const CLOUDINARY_BASE = `https://res.cloudinary.com/ddi83fky2/image/upload/${CLOUDINARY_TRANSFORM}/ud-icons`;

export const TELEGRAM_ICONS = {
  woodReceipt:     `${CLOUDINARY_BASE}/inventory_2.svg`,
  drying:          `${CLOUDINARY_BASE}/dry.svg`,
  woodTransfer:    `${CLOUDINARY_BASE}/local_shipping.svg`,
  stockAdjustment: `${CLOUDINARY_BASE}/tune.svg`,
  lukuRecharge:    `${CLOUDINARY_BASE}/bolt.svg`,
} as const;

export interface SendResult {
  ok: boolean;
  skipped?: 'no_token' | 'no_chat_id' | 'user_not_found';
  error?: string;
  telegramMessageId?: number;
}

interface SendArgs {
  userId: string;
  text: string;
  parseMode?: 'Markdown' | 'MarkdownV2' | 'HTML';
  silent?: boolean;          // Telegram will deliver without sound
  iconUrl?: string;          // When set, send as photo with text as caption
}

interface SendToChatArgs {
  chatId: string;
  text: string;
  parseMode?: 'Markdown' | 'MarkdownV2' | 'HTML';
  silent?: boolean;
  iconUrl?: string;
}

/**
 * Send a Telegram message to a user (looked up by their User.id).
 * Returns { ok, ... } — never throws.
 */
export async function sendTelegramMessage(args: SendArgs): Promise<SendResult> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.warn('[telegramNotify] TELEGRAM_BOT_TOKEN missing in env — skipping send');
    return { ok: false, skipped: 'no_token' };
  }

  let user;
  try {
    user = await prisma.user.findUnique({
      where: { id: args.userId },
      select: { id: true, telegramChatId: true, isActive: true },
    });
  } catch (err: any) {
    console.error('[telegramNotify] failed to look up user', args.userId, err?.message);
    return { ok: false, error: err?.message ?? 'user lookup failed' };
  }

  if (!user) return { ok: false, skipped: 'user_not_found' };
  if (!user.telegramChatId) return { ok: false, skipped: 'no_chat_id' };
  if (!user.isActive) return { ok: false, skipped: 'no_chat_id' };  // treat inactive same as unlinked

  return sendTelegramMessageToChatId({
    chatId: user.telegramChatId,
    text: args.text,
    parseMode: args.parseMode,
    silent: args.silent,
    iconUrl: args.iconUrl,
  });
}

/**
 * Send a Telegram message to a specific chat ID (used by the welcome-message
 * flow before the link is saved, plus by the user-lookup path above).
 */
export async function sendTelegramMessageToChatId(args: SendToChatArgs): Promise<SendResult> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.warn('[telegramNotify] TELEGRAM_BOT_TOKEN missing in env — skipping send');
    return { ok: false, skipped: 'no_token' };
  }

  try {
    // When iconUrl is present, send as a photo with the message as caption.
    // Caption supports the same Markdown/HTML parse modes as sendMessage but
    // is capped at 1024 chars by Telegram (sendMessage allows 4096).
    const usePhoto = Boolean(args.iconUrl) && args.text.length <= 1024;
    const endpoint = usePhoto ? 'sendPhoto' : 'sendMessage';
    const url = `${TELEGRAM_API}/bot${token}/${endpoint}`;

    const body: any = { chat_id: args.chatId };
    if (usePhoto) {
      body.photo = args.iconUrl;
      body.caption = args.text;
      if (args.parseMode) body.caption_parse_mode = args.parseMode;
    } else {
      body.text = args.text;
      if (args.parseMode) body.parse_mode = args.parseMode;
    }
    if (args.silent) body.disable_notification = true;

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      // Telegram is usually fast; bound the wait so a hung request doesn't
      // cascade-stall the calling endpoint.
      signal: AbortSignal.timeout(10_000),
    });

    const json = (await res.json()) as any;
    if (!res.ok || !json?.ok) {
      const err = json?.description ?? `HTTP ${res.status}`;
      console.error('[telegramNotify] send failed', { chatId: args.chatId, endpoint, error: err });
      return { ok: false, error: err };
    }
    return { ok: true, telegramMessageId: json.result?.message_id };
  } catch (err: any) {
    const msg = err?.message ?? String(err);
    console.error('[telegramNotify] send threw', { chatId: args.chatId, error: msg });
    return { ok: false, error: msg };
  }
}

/**
 * Convenience: send the same message to multiple users in parallel.
 * Returns per-user results so the caller can log/handle individually.
 */
export async function sendTelegramMessageToMany(
  userIds: string[],
  text: string,
  options: Partial<Omit<SendArgs, 'userId' | 'text'>> = {}
): Promise<Array<SendResult & { userId: string }>> {
  const unique = [...new Set(userIds.filter(Boolean))];
  return Promise.all(
    unique.map(async (userId) => {
      const r = await sendTelegramMessage({ userId, text, ...options });
      return { userId, ...r };
    })
  );
}

export type TelegramIconKey = keyof typeof TELEGRAM_ICONS;

/**
 * Helper: format a welcome message for newly-linked users.
 * Uses Markdown for emphasis. Caller passes the user's first name for personalisation.
 */
export function formatWelcomeMessage(opts: { firstName?: string | null }): string {
  const name = opts.firstName?.trim() || 'there';
  return [
    '🎉 *Welcome to UDesign!*',
    '━━━━━━━━━━━━━━━━━━━━━',
    `Hi ${name} — your Telegram is now linked to UDesign.`,
    '',
    '*You will receive notifications for:*',
    '• Drying readings',
    '• Close requests & approvals',
    '• Process reopens',
    '',
    '_You can manage your notification preferences from the UD app._',
    '━━━━━━━━━━━━━━━━━━━━━',
    'UDesign Management System',
  ].join('\n');
}

/**
 * Returns true if the Telegram integration is currently usable
 * (token present in env). Caller can use this to gate UI features.
 */
export function isTelegramConfigured(): boolean {
  return Boolean(process.env.TELEGRAM_BOT_TOKEN);
}
