// Handles UD-LINK-XXXXXX messages — links the sender's chat to a UD user.
//
// Flow:
//   1. User clicks "Start linking" in UD UI → mints a code → tells user to send to bot
//   2. User sends "UD-LINK-XXX..." to @ud_system_bot
//   3. This handler runs:
//        - extracts the code
//        - POSTs to UD backend's /api/telegram/consume-link-code
//        - replies in chat with success/failure
//
// IMPORTANT: this handler MUST run before the auth-gate middleware blocks
// unauthorized users. Linking must work for users who aren't on
// ALLOWED_TELEGRAM_IDS yet — otherwise we'd have a chicken-and-egg problem.

import { Context } from 'telegraf';
import axios from 'axios';

const CODE_REGEX = /UD-LINK-[A-Z0-9]+/i;

export function isLinkCodeMessage(text: string): boolean {
  return CODE_REGEX.test(text || '');
}

export async function linkCodeHandler(ctx: Context, text: string): Promise<void> {
  const match = (text || '').match(CODE_REGEX);
  if (!match) return;
  const code = match[0].toUpperCase();

  const chatId = ctx.chat?.id;
  if (chatId === undefined) {
    await ctx.reply('Could not determine chat — please try again.');
    return;
  }

  // The bot uses BACKEND_API_URL (matches existing config.ts) — that value
  // typically already includes "/api". Strip trailing slash for safe joining.
  const backendApiUrl = process.env.BACKEND_API_URL || 'http://localhost:3010/api';
  const linkSecret = process.env.TELEGRAM_LINK_SECRET;

  if (!linkSecret) {
    console.error('[linkCode] TELEGRAM_LINK_SECRET is missing in env');
    await ctx.reply('🛑 Bot is misconfigured: link secret not set. Tell the admin.');
    return;
  }

  // Build chat label for friendly logging
  const chat = ctx.chat as any;
  const chatLabel =
    chat?.username
      ? '@' + chat.username
      : `${chat?.first_name ?? ''} ${chat?.last_name ?? ''}`.trim() || `chat:${chatId}`;

  try {
    // BACKEND_API_URL already includes "/api" — append our path under /api/telegram
    const url = backendApiUrl.replace(/\/$/, '') + '/telegram/consume-link-code';
    const res = await axios.post(
      url,
      { code, chatId: String(chatId), chatLabel },
      {
        headers: {
          'x-telegram-link-secret': linkSecret,
          'Content-Type': 'application/json',
        },
        timeout: 10_000,
        // Don't throw on non-2xx — we handle them below
        validateStatus: () => true,
      }
    );

    if (res.status === 200 && res.data?.ok) {
      const u = res.data.user || {};
      const name = (u.firstName || '').trim() || 'there';
      await ctx.reply(
        `✅ Linked successfully!\n\n` +
        `Hi ${name} — your Telegram is now connected to your UD account (${u.email || 'unknown email'}).\n\n` +
        `You'll receive notifications here for drying readings, close approvals, and other events.`,
        { parse_mode: 'HTML' }
      );
      return;
    }

    // Specific failure modes
    const reason = res.data?.reason;
    const message = res.data?.message;
    if (res.status === 404 && reason === 'unknown_or_expired') {
      await ctx.reply(
        `❌ That code is unknown or expired.\n\n` +
        `Open the UD app → Settings → Telegram → click "Start linking" again to get a fresh code.`
      );
      return;
    }
    if (res.status === 409 && reason === 'chat_already_linked') {
      await ctx.reply(
        `⚠️ This Telegram chat is already linked to a different UD user.\n\n` +
        `Each chat can be linked to one user only. If this is a mistake, ask an admin to unlink the other account first.`
      );
      return;
    }

    console.error('[linkCode] backend returned unexpected response', { status: res.status, data: res.data });
    await ctx.reply(`❌ Could not link: ${message || `server returned ${res.status}`}.`);
  } catch (err: any) {
    console.error('[linkCode] failed to call backend:', err?.message || err);
    await ctx.reply(
      `❌ Could not reach the UD server right now. Try again in a minute. If the problem persists, contact an admin.`
    );
  }
}
