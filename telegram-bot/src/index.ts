import { Telegraf, Context } from 'telegraf';
import { message } from 'telegraf/filters';
import { CONFIG } from './config';
import {
  menuHandler,
  processesMenuHandler,
  showAllProcessesHandler,
  showSummaryHandler
} from './handlers/menu';
import {
  photoHandler,
  handleMeterTypeSelection,
  handleBothReadingsConfirmation,
  handleEditLuku,
  handleEditHumidity,
  handleReadingCancel,
  handleBatchSelection,
  handleManualTextInput,
  handleManualEntry
} from './handlers/photo';
import { statusHandler } from './handlers/status';
import { startHandler, helpHandler } from './handlers/commands';

// Create bot instance
const bot = new Telegraf(CONFIG.TELEGRAM_BOT_TOKEN);

// Middleware: Authentication
bot.use(async (ctx, next) => {
  const userId = ctx.from?.id;

  if (!userId) {
    return;
  }

  // Check if user is authorized
  if (CONFIG.ALLOWED_TELEGRAM_IDS.length > 0 && !CONFIG.ALLOWED_TELEGRAM_IDS.includes(userId)) {
    await ctx.reply('⛔ Unauthorized. This bot is private.');
    return;
  }

  return next();
});

// Middleware: Error handling
bot.catch((err, ctx) => {
  console.error(`Error for ${ctx.updateType}:`, err);
  ctx.reply('❌ An error occurred. Please try again.');
});

// Command handlers
bot.command('start', startHandler);
bot.command('help', helpHandler);
bot.command('menu', menuHandler);
bot.command('list', menuHandler); // Alias for menu
bot.command('status', statusHandler);

// Callback query handlers (for inline buttons)
bot.on('callback_query', async (ctx) => {
  try {
    const data = ctx.callbackQuery && 'data' in ctx.callbackQuery ? ctx.callbackQuery.data : '';

    if (!data) return;

    // Main menu handlers
    if (data === 'menu_processes') {
      return processesMenuHandler(ctx);
    }

    if (data === 'menu_summary') {
      return showSummaryHandler(ctx);
    }

    if (data === 'menu_add_reading') {
      await ctx.answerCbQuery();
      return ctx.reply('📸 Please send a photo of the meter reading to add a new reading.');
    }

    if (data === 'menu_search') {
      await ctx.answerCbQuery();
      return ctx.reply('🔍 Please enter the batch number you want to search for:');
    }

    if (data === 'filter_all') {
      return showAllProcessesHandler(ctx);
    }

    if (data === 'back_to_menu') {
      await ctx.answerCbQuery();
      await ctx.editMessageReplyMarkup({ inline_keyboard: [] });
      return menuHandler(ctx);
    }

    // Meter type selection: meter_type_luku_USERID or meter_type_humidity_USERID
    if (data.startsWith('meter_type_')) {
      const parts = data.split('_');
      const meterType = parts[2] as 'luku' | 'humidity';
      const userId = parseInt(parts[3]);
      return handleMeterTypeSelection(ctx, meterType, userId);
    }

    // Confirm both readings: confirm_both_USERID
    if (data.startsWith('confirm_both_')) {
      const userId = parseInt(data.split('_')[2]);
      return handleBothReadingsConfirmation(ctx, userId);
    }

    // Edit Luku: edit_luku_USERID
    if (data.startsWith('edit_luku_')) {
      const userId = parseInt(data.split('_')[2]);
      return handleEditLuku(ctx, userId);
    }

    // Edit Humidity: edit_humidity_USERID
    if (data.startsWith('edit_humidity_')) {
      const userId = parseInt(data.split('_')[2]);
      return handleEditHumidity(ctx, userId);
    }

    // Reading cancel: cancel_reading_USERID
    if (data.startsWith('cancel_reading_')) {
      const userId = parseInt(data.split('_')[2]);
      return handleReadingCancel(ctx, userId);
    }

    // Batch selection: select_batch_BATCHID_USERID
    if (data.startsWith('select_batch_')) {
      const parts = data.split('_');
      const batchId = parts[2];
      const userId = parseInt(parts[3]);
      return handleBatchSelection(ctx, batchId, userId);
    }

    // Manual entry: manual_entry_luku_USERID or manual_entry_humidity_USERID or manual_entry_both_USERID
    if (data.startsWith('manual_entry_')) {
      const parts = data.split('_');
      const meterType = parts[2]; // luku, humidity, or both
      const userId = parseInt(parts[3]);
      return handleManualEntry(ctx, meterType, userId);
    }

    // Unknown callback
    await ctx.answerCbQuery('❌ Unknown action');

  } catch (error) {
    console.error('Error handling callback query:', error);
    await ctx.answerCbQuery('❌ Error processing action');
  }
});

// Text message handler (for "Menu" keyword and manual input)
bot.on(message('text'), async (ctx) => {
  const text = ctx.message.text.toLowerCase().trim();

  // Check for Menu command
  if (text === 'menu') {
    return menuHandler(ctx);
  }

  // Check if user is in a manual input flow
  // If text is a number, it might be a manual reading entry
  if (/^\d+([.,]\d+)?$/.test(text)) {
    return handleManualTextInput(ctx, text);
  }
});

// Photo handler
bot.on(message('photo'), photoHandler);

// Launch bot
bot.launch({
  dropPendingUpdates: true, // Ignore messages sent while bot was offline
}).then(() => {
  console.log('🤖 Telegram bot started successfully!');
  console.log(`📱 Bot username: @${bot.botInfo?.username || 'unknown'}`);
  console.log(`🔐 Authorized users: ${CONFIG.ALLOWED_TELEGRAM_IDS.join(', ')}`);
});

// Enable graceful stop
process.once('SIGINT', () => {
  console.log('Received SIGINT, stopping bot...');
  bot.stop('SIGINT');
});

process.once('SIGTERM', () => {
  console.log('Received SIGTERM, stopping bot...');
  bot.stop('SIGTERM');
});

// Handle uncaught errors
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});
