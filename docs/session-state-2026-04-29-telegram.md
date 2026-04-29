# Session state — Telegram linking work

**Last working session:** 2026-04-29
**Status when paused:** code is built and pushed; Railway env vars staged but not yet deployed.

---

## Current state — where you stopped

You added two env vars on the **UD backend** Railway service (the one at `ud-production.up.railway.app`):

- `TELEGRAM_BOT_TOKEN` ← copied from telegram-bot service
- `TELEGRAM_LINK_SECRET=307ff4433581e794d97165ddcafef7c5dda47ae994e1188540d15e05feaf3320`

Variables count went from 10 to 12. **But Railway showed "Edited" / "2 Changes"** — the variables are staged, not yet deployed. **Next step is to trigger the deploy** so the new vars become active.

After the deploy lands, the production backend will respond correctly to the bot's link callback, and the link flow will work end-to-end.

---

## Quick resume — 5-minute checklist

### 1. Trigger the staged Railway deploy

In Railway → UD service → either:
- Click the "Deploy" button on the staged-changes banner, OR
- Deployments tab → most recent deployment → ⋮ → Redeploy

Wait 1-2 minutes for the build + healthcheck.

### 2. Verify env vars are now active

```bash
SECRET=307ff4433581e794d97165ddcafef7c5dda47ae994e1188540d15e05feaf3320
curl -sS -w "HTTP %{http_code}\n" \
  -X POST https://ud-production.up.railway.app/api/telegram/consume-link-code \
  -H "Content-Type: application/json" \
  -H "x-telegram-link-secret: $SECRET" \
  -d '{"code":"X","chatId":"1"}'
```

