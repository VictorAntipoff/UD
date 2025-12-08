# UD System Telegram Bot

Telegram bot for the UD System - monitors wood drying processes with automatic OCR for meter readings.

## Features

- 📊 **Menu Command** - View all active drying processes with real-time estimates
- 📸 **Photo Upload** - Send meter photos, bot extracts readings via OCR
- ⏱️ **Completion Estimates** - Get accurate completion time predictions
- 💧 **Humidity Tracking** - Monitor humidity levels and drying progress
- 🔋 **Electricity Monitoring** - Track Luku meter readings
- 📈 **Status Reports** - Detailed batch information on demand

## Setup

### 1. Create Telegram Bot

1. Open Telegram and search for `@BotFather`
2. Send `/newbot` command
3. Follow instructions to create your bot
4. Copy the bot token (looks like `123456789:ABCdefGHIjklMNOpqrsTUVwxyz`)

### 2. Get Your Telegram ID

1. Search for `@userinfobot` on Telegram
2. Start a chat with it
3. It will reply with your user ID (e.g., `123456789`)

### 3. Install Dependencies

```bash
cd telegram-bot
npm install
```

### 4. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` file:

```env
TELEGRAM_BOT_TOKEN=your_bot_token_here
ALLOWED_TELEGRAM_IDS=123456789,987654321
BACKEND_API_URL=http://localhost:3010/api
BACKEND_API_KEY=your_api_key
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

### 5. Run the Bot

Development mode:
```bash
npm run dev
```

Production mode:
```bash
npm run build
npm start
```

## Usage

### Menu Command

Send `Menu` or `/menu` to see all active drying processes:

```
🔥 Active Drying Processes

1️⃣ UD-DRY-00012 - Teak 2"
   💧 Current: 15.5% → Target: 12%
   ⏱️ Est. Completion: 1.5 days (Jan 8)
   📦 LOT: LOT-2024-001

📊 Total Active: 1 batch
🕐 Next reading due: 2 hours
```

### Upload Photos

1. Take a photo of humidity or Luku meter
2. Send photo to bot
3. Bot asks what type of meter
4. Bot processes with OCR
5. Select which batch to attach to
6. Reading saved automatically!

### Status Command

Get detailed info for a specific batch:

```
/status UD-DRY-00012
```

## Commands Reference

- `Menu` or `/menu` - Show all active processes
- `/list` - Alias for menu
- `/status [batch]` - Detailed batch status
- `/help` - Show help message
- `/start` - Welcome message

## Deployment

### Deploy to Railway

1. Create account on [Railway.app](https://railway.app)
2. Click "New Project" → "Deploy from GitHub repo"
3. Select this repository
4. Add environment variables from `.env`
5. Railway will auto-deploy!

### Deploy to Render

1. Create account on [Render.com](https://render.com)
2. Click "New" → "Web Service"
3. Connect your GitHub repository
4. Set build command: `npm install && npm run build`
5. Set start command: `npm start`
6. Add environment variables
7. Deploy!

## Architecture

```
telegram-bot/
├── src/
│   ├── index.ts           # Main bot entry point
│   ├── config.ts          # Configuration
│   ├── api/
│   │   └── backend.ts     # Backend API client
│   ├── handlers/
│   │   ├── menu.ts        # Menu command handler
│   │   ├── photo.ts       # Photo upload handler
│   │   ├── status.ts      # Status command handler
│   │   └── commands.ts    # Start/Help commands
│   ├── services/
│   │   └── ocr.ts         # OCR processing (TODO)
│   └── utils/
│       └── formatters.ts  # Date/number formatters
├── package.json
├── tsconfig.json
└── README.md
```

## Implementation Status

- [x] ✅ Implement OCR with Tesseract.js
- [x] ✅ Add image preprocessing with Sharp
- [x] ✅ Implement callback query handlers
- [x] ✅ Add estimation algorithm
- [x] ✅ Cloudinary photo storage
- [x] ✅ EXIF timestamp extraction
- [x] ✅ Confidence scoring
- [x] ✅ Manual entry fallback
- [ ] 📅 Full report generation (Future)
- [ ] 📅 Push notifications (Future)
- [ ] 📅 Deploy to production (Ready when you are!)

## Security

- Bot only responds to authorized Telegram user IDs
- API key authentication with backend
- No data stored locally (all in backend database)

## Troubleshooting

### Bot doesn't respond

1. Check `TELEGRAM_BOT_TOKEN` is correct
2. Check your Telegram ID is in `ALLOWED_TELEGRAM_IDS`
3. Check bot is running: `npm run dev`

### OCR not working

1. Ensure photos are clear and well-lit
2. Check Tesseract.js is installed
3. Check confidence threshold in config

### Backend connection fails

1. Check `BACKEND_API_URL` is correct
2. Check `BACKEND_API_KEY` is valid
3. Ensure backend API routes exist

## Support

For issues or questions, contact your system administrator.
