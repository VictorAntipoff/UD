import { Context } from 'telegraf';
import { backendAPI } from '../api/backend';

// Store user state for text-based reading entry
interface UserReadingState {
  batchId?: string;
  batchNumber?: string;
  lukuValue?: number;
  humidityValue?: number;
  timestamp?: Date;
  waitingForLuku?: boolean;
  waitingForHumidity?: boolean;
  waitingForTimestamp?: boolean;
}

const userReadingState: { [userId: number]: UserReadingState } = {};

/**
 * Handler for "Add Reading" menu button
 * Shows list of active batches
 */
export async function addReadingHandler(ctx: any) {
  try {
    await ctx.answerCbQuery();

    const loadingMsg = await ctx.reply('Loading active batches...');

    // Get list of active batches
    const batches = await backendAPI.getActiveBatches();

    await ctx.telegram.deleteMessage(ctx.chat.id, loadingMsg.message_id);

    if (!batches || batches.length === 0) {
      await ctx.reply('[ERROR] No active batches found. Please create a drying process first.');
      return;
    }

    // Create batch selection keyboard
    const keyboard = {
      inline_keyboard: batches.map((batch: any) => [{
        text: `${batch.batchNumber} - ${batch.woodType}`,
        callback_data: `add_reading_batch_${batch.id}`
      }])
    };

    await ctx.reply(
      '📊 Select batch for new reading:',
      { parse_mode: 'HTML',
      reply_markup: keyboard }
    );

  } catch (error) {
    console.error('Error in add reading handler:', error);
    await ctx.reply('[ERROR] Error loading batches. Please try again.');
  }
}

/**
 * Handler for batch selection in add reading flow
 */
export async function handleReadingBatchSelection(ctx: any, batchId: string) {
  try {
    await ctx.answerCbQuery();
    await ctx.editMessageReplyMarkup({ inline_keyboard: [] });

    const userId = ctx.from?.id;
    if (!userId) return;

    // Get batch details for confirmation
    const batches = await backendAPI.getActiveBatches();
    const selectedBatch = batches.find((b: any) => b.id === batchId);

    if (!selectedBatch) {
      await ctx.reply('[ERROR] Batch not found. Please try again.');
      return;
    }

    // Initialize user state
    userReadingState[userId] = {
      batchId: batchId,
      batchNumber: selectedBatch.batchNumber,
      waitingForLuku: true
    };

    await ctx.reply(
      `📊 Adding reading for: ${selectedBatch.batchNumber}\n\n` +
      `⚡ Enter Electricity reading (kWh):\n\n` +
      `Example: 1174.66`,
      { parse_mode: 'HTML',
      reply_markup: { force_reply: true } }
    );

  } catch (error) {
    console.error('Error handling batch selection:', error);
    await ctx.reply('[ERROR] Error selecting batch. Please try again.');
  }
}

/**
 * Handler for text input in add reading flow
 */
