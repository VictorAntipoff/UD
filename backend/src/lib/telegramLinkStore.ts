// Shared in-memory store for Telegram link codes.
// Lives in lib/ because two route modules need access:
//   - users.ts: mints codes via POST /me/telegram/start-link
//   - telegram-link.ts: consumes them via POST /telegram/consume-link-code
//
// Codes are short-lived (10 min) so a backend restart wiping the Map is fine.
// User just clicks "Start linking" again to get a new code.

import crypto from 'node:crypto';

export interface PendingLinkCode {
  userId: string;
  code: string;
  createdAt: number;
  expiresAt: number;
}

export const pendingLinkCodes = new Map<string, PendingLinkCode>();
export const userActiveLinkCode = new Map<string, string>();
export const LINK_CODE_TTL_MS = 10 * 60 * 1000;

export function generateLinkCode(): string {
  // Crockford-friendly alphabet (no 0/O/1/I/L) — easier to read on phones
  const alphabet = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
  let s = '';
  for (let i = 0; i < 6; i++) {
    s += alphabet[crypto.randomInt(0, alphabet.length)];
  }
  return `UD-LINK-${s}`;
}

export function pruneExpiredLinkCodes(): void {
  const now = Date.now();
  for (const [code, entry] of pendingLinkCodes) {
    if (entry.expiresAt <= now) {
      pendingLinkCodes.delete(code);
      if (userActiveLinkCode.get(entry.userId) === code) {
        userActiveLinkCode.delete(entry.userId);
      }
    }
  }
}
