# 🤖 Create UD System Bot - Quick Guide

## Step 1: Open BotFather (1 minute)

1. Open **Telegram** on your phone
2. Tap **Search** (🔍) at the top
3. Type: `@BotFather`
4. Tap on **BotFather** (blue verified checkmark ✓)
5. Tap **"START"**

---

## Step 2: Create Your Bot (2 minutes)

### Type these commands:

**You type:**
```
/newbot
```

**BotFather asks:** "How are we going to call it?"

**You type:**
```
UD System
```

**BotFather asks:** "Now choose a username for your bot"

**You type:**
```
ud_system_bot
```

⚠️ **If username is taken, try:**
- `ud_system_drying_bot`
- `victor_ud_system_bot`
- `ud_wood_system_bot`

**BotFather replies with your TOKEN:**
```
Done! Congratulations on your new bot!

Use this token to access the HTTP API:
1234567890:ABCdefGHIjklMNOpqrsTUVwxyz-1234567
```

📝 **Copy this token and save it!**

---

## Step 3: Get Your Telegram ID (1 minute)

1. Search: `@userinfobot`
2. Tap **"START"**
3. Bot shows:
   ```
   Id: 123456789
   ```
4. **Copy your ID number**

---

## Step 4: Get Cloudinary Account (3 minutes)

1. Go to: `cloudinary.com/users/register/free`
2. Sign up (free account)
3. After login, copy from dashboard:
   - **Cloud Name**: e.g., `dkxyz123`
   - **API Key**: e.g., `123456789012345`
   - **API Secret**: Click eye icon 👁️ to reveal, then copy

---

## Step 5: Configure on Server (5 minutes)

On your computer, open terminal:

```bash
cd /Users/victor/Development/UD/telegram-bot
```

Create `.env` file:
```bash
nano .env
```

Paste this:
```env
TELEGRAM_BOT_TOKEN=YOUR_TOKEN_HERE
ALLOWED_TELEGRAM_IDS=YOUR_USER_ID_HERE

BACKEND_API_URL=http://localhost:3010/api
BACKEND_API_KEY=

CLOUDINARY_CLOUD_NAME=YOUR_CLOUD_NAME
CLOUDINARY_API_KEY=YOUR_API_KEY
CLOUDINARY_API_SECRET=YOUR_API_SECRET

OCR_CONFIDENCE_THRESHOLD=70
NODE_ENV=development
```

**Replace:**
- `YOUR_TOKEN_HERE` → Token from Step 2
- `YOUR_USER_ID_HERE` → ID from Step 3
- `YOUR_CLOUD_NAME` → Cloud name from Step 4
- `YOUR_API_KEY` → API key from Step 4
- `YOUR_API_SECRET` → API secret from Step 4

**Save:** Press `Ctrl+X`, then `Y`, then `Enter`

---

## Step 6: Install & Setup (5 minutes)

```bash
# Install dependencies
npm install

# Update database
cd ../backend
npx prisma db push
npx prisma generate

# Start backend (if not running)
npm run dev
```

**Keep backend terminal open!**

---

## Step 7: Start Bot (1 minute)

Open **NEW terminal**:

```bash
cd /Users/victor/Development/UD/telegram-bot
npm run dev
```

You should see:
```
✅ Configuration loaded
🤖 Telegram bot started successfully!
📱 Bot username: @ud_system_bot
```

✅ **Bot is running!**

---

## Step 8: Test It! (2 minutes)

### On Telegram:

1. Search: `@ud_system_bot`
2. Tap **"START"**

### Try Commands:

**Type:** `Menu`
```
Bot: 🔥 Active Drying Processes

1️⃣ UD-DRY-00012 - Teak 2"
   💧 Current: 15.5% → Target: 12%
   ⏱️ Est. Completion: 1.5 days
```

**Send a photo** of humidity meter:
1. Take photo
2. Send to bot
3. Select meter type
4. Bot extracts reading with OCR! 🎉

---

## 🎉 Done!

Your **UD System Bot** is ready!

### What You Can Do:

- 📋 Type **"Menu"** - See all active drying processes
- 📸 **Send photos** - Bot extracts meter readings automatically
- 📊 **Get estimates** - See completion times for each batch
- 💧 **Track humidity** - Monitor drying progress

### Bot Features:
✅ Automatic OCR reading extraction
✅ Humidity % and kWh detection
✅ Photo storage in Cloudinary
✅ Completion time estimates
✅ Manual entry if OCR fails

---

## 🔧 Troubleshooting

**Bot says "Unauthorized"?**
- Add your Telegram ID to `.env` file
- Restart bot

**Bot doesn't respond?**
- Check bot terminal shows "started successfully"
- Check backend is running on port 3010

**OCR not working?**
- Ensure good lighting when taking photos
- Get close to meter display
- Use "Enter Manually" as fallback

---

## 📱 Daily Usage

### Morning Check:
```
You: Menu
```
See all processes, humidity levels, and completion estimates.

### Record Reading:
1. Take photo of meter
2. Send to bot
3. Confirm extracted value
4. Select batch
5. Done! ✅

---

**Need detailed docs?** Check:
- [TELEGRAM_BOT_COMPLETE.md](TELEGRAM_BOT_COMPLETE.md) - Full documentation
- [TELEGRAM_BOT_SETUP.md](TELEGRAM_BOT_SETUP.md) - Technical setup

**Your UD System bot is production-ready!** 🚀
