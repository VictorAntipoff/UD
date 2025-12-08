# UD System Telegram Bot Setup Guide

This guide will help you set up the UD System Telegram Bot for monitoring drying processes.

## What's Been Done

✅ Database schema updated with image fields
✅ Backend API routes created (`/api/telegram/*`)
✅ Telegram bot service structure created
✅ Menu command implemented
✅ Status command implemented
✅ Photo upload handler created
✅ Completion estimation algorithm implemented

## Next Steps (Quick Setup - 30 minutes)

### 1. Create Your Telegram Bot (5 minutes)

1. Open Telegram and search for **@BotFather**
2. Send `/newbot` command
3. Choose a name: `UD System` (or any name you want)
4. Choose a username: `ud_system_bot` (must end with 'bot')
5. Copy the **bot token** (looks like: `6789012345:AAH3Xj-abc123def456ghi789jkl012mno`)

### 2. Get Your Telegram ID (2 minutes)

1. Search for **@userinfobot** on Telegram
2. Start a chat with it
3. It will reply with your user ID (e.g., `123456789`)
4. Copy this number

### 3. Install Bot Dependencies (5 minutes)

```bash
cd /Users/victor/Development/UD/telegram-bot
npm install
```

### 4. Configure Bot Environment (5 minutes)

Create `.env` file in `telegram-bot/` folder:

```bash
cp .env.example .env
```

Edit `.env` with your values:

```env
# Telegram Bot Configuration
TELEGRAM_BOT_TOKEN=6789012345:AAH3Xj-abc123def456ghi789jkl012mno
ALLOWED_TELEGRAM_IDS=123456789

# Backend API Configuration
BACKEND_API_URL=http://localhost:3010/api
BACKEND_API_KEY=your_api_key_here  # Optional for now

# Cloudinary Configuration (from your existing .env)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# OCR Configuration
OCR_CONFIDENCE_THRESHOLD=70

# Environment
NODE_ENV=development
```

### 5. Apply Database Migration (3 minutes)

The schema has been updated. You need to apply the migration:

**Option A: Using Prisma Studio (Recommended)**
```bash
cd backend
npx prisma db push
```

**Option B: Create Migration**
```bash
cd backend
npx prisma migrate dev --name add_telegram_bot_fields
```

### 6. Start Backend Server (if not running)

```bash
cd backend
npm run dev
```

### 7. Start Telegram Bot (5 minutes)

Open a new terminal:

```bash
cd telegram-bot
npm run dev
```

You should see:
```
✅ Configuration loaded
📱 Bot will respond to 1 authorized user(s)
🤖 Telegram bot started successfully!
📱 Bot username: @ud_drying_bot
🔐 Authorized users: 123456789
```

### 8. Test the Bot! (5 minutes)

1. Open Telegram
2. Search for your bot username (e.g., `@ud_drying_bot`)
3. Send `/start` to the bot
4. Try these commands:
   - Send `Menu` - Should show all active drying processes
   - Send `/help` - Should show help message
   - Send a photo - Bot should ask what type of meter

## Usage Examples

### View All Active Processes
```
Send: Menu
```

Bot replies:
```
🔥 Active Drying Processes

1️⃣ UD-DRY-00012 - Teak 2"
   💧 Current: 15.5% → Target: 12%
   ⏱️ Est. Completion: 1.5 days (Jan 8)

📊 Total Active: 1 batch
```

### Get Detailed Status
```
Send: /status UD-DRY-00012
```

Bot replies with detailed info including:
- Current humidity
- Estimated completion time
- Drying rate
- Recent readings
- Electricity usage

### Upload Photos with OCR
1. Take photo of meter (ensure good lighting and focus)
2. Send photo to bot
3. Bot asks: Luku or Humidity meter?
4. Bot processes with OCR (10-20 seconds)
5. Bot shows extracted value and confidence score
6. Confirm, edit, or cancel the reading
7. Select which batch to save to
8. Reading saved with photo URL!

**Example OCR Response:**
```
✅ OCR Complete!

💧 Humidity Reading: 15.5%
📊 Confidence: ✅ Excellent (95.3%)
📅 Timestamp: Jan 6, 2025 14:30

✓ Reading looks good!

Is this reading correct?
[✅ Yes, Continue] [✏️ Edit Value] [❌ Cancel]
```

## Troubleshooting

### Bot doesn't respond
- Check `TELEGRAM_BOT_TOKEN` is correct
- Check your Telegram ID is in `ALLOWED_TELEGRAM_IDS`
- Check bot is running: `npm run dev`

### "Batch not found" error
- Make sure you have active drying processes
- Check batch number spelling
- Try using `/status UD-DRY-00012` (exact batch number)

### Backend connection fails
- Make sure backend is running on port 3010
- Check `BACKEND_API_URL` in `.env`
- Check backend logs for errors