Expected results:
- **HTTP 404 + body `{"reason":"unknown_or_expired"}`** → ✅ secret loaded, route works (code "X" doesn't exist, which is correct)
- HTTP 500 "Server misconfigured" → backend still doesn't see the secret. Re-check Railway variable name and that the deploy actually finished.
- HTTP 404 + body `{"error":"Not found"}` → secret value mismatch between local and Railway.

### 3. Smoke test end-to-end

1. Open prod app (or `localhost:3020`) → User Settings → Telegram Notifications
2. Click **Start linking** → get fresh code (e.g. `UD-LINK-X3K7M2`)
3. From your phone, send that exact text to **@ud_system_bot** on Telegram
4. Within 2-3 seconds you should see:
   - Bot replies on Telegram: "✅ Linked successfully!"
   - UD UI flips to "Telegram is linked"
   - Welcome message arrives on your phone

If anything fails, the bot's reply will say what went wrong.

### 4. Verify in DB

```bash
cd backend
npx tsx -e "
import('./src/lib/prisma.js').then(async m => {
  const u = await m.prisma.user.findUnique({
    where: { email: 'victor@udesign.co.tz' },
    select: { telegramChatId: true, telegramLinkedAt: true },
  });
  console.log(u);
  await m.prisma.\$disconnect();
});
"
```

`telegramChatId` should now be set.

---

## What was built in this Telegram work (recap)

### Database
- `User.telegramChatId` (text, nullable, unique-when-not-null)
- `User.telegramLinkedAt` (timestamp, nullable)
- `NotificationSubscription.telegram` (boolean, default false)
- All applied directly via Neon SQL editor (not Prisma migrations)

### Backend (`backend/`)
- `src/services/telegramNotify.ts` — `sendTelegramMessage()` outbound helper
- `src/lib/telegramLinkStore.ts` — in-memory link-code store (10 min TTL)
- `src/routes/telegram-link.ts` — internal `POST /api/telegram/consume-link-code` (secret-gated, called by bot)
- `src/routes/users.ts` — `GET/PUT /api/users/me/telegram`, `POST /api/users/me/telegram/start-link`, `POST /api/users/me/telegram/test`
- `src/routes/factory.ts` — Telegram dispatch wired into 5 events: reading-added, close-requested, close-approved, close-rejected, reopen
- `src/index.ts` — registers the new telegram-link route at `/api/telegram` prefix

### Telegram bot (`telegram-bot/`)
- `src/handlers/linkCode.ts` — recognizes `UD-LINK-XXXXXX` text, calls backend's consume endpoint
- `src/index.ts` — pre-auth middleware so unauthorized users CAN link (otherwise chicken-and-egg)
- Bot must be deployed with `BACKEND_API_URL` and `TELEGRAM_LINK_SECRET` env vars

### Frontend (`frontend/`)
- `src/pages/settings/UserSettings.tsx` — "Telegram Notifications" Paper section with:
  - **Easy flow** (default): Start linking → display code → poll every 2.5s → auto-link when bot writes the chatId
  - **Advanced flow** (collapsible): manual chat-ID paste for power users
  - "Send test message" button when linked

---

## Why production deploy initially failed (fixed earlier in this session)

The first prod deploy failed with "Healthcheck failure" because:
1. Stale `backend/dist/*.js` was committed to Git long ago
2. `.gitignore` has `dist/` but doesn't retroactively untrack already-committed files
3. Nixpacks: `npm run build` produced fresh `dist/`, then copied source tree into container, **overwriting fresh dist with the stale committed dist**
4. Container loaded stale `prisma.js` missing the `runInsideStockLedger` export, `users.ts` import failed, healthcheck timeout, deploy failed

**Fix applied (committed):**
- `git rm --cached` on 15 stale `backend/dist/*.js` files
- New `backend/.dockerignore` excluding `dist/`, `node_modules/`, `.env*`

After that fix, prod backend redeployed successfully.

---

## Env var summary (which service needs what)

| Variable | UD backend service | telegram-bot service |
|---|---|---|
| `TELEGRAM_BOT_TOKEN` | ✅ needed (outbound notify) | ✅ needed (inbound) |
| `TELEGRAM_LINK_SECRET` | ✅ needed (verify bot callback) | ✅ needed (sign callback) |
| `BACKEND_API_URL` | n/a | ✅ needed — should point at `https://ud-production.up.railway.app/api` |
| `ALLOWED_TELEGRAM_IDS` | n/a | ✅ existing |
| Standard backend vars (DATABASE_URL, JWT_SECRET, etc.) | ✅ existing | n/a |

**The two values must match exactly between the two services for `TELEGRAM_LINK_SECRET`.**

The secret value (also in `backend/.env`):
```
307ff4433581e794d97165ddcafef7c5dda47ae994e1188540d15e05feaf3320
```

---

## What's still queued (post-Telegram)

1. **Verify Telegram outbound notifications fire** when stock events happen (reading added, close requested, etc.) — should "just work" once linking completes
2. **Phase B** (separate session): period locking + daily reconciliation cron — long-term audit hardening
3. **Frontend smoke test** of stock workflows (transfers, receipts) post-Phase-A — never been UI-tested with real data after the refactor

---

## Files changed in this session (uncommitted as of pause)

```
M  frontend/src/components/Layout/TopBar.tsx           (TopBar profile-link bug fix)
M  frontend/src/pages/factory/DryingProcess.tsx        (drying UI from earlier work)
M  frontend/src/pages/settings/UserSettings.tsx        (Telegram link UI)
M  telegram-bot/package-lock.json
M  telegram-bot/src/index.ts                           (added pre-auth middleware)
?? backend/.dockerignore                              (NEW)  ← DEPLOYED
?? telegram-bot/src/handlers/linkCode.ts               (NEW)  ← DEPLOYED
?? backups/                                            (data backups, not for git)
?? docs/                                               (this file + others)
```

The deploy fix files (`.dockerignore` + dist/ untracking) **are committed and pushed** — that's what made the latest prod deploy succeed.

Frontend changes from this session are **NOT yet committed**. If you want them on prod, they need a frontend commit + push.