export async function handleReadingTextInput(ctx: any, text: string) {
  try {
    const userId = ctx.from?.id;
    if (!userId) return;

    const state = userReadingState[userId];
    if (!state) {
      return; // Not in a reading flow
    }

    // Handle Luku input
    if (state.waitingForLuku) {
      const value = parseFloat(text.replace(',', '.'));

      if (isNaN(value)) {
        await ctx.reply('[ERROR] Invalid number. Please enter a valid reading (e.g., 1174.66)');
        return;
      }

      if (value < 0 || value > 999999) {
        await ctx.reply('[ERROR] Invalid kWh reading. Must be between 0-999999');
        return;
      }

      state.lukuValue = value;
      state.waitingForLuku = false;
      state.waitingForHumidity = true;

      await ctx.reply(
        `✅ Electricity: ${value} kWh\n\n` +
        `💧 Enter Humidity reading (%):\n\n` +
        `Example: 30.9`,
        { parse_mode: 'HTML',
      reply_markup: { force_reply: true } }
      );
      return;
    }

    // Handle Humidity input
    if (state.waitingForHumidity) {
      const value = parseFloat(text.replace(',', '.'));

      if (isNaN(value)) {
        await ctx.reply('[ERROR] Invalid number. Please enter a valid reading (e.g., 30.9)');
        return;
      }

      if (value < 0 || value > 100) {
        await ctx.reply('[ERROR] Humidity must be between 0-100%');
        return;
      }

      state.humidityValue = value;
      state.waitingForHumidity = false;
      state.waitingForTimestamp = true;

      await ctx.reply(
        `✅ Humidity: ${value}%\n\n` +
        `📅 Enter Date and Time:\n\n` +
        `Format: MM/DD/YYYY HH:MM\n` +
        `Example: 12/09/2025 16:02`,
        { parse_mode: 'HTML',
      reply_markup: { force_reply: true } }
      );
      return;
    }

    // Handle Timestamp input
    if (state.waitingForTimestamp) {
      // Try to parse the date
      const dateMatch = text.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})/);
      if (!dateMatch) {
        await ctx.reply(
          '[ERROR] Invalid date format. Please use: MM/DD/YYYY HH:MM\n\n' +
          'Example: 12/09/2025 16:02'
        );
        return;
      }

      const [, month, day, year, hour, minute] = dateMatch;
      const timestamp = new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T${hour.padStart(2, '0')}:${minute}:00`);

      if (isNaN(timestamp.getTime())) {
        await ctx.reply('[ERROR] Invalid date. Please try again.');
        return;
      }

      state.timestamp = timestamp;
      state.waitingForTimestamp = false;

      // Show confirmation
      await showReadingConfirmation(ctx, userId, state);
      return;
    }

  } catch (error) {
    console.error('Error handling reading text input:', error);
    await ctx.reply('[ERROR] Error processing input. Please try again.');
  }
}

/**
 * Show confirmation message with all entered values
 */
async function showReadingConfirmation(ctx: any, userId: number, state: UserReadingState) {
  const timestampText = state.timestamp
    ? state.timestamp.toLocaleString('en-US', {
        timeZone: 'Africa/Dar_es_Salaam',
        dateStyle: 'medium',
        timeStyle: 'short'
      })
    : 'Not provided';

  const confirmationMessage =
    `📊 Confirm Reading\n\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `Batch: ${state.batchNumber}\n` +
    `⚡ Electricity: ${state.lukuValue} kWh\n` +
    `💧 Humidity: ${state.humidityValue}%\n` +
    `📅 Date/Time: ${timestampText}\n` +
    `━━━━━━━━━━━━━━━━━━━━\n\n` +
    `Is this correct?`;

  await ctx.reply(confirmationMessage, {
    parse_mode: 'HTML',
      reply_markup: {
      inline_keyboard: [
        [
          { text: '✅ Save', callback_data: `save_reading_${userId}` }
        ],
        [
          { text: '❌ Cancel', callback_data: `cancel_new_reading_${userId}` }
        ]
      ]
    }
  });
}

/**
 * Handler for saving the reading
 */
export async function handleSaveReading(ctx: any, userId: number) {
  try {
    await ctx.answerCbQuery();
    await ctx.editMessageReplyMarkup({ inline_keyboard: [] });

    const state = userReadingState[userId];
    if (!state || !state.batchId || !state.lukuValue || !state.humidityValue) {
      await ctx.reply('[ERROR] Session expired. Please start again by clicking "Add Reading".');
      return;
    }

    await ctx.reply('💾 Saving reading...');

    // Prepare reading data
    const readingData: any = {
      batchId: state.batchId,
      electricityMeter: state.lukuValue,
      humidity: state.humidityValue
    };

    if (state.timestamp) {
      readingData.photoTimestamp = state.timestamp.toISOString();
    }

    readingData.notes = 'Manual entry from Telegram bot';

    // Save to backend
    try {
      await backendAPI.createReading(readingData);

      const timestampText = state.timestamp
        ? state.timestamp.toLocaleString('en-US', { timeZone: 'Africa/Dar_es_Salaam' })
        : 'Current time';

      await ctx.reply(
        `✅ Reading saved successfully!\n\n` +
        `Batch: ${state.batchNumber}\n` +
        `⚡ Electricity: ${state.lukuValue} kWh\n` +
        `💧 Humidity: ${state.humidityValue}%\n` +
        `📅 Time: ${timestampText}\n\n` +
        `Type /menu to add more readings or view processes.`
      );

      // Clean up state
      delete userReadingState[userId];

    } catch (error: any) {
      console.error('Error saving reading:', error);
      await ctx.reply(`[ERROR] Failed to save reading: ${error.message || 'Unknown error'}`);
    }

  } catch (error) {
    console.error('Error handling save reading:', error);
    await ctx.reply('[ERROR] Error saving reading. Please try again.');
  }
}

/**
 * Handler for cancelling the reading entry
 */
export async function handleCancelNewReading(ctx: any, userId: number) {
  try {
    await ctx.answerCbQuery();
    await ctx.editMessageReplyMarkup({ inline_keyboard: [] });

    delete userReadingState[userId];

    await ctx.reply('❌ Reading cancelled. Type /menu to start again.');

  } catch (error) {
    console.error('Error handling cancel:', error);
  }
}

// Export state for external access if needed
export { userReadingState };
