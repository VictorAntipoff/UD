import { config } from 'dotenv';

config();

export const CONFIG = {
  // Telegram
  TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN || '',
  ALLOWED_TELEGRAM_IDS: process.env.ALLOWED_TELEGRAM_IDS?.split(',').map(id => parseInt(id.trim())) || [],

  // Backend API
  BACKEND_API_URL: process.env.BACKEND_API_URL || 'http://localhost:3010/api',
  BACKEND_API_KEY: process.env.BACKEND_API_KEY || '',

  // Cloudinary
  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME || '',
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY || '',
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET || '',

  // OCR
  OCR_CONFIDENCE_THRESHOLD: parseInt(process.env.OCR_CONFIDENCE_THRESHOLD || '70'),

  // Environment
  NODE_ENV: process.env.NODE_ENV || 'development',
  IS_PRODUCTION: process.env.NODE_ENV === 'production',
};

// Validate required config
if (!CONFIG.TELEGRAM_BOT_TOKEN) {
  throw new Error('TELEGRAM_BOT_TOKEN is required');
}

if (CONFIG.ALLOWED_TELEGRAM_IDS.length === 0) {
  console.warn('⚠️  No ALLOWED_TELEGRAM_IDS configured. Bot will be open to everyone!');
}

console.log('✅ Configuration loaded');
console.log(`📱 Bot will respond to ${CONFIG.ALLOWED_TELEGRAM_IDS.length} authorized user(s)`);