### Database errors
- Run `npx prisma generate` in backend folder
- Run `npx prisma db push` to apply schema changes

### OCR not working / low accuracy
- Check photo quality (see OCR Tips section)
- Verify Tesseract.js is installed: `npm list tesseract.js`
- Check Sharp is installed: `npm list sharp`
- Lower `OCR_CONFIDENCE_THRESHOLD` in `.env` (default: 70)
- Use manual entry as fallback
- Check bot logs for OCR errors

### Photos not uploading
- Verify Cloudinary credentials in `.env`
- Check `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
- Test Cloudinary connection: Visit cloudinary.com dashboard

## Features Status

### ✅ Fully Implemented
- **Menu command** - Shows all active processes with estimates
- **Status command** - Detailed batch information
- **Completion time estimation** - AI-powered drying rate calculation
- **Photo upload with OCR** - Automatic meter reading extraction
- **Image preprocessing** - Grayscale, contrast enhancement, sharpening
- **OCR with Tesseract.js** - Extracts values from Luku and humidity meters
- **Timestamp extraction** - From EXIF data or OCR text
- **Confidence scoring** - OCR accuracy validation
- **Manual entry fallback** - Enter readings manually if OCR fails
- **Cloudinary integration** - Photo storage and management
- **Callback button handlers** - Interactive bot responses

### 📅 Future Enhancements
- Report generation via bot (PDF/Excel)
- Push notifications when drying completes
- Historical data export
- Multi-language support (Swahili/English)
- Photo quality validation before OCR
- Batch operations (multiple readings at once)

## Production Deployment

When ready to deploy to production:

### Railway.app (Free Tier)
1. Create account on [Railway.app](https://railway.app)
2. Click "New Project" → "Deploy from GitHub"
3. Select `telegram-bot` folder
4. Add environment variables from `.env`
5. Deploy!

### Cost: $0/month on free tier

## File Structure

```
UD/
├── telegram-bot/              # NEW - Telegram bot service
│   ├── src/
│   │   ├── index.ts           # Main bot
│   │   ├── config.ts          # Configuration
│   │   ├── api/
│   │   │   └── backend.ts     # Backend API client
│   │   ├── handlers/
│   │   │   ├── menu.ts        # Menu command
│   │   │   ├── status.ts      # Status command
│   │   │   ├── photo.ts       # Photo handler
│   │   │   └── commands.ts    # Start/Help
│   │   └── utils/
│   │       └── formatters.ts  # Date/number formatters
│   ├── package.json
│   └── .env
│
├── backend/
│   ├── prisma/
│   │   └── schema.prisma      # UPDATED - Added image fields
│   └── src/
│       ├── routes/
│       │   └── telegram.ts    # NEW - Telegram API routes
│       └── index.ts           # UPDATED - Registered telegram routes
│
└── TELEGRAM_BOT_SETUP.md      # This file
```

## API Endpoints Created

- `GET /api/telegram/menu` - All active processes
- `GET /api/telegram/batches/active` - Batch list for selection
- `GET /api/telegram/batch/:id/status` - Detailed status
- `GET /api/telegram/batch/:id/estimate` - Completion estimate
- `POST /api/telegram/reading` - Create reading from bot

## Database Changes

Added to `DryingReading` model:
- `lukuMeterImageUrl` - Luku meter photo URL
- `humidityMeterImageUrl` - Humidity meter photo URL
- `photoTimestamp` - Timestamp from photo EXIF
- `ocrConfidence` - OCR accuracy score
- `source` - "MANUAL", "TELEGRAM_BOT", or "WEB"

## Support

Need help? Check:
1. Bot logs in terminal
2. Backend logs for API errors
3. This README for common issues

## OCR Tips for Best Results

To get the most accurate readings from OCR:

### 📸 Photography Tips
- **Good Lighting**: Natural light or bright room lighting (avoid shadows)
- **Steady Camera**: Keep phone steady or rest on surface
- **Clear Focus**: Ensure meter display is sharp and in focus
- **No Glare**: Avoid reflections from glass or plastic covers
- **Fill Frame**: Get close enough so display fills most of photo
- **Straight Angle**: Take photo perpendicular to display (not at angle)

### 🔋 Luku Meter (kWh)
- Focus on the numeric display showing kWh reading
- Capture all digits clearly (e.g., 1234.5)
- Avoid capturing extra text labels if possible

### 💧 Humidity Meter
- Capture both the percentage AND timestamp if shown on display
- Ensure % symbol is visible (helps OCR identify humidity value)
- For digital displays, ensure all segments are clearly visible

### ⚠️ If OCR Fails
- Retake photo with better lighting/focus
- Use "Enter Manually" option to type reading
- Bot will still save photo for your records

---

**Status**: ✅ Fully functional with OCR, ready for production!
**Last Updated**: January 6, 2025
