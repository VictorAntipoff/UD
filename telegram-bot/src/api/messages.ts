import axios from 'axios';
import { CONFIG } from '../config';

interface TelegramMessage {
  id: string;
  key: string;
  name: string;
  content: string;
  description?: string;
  category: string;
  isActive: boolean;
}

interface TelegramSetting {
  id: string;
  key: string;
  value: string;
  type: string;
  name: string;
  description?: string;
  category: string;
  isEditable: boolean;
}

interface MessagesResponse {
  [category: string]: TelegramMessage[];
}

interface SettingsResponse {
  [category: string]: TelegramSetting[];
}

// Cache for messages and settings
let messagesCache: Record<string, TelegramMessage> | null = null;
let settingsCache: Record<string, TelegramSetting> | null = null;
let lastFetch = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Fetch all Telegram messages from the backend API
 */
export async function fetchTelegramMessages(): Promise<Record<string, TelegramMessage>> {
  try {
    // Return cache if still valid
    if (messagesCache && (Date.now() - lastFetch < CACHE_TTL)) {
      return messagesCache;
    }

    const response = await axios.get<MessagesResponse>(
      `${CONFIG.BACKEND_API_URL}/telegram-admin/messages`,
      { timeout: 5000 }
    );

    // Flatten the categorized messages into a key-value map
    const messageMap: Record<string, TelegramMessage> = {};
    Object.values(response.data).forEach(categoryMessages => {
      categoryMessages.forEach(msg => {
        if (msg.isActive) {
          messageMap[msg.key] = msg;
        }
      });
    });

    messagesCache = messageMap;
    lastFetch = Date.now();

    console.log(`✅ Loaded ${Object.keys(messageMap).length} active Telegram messages from database`);
    return messageMap;
  } catch (error) {
    console.error('❌ Error fetching Telegram messages from database:', error);
    // Return cache if available, otherwise empty object
    return messagesCache || {};
  }
}

/**
 * Fetch all Telegram settings from the backend API
 */
export async function fetchTelegramSettings(): Promise<Record<string, TelegramSetting>> {
  try {
    // Return cache if still valid
    if (settingsCache && (Date.now() - lastFetch < CACHE_TTL)) {
      return settingsCache;
    }

    const response = await axios.get<SettingsResponse>(
      `${CONFIG.BACKEND_API_URL}/telegram-admin/settings`,
      { timeout: 5000 }
    );

    // Flatten the categorized settings into a key-value map
    const settingsMap: Record<string, TelegramSetting> = {};
    Object.values(response.data).forEach(categorySettings => {
      categorySettings.forEach(setting => {
        settingsMap[setting.key] = setting;
      });
    });

    settingsCache = settingsMap;
    lastFetch = Date.now();

    console.log(`✅ Loaded ${Object.keys(settingsMap).length} Telegram settings from database`);
    return settingsMap;
  } catch (error) {
    console.error('❌ Error fetching Telegram settings from database:', error);
    // Return cache if available, otherwise empty object
    return settingsCache || {};
  }
}

/**
 * Get a specific message by key, with fallback to default
 */
export async function getMessage(key: string, fallback: string = ''): Promise<string> {
  const messages = await fetchTelegramMessages();
  return messages[key]?.content || fallback;
}

/**
 * Get a specific setting value by key, with fallback to default
 */
export async function getSetting(key: string, fallback: string = ''): Promise<string> {
  const settings = await fetchTelegramSettings();
  return settings[key]?.value || fallback;
}

/**
 * Clear the cache to force a fresh fetch
 */
export function clearCache() {
  messagesCache = null;
  settingsCache = null;
  lastFetch = 0;
  console.log('🔄 Telegram messages and settings cache cleared');
}

/**
 * Preload messages and settings on bot startup
 */
export async function preloadData() {
  console.log('📥 Preloading Telegram messages and settings...');
  try {
    await Promise.all([
      fetchTelegramMessages(),
      fetchTelegramSettings()
    ]);
    console.log('✅ Preload complete');
  } catch (error) {
    console.error('⚠️  Warning: Failed to preload data from database, will use fallback messages');
    console.error('Error details:', error);
    // Don't throw - bot should still work with fallback messages
  }
}
