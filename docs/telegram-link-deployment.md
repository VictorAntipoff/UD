# Telegram link-code deployment notes

## What this is

Deploying the new "send a code to the bot, link automatically" flow. Both the
backend and the telegram-bot service need a shared `TELEGRAM_LINK_SECRET` env
var. The bot calls `POST /api/telegram/consume-link-code` on the backend with
that secret in the `x-telegram-link-secret` header.

## Local secret (already added to `.env` files)

A 64-char hex secret has been generated and added to:
- `backend/.env`  → `TELEGRAM_LINK_SECRET=<value>`
- `telegram-bot/.env`  → `TELEGRAM_LINK_SECRET=<value>`

Read the value from `backend/.env` if you need to copy it elsewhere:

```sh
grep '^TELEGRAM_LINK_SECRET=' backend/.env
```

## Production deployment (Railway)

### 1. Set env var on the bot service

In your Railway dashboard, find the `telegram-bot` service. Add a new env var:

```
TELEGRAM_LINK_SECRET=<paste the value from backend/.env>
```

Also confirm the bot already has:
- `TELEGRAM_BOT_TOKEN`  — yes (existing)
- `BACKEND_API_URL`  — should be `https://<your-prod-backend>/api`
- `ALLOWED_TELEGRAM_IDS`  — yes (existing)

### 2. Set env var on the backend service (production)

If the production backend runs on Railway/Vercel/elsewhere, add the SAME secret
there:

```
TELEGRAM_LINK_SECRET=<same value as the bot>
```

The backend uses this to authenticate the bot's `consume-link-code` callback.

### 3. Deploy the bot's new code

The bot has new files:
- `telegram-bot/src/handlers/linkCode.ts`  — new
- `telegram-bot/src/index.ts`  — updated (added pre-auth middleware)

Push to the bot's git remote. Railway will auto-redeploy. Watch the deploy log
for "🤖 Telegram bot started successfully!" — that confirms it's alive.

### 4. Deploy the backend's new code

The backend has:
- `backend/src/lib/telegramLinkStore.ts`  — new (shared in-memory store)
- `backend/src/routes/telegram-link.ts`  — new (consume endpoint)
- `backend/src/routes/users.ts`  — updated (uses shared store)
- `backend/src/index.ts`  — updated (registers new route)

Push to wherever your backend deploys from.

## Smoke test after deploy

1. Open UD app → User Settings → Telegram Notifications
2. Click "Start linking" → see code like `UD-LINK-X3K7M2`
3. Send that exact text to @ud_system_bot in Telegram
4. Bot should reply: "✅ Linked successfully!"
5. UD app polls every 2.5s and flips to "Telegram is linked" within ~3s
6. Phone receives a welcome message

If step 4 doesn't happen → check the bot's Railway logs. Common errors:
- `[linkCode] TELEGRAM_LINK_SECRET is missing in env` → secret not set on bot
- `Could not reach the UD server` → `BACKEND_API_URL` wrong on bot
- `❌ That code is unknown or expired` → user used an old code (mint a fresh one)

If step 4 succeeds but step 5 doesn't → check backend logs for the
`consume-link-code` request. Most common: `TELEGRAM_LINK_SECRET` mismatched
between bot and backend.

## Rolling back

The new code is purely additive:
- New `lib/telegramLinkStore.ts`, `routes/telegram-link.ts`, bot's `handlers/linkCode.ts`
- One new pre-auth middleware in the bot
- No schema changes, no data migrations

To roll back: revert the commits, redeploy. Existing functionality (in-app
notifications, manual chat-ID entry in "Advanced" mode) keeps working without
any changes.
