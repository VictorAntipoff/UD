import { Context } from 'telegraf';
import { message } from 'telegraf/filters';
import { backendAPI } from '../api/backend';
import { processLukuMeter, processHumidityMeter, formatConfidence, isConfidenceAcceptable } from '../services/ocr';
import { v2 as cloudinary } from 'cloudinary';
import { CONFIG } from '../config';

// Configure Cloudinary
cloudinary.config({
  cloud_name: CONFIG.CLOUDINARY_CLOUD_NAME,
  api_key: CONFIG.CLOUDINARY_API_KEY,
  api_secret: CONFIG.CLOUDINARY_API_SECRET
});

// Store user state for photo upload flow
interface UserPhotoState {
  lukuPhotoFileId?: string;
  humidityPhotoFileId?: string;
  lukuBuffer?: Buffer;
  humidityBuffer?: Buffer;
  lukuUrl?: string;
  humidityUrl?: string;
  lukuValue?: number;
  humidityValue?: number;
  timestamp?: Date;
  ocrConfidence?: number;
  rawOcrText?: string;
  waitingForSecondPhoto?: boolean;
  firstMeterType?: 'luku' | 'humidity'; // Track which meter was processed first
  waitingForManualLuku?: boolean;
  waitingForManualHumidity?: boolean;
  waitingForManualTimestamp?: boolean;
}

const userState: { [userId: number]: UserPhotoState } = {};

export async function photoHandler(ctx: Context) {
  try {
    if (!ctx.from) return;

    const userId = ctx.from.id;

    // Get the highest resolution photo
    const photo = ctx.message && 'photo' in ctx.message
      ? ctx.message.photo[ctx.message.photo.length - 1]
      : null;

    if (!photo) {
      await ctx.reply('[ERROR] No photo found in message.');
      return;
    }

    // Check if this is the first or second photo
    const state = userState[userId] || {};

    if (!state.waitingForSecondPhoto) {
      // First photo - ask user what type
      userState[userId] = { lukuPhotoFileId: photo.file_id };

      await ctx.reply('📸 Photo received! What meter is this?', {
        reply_markup: {
          inline_keyboard: [
            [
              { text: '⚡ Electricity (kWh)', callback_data: `meter_type_luku_${userId}` },
              { text: '💧 Humidity (%)', callback_data: `meter_type_humidity_${userId}` }
            ]
          ]
        }
      });
      return;
    }

    // waitingForSecondPhoto means they selected meter type for first photo
    if (!state.lukuValue && !state.humidityValue) {
      // Still waiting for first photo to be processed via callback
      return;
    }

    if (state.waitingForSecondPhoto) {
      // Second photo received
      await ctx.reply('📸 Photo 2/2 received!\n\nProcessing...');

      // Download second photo
      const file = await ctx.telegram.getFile(photo.file_id);
      const fileUrl = `https://api.telegram.org/file/bot${CONFIG.TELEGRAM_BOT_TOKEN}/${file.file_path}`;
      const response = await fetch(fileUrl);
      const buffer = Buffer.from(await response.arrayBuffer());

      // Determine which meter to process based on what was first
      const secondMeterType = state.firstMeterType === 'luku' ? 'humidity' : 'luku';

      try {
        if (secondMeterType === 'luku') {
          // Process as Luku meter (humidity was first)
          const lukuResult = await processLukuMeter(buffer);
          const lukuUrl = await uploadToCloudinary(buffer, 'luku');

          state.lukuPhotoFileId = photo.file_id;
          state.lukuBuffer = buffer;
          state.lukuUrl = lukuUrl;
          state.lukuValue = lukuResult.value;
          state.waitingForSecondPhoto = false;

          // Show confirmation with both readings
          await showConfirmation(ctx, userId, state);

        } else {
          // Process as Humidity meter (luku was first)
          const humidityResult = await processHumidityMeter(buffer);
          const humidityUrl = await uploadToCloudinary(buffer, 'humidity');

          state.humidityPhotoFileId = photo.file_id;
          state.humidityBuffer = buffer;
          state.humidityUrl = humidityUrl;
          state.humidityValue = humidityResult.humidity;
          state.timestamp = humidityResult.timestamp;
          state.waitingForSecondPhoto = false;

          // Show confirmation with both readings
          await showConfirmation(ctx, userId, state);
        }

      } catch (error: any) {
        await ctx.reply(
          `❌ Failed to extract ${secondMeterType === 'luku' ? 'Electricity' : 'Humidity'} reading\n\n` +
          `Error: ${error.message}\n\n` +
          `Please send a clearer photo or enter manually.`,
          {
            reply_markup: {
              inline_keyboard: [
                [{ text: 'Enter Manually', callback_data: `manual_entry_${secondMeterType}_${userId}` }]
              ]
            }
          }
        );
      }

    } else {
      // Second photo - process humidity and show confirmation
      await ctx.reply('📸 Photo 2/2 received!\n\nProcessing Humidity meter...');

      // Download second photo
      const file = await ctx.telegram.getFile(photo.file_id);
      const fileUrl = `https://api.telegram.org/file/bot${CONFIG.TELEGRAM_BOT_TOKEN}/${file.file_path}`;
      const response = await fetch(fileUrl);
      const buffer = Buffer.from(await response.arrayBuffer());

      try {
        const humidityResult = await processHumidityMeter(buffer);
        const humidityUrl = await uploadToCloudinary(buffer, 'humidity');

        // Update state with humidity data
        state.humidityPhotoFileId = photo.file_id;
        state.humidityBuffer = buffer;
        state.humidityUrl = humidityUrl;
        state.humidityValue = humidityResult.humidity;
        state.timestamp = humidityResult.timestamp;
        state.waitingForSecondPhoto = false;

        // Show confirmation with all extracted data
        const timestampText = humidityResult.timestamp
          ? humidityResult.timestamp.toLocaleString('en-US', {
              timeZone: 'Africa/Dar_es_Salaam',
              dateStyle: 'medium',
              timeStyle: 'short'
            })
          : 'Not detected';

        const confirmationMessage =
          `📊 *Reading Extracted\\!*\n\n` +
          `━━━━━━━━━━━━━━━━━━━━\n` +
          `⚡ *Electricity:* ${state.lukuValue} kWh\n` +
          `💧 *Humidity:* ${humidityResult.humidity}%\n` +
          `📅 *Date/Time:* ${timestampText.replace(/[-.()]/g, '\\$&')}\n` +
          `━━━━━━━━━━━━━━━━━━━━\n\n` +
          `Is this information correct?`;

        await ctx.reply(confirmationMessage, {
          parse_mode: 'MarkdownV2',
          reply_markup: {
            inline_keyboard: [
              [
                { text: '✅ Confirm & Save', callback_data: `confirm_both_${userId}` }
              ],
              [
                { text: '✏️ Edit Electricity', callback_data: `edit_luku_${userId}` },
                { text: '✏️ Edit Humidity', callback_data: `edit_humidity_${userId}` }
              ],
              [
                { text: '❌ Cancel', callback_data: `cancel_reading_${userId}` }
              ]
            ]
          }
        });

      } catch (error: any) {
        await ctx.reply(
          `❌ Failed to process Humidity meter\n\n` +
          `Error: ${error.message}\n\n` +
          `Tips:\n` +
          `• Ensure good lighting\n` +
          `• Focus on the display clearly\n` +
          `• Capture date/time in the photo\n\n` +
          `You can try again or enter values manually.`,
          {
            reply_markup: {
              inline_keyboard: [
                [{ text: 'Try Again', callback_data: `retry_humidity_${userId}` }],
                [{ text: 'Enter Manually', callback_data: `manual_entry_both_${userId}` }]
              ]
            }
          }
        );
      }
    }

  } catch (error) {
    console.error('Error in photo handler:', error);
    await ctx.reply('[ERROR] Error processing photo. Please try again.');
  }
}

/**
 * Upload image buffer to Cloudinary
 */
async function uploadToCloudinary(buffer: Buffer, meterType: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: `ud-drying/${meterType}-meters`,
        resource_type: 'image',
        format: 'jpg'
      },
      (error, result) => {
        if (error) {
          reject(error);
        } else if (result) {
          resolve(result.secure_url);
        } else {
          reject(new Error('Upload failed - no result returned'));
        }
      }
    );

    uploadStream.end(buffer);
  });
}

/**
 * Handler for meter type selection
 */
export async function handleMeterTypeSelection(ctx: any, meterType: 'luku' | 'humidity', userId: number) {
  try {
    await ctx.answerCbQuery();
    await ctx.editMessageReplyMarkup({ inline_keyboard: [] });

    const state = userState[userId];
    if (!state || !state.lukuPhotoFileId) {
      await ctx.reply('[ERROR] Photo expired. Please send the photo again.');
      return;
    }

    const processingMsg = await ctx.reply(`Processing ${meterType === 'luku' ? 'Electricity' : 'Humidity'} meter...`);

    // Download photo
    const file = await ctx.telegram.getFile(state.lukuPhotoFileId);
    const fileUrl = `https://api.telegram.org/file/bot${CONFIG.TELEGRAM_BOT_TOKEN}/${file.file_path}`;
    const response = await fetch(fileUrl);
    const buffer = Buffer.from(await response.arrayBuffer());

    try {
      if (meterType === 'luku') {
        // Process as Luku meter
        const result = await processLukuMeter(buffer);
        const imageUrl = await uploadToCloudinary(buffer, 'luku');

        userState[userId] = {
          lukuPhotoFileId: state.lukuPhotoFileId,
          lukuBuffer: buffer,
          lukuUrl: imageUrl,
          lukuValue: result.value,
          ocrConfidence: result.confidence,
          rawOcrText: result.rawText,
          waitingForSecondPhoto: true,
          firstMeterType: 'luku' // Store that luku was first
        };

        await ctx.telegram.deleteMessage(ctx.chat.id, processingMsg.message_id);

        await ctx.reply(
          `✅ Electricity extracted: ${result.value} kWh\n\n` +
          `📸 Now send photo 2/2 (Humidity meter with date/time)`
        );

      } else {
        // Process as Humidity meter
        const result = await processHumidityMeter(buffer);
        const imageUrl = await uploadToCloudinary(buffer, 'humidity');

        userState[userId] = {
          humidityPhotoFileId: state.lukuPhotoFileId,
          humidityBuffer: buffer,
          humidityUrl: imageUrl,
          humidityValue: result.humidity,
          timestamp: result.timestamp,
          ocrConfidence: result.confidence,
          rawOcrText: result.rawText,
          waitingForSecondPhoto: true,
          firstMeterType: 'humidity' // Store that humidity was first
        };

        await ctx.telegram.deleteMessage(ctx.chat.id, processingMsg.message_id);

        await ctx.reply(
          `✅ Humidity extracted: ${result.humidity}%\n` +
          `📅 Date/Time: ${result.timestamp ? result.timestamp.toLocaleString('en-US', { timeZone: 'Africa/Dar_es_Salaam' }) : 'Not detected'}\n\n` +
          `📸 Now send photo 2/2 (Electricity meter)`
        );
      }

    } catch (error: any) {
      console.error('OCR Error:', error);
      await ctx.telegram.deleteMessage(ctx.chat.id, processingMsg.message_id);

      await ctx.reply(
        `❌ Failed to extract reading\n\n` +
        `Error: ${error.message}\n\n` +
        `Please send a clearer photo or enter manually.`,
        {
          reply_markup: {
            inline_keyboard: [
              [{ text: 'Enter Manually', callback_data: `manual_entry_${meterType}_${userId}` }]
            ]
          }
        }
      );
    }

  } catch (error) {
    console.error('Error handling meter type selection:', error);
    await ctx.reply('[ERROR] Error processing selection. Please try again.');
  }
}

/**
 * Handler for confirming both readings
 */
export async function handleBothReadingsConfirmation(ctx: any, userId: number) {
  try {
    await ctx.answerCbQuery();
    await ctx.editMessageReplyMarkup({ inline_keyboard: [] });

    const state = userState[userId];
    if (!state || !state.lukuValue || !state.humidityValue) {
      await ctx.reply('[ERROR] Session expired. Please upload photos again.');
      return;
    }

    // Get list of active batches
    const batches = await backendAPI.getActiveBatches();

    if (!batches || batches.length === 0) {
      await ctx.reply('[ERROR] No active batches found. Please create a drying process first.');
      delete userState[userId];
      return;
    }

    // Create batch selection keyboard
    const keyboard = {
      inline_keyboard: batches.map((batch: any) => [{
        text: `${batch.batchNumber} - ${batch.woodType}`,
        callback_data: `select_batch_${batch.id}_${userId}`
      }])
    };

    await ctx.reply(
      'Select which batch this reading is for:',
      { reply_markup: keyboard }
    );

  } catch (error) {
    console.error('Error handling confirmation:', error);
    await ctx.reply('[ERROR] Error confirming reading. Please try again.');
  }
}

/**
 * Handler for batch selection with both readings
 */
export async function handleBatchSelection(ctx: any, batchId: string, userId: number) {
  try {
    await ctx.answerCbQuery();
    await ctx.editMessageReplyMarkup({ inline_keyboard: [] });

    const state = userState[userId];
    if (!state) {
      await ctx.reply('[ERROR] Session expired. Please upload photos again.');
      return;
    }

    await ctx.reply('💾 Saving reading to database...');

    // Prepare reading data with both values
    const readingData: any = {
      batchId: batchId,
      electricityMeter: state.lukuValue,
      humidity: state.humidityValue,
      lukuMeterImageUrl: state.lukuUrl,
      humidityMeterImageUrl: state.humidityUrl
    };

    if (state.timestamp) {
      readingData.photoTimestamp = state.timestamp.toISOString();
    }

    if (state.ocrConfidence) {
      readingData.ocrConfidence = state.ocrConfidence;
    }

    readingData.notes = `OCR extracted from Telegram bot (both meters)\nRaw text: ${state.rawOcrText}`;

    // Save to backend
    try {
      const reading = await backendAPI.createReading(readingData);

      const timestampText = state.timestamp
        ? state.timestamp.toLocaleString('en-US', { timeZone: 'Africa/Dar_es_Salaam' })
        : 'Current time';

      await ctx.reply(
        `✅ *Reading saved successfully\\!*\n\n` +
        `⚡ *Electricity:* ${state.lukuValue} kWh\n` +
        `💧 *Humidity:* ${state.humidityValue}%\n` +
        `📅 *Time:* ${timestampText.replace(/[-.()]/g, '\\$&')}\n\n` +
        `Send more photos or type /menu to see all processes\\.`,
        { parse_mode: 'MarkdownV2' }
      );

      // Clean up state
      delete userState[userId];

    } catch (error: any) {
      console.error('Error saving reading:', error);
      await ctx.reply(`[ERROR] Failed to save reading: ${error.message || 'Unknown error'}`);
    }

  } catch (error) {
    console.error('Error handling batch selection:', error);
    await ctx.reply('[ERROR] Error selecting batch. Please try again.');
  }
}

/**
 * Handler for editing Luku value
 */
export async function handleEditLuku(ctx: any, userId: number) {
  try {
    await ctx.answerCbQuery();
    await ctx.editMessageReplyMarkup({ inline_keyboard: [] });

    await ctx.reply(
      'Please enter the correct Electricity reading (kWh):\n\n' +
      'Example: 1658.97'
    );

    // Mark that we're waiting for luku edit
    if (userState[userId]) {
      userState[userId].waitingForSecondPhoto = false;
      (userState[userId] as any).editingLuku = true;
    }

  } catch (error) {
    console.error('Error handling luku edit:', error);
  }
}

/**
 * Handler for editing Humidity value
 */
export async function handleEditHumidity(ctx: any, userId: number) {
  try {
    await ctx.answerCbQuery();
    await ctx.editMessageReplyMarkup({ inline_keyboard: [] });

    await ctx.reply(
      'Please enter the correct Humidity reading (%):\n\n' +
      'Example: 34.3'
    );

    // Mark that we're waiting for humidity edit
    if (userState[userId]) {
      userState[userId].waitingForSecondPhoto = false;
      (userState[userId] as any).editingHumidity = true;
    }

  } catch (error) {
    console.error('Error handling humidity edit:', error);
  }
}

/**
 * Handler for reading cancellation
 */
export async function handleReadingCancel(ctx: any, userId: number) {
  try {
    await ctx.answerCbQuery();
    await ctx.editMessageReplyMarkup({ inline_keyboard: [] });

    delete userState[userId];

    await ctx.reply('❌ Reading cancelled. Send new photos to try again.');

  } catch (error) {
    console.error('Error handling cancel:', error);
  }
}

/**
 * Handler for manual text input
 */
export async function handleManualTextInput(ctx: any, text: string) {
  try {
    const userId = ctx.from?.id;
    if (!userId) return;

    const state = userState[userId] as any;
    if (!state) {
      return; // Not in a reading flow
    }

    // Parse the input
    const value = parseFloat(text.replace(',', '.'));

    if (isNaN(value)) {
      await ctx.reply('[ERROR] Invalid number. Please enter a valid reading (e.g., 15.5)');
      return;
    }

    // Check if manual entry for Luku
    if (state.waitingForManualLuku) {
      if (value < 0 || value > 999999) {
        await ctx.reply('[ERROR] Invalid kWh reading. Must be between 0-999999');
        return;
      }
      state.lukuValue = value;
      delete state.waitingForManualLuku;
      await ctx.reply(`✅ Electricity: ${value} kWh\n\n📸 Now send photo 2/2 (Humidity meter)`);
      state.waitingForSecondPhoto = true;
      return;
    }

    // Check if manual entry for Humidity
    if (state.waitingForManualHumidity) {
      if (value < 0 || value > 100) {
        await ctx.reply('[ERROR] Humidity must be between 0-100%');
        return;
      }
      state.humidityValue = value;
      delete state.waitingForManualHumidity;

      // If we don't have a timestamp, ask for it
      if (!state.timestamp) {
        state.waitingForManualTimestamp = true;
        await ctx.reply('📅 Please enter the date and time from the meter:\n\nExample: 12/09/2025 16:02');
        return;
      }

      // Show confirmation
      await showConfirmation(ctx, userId, state);
      return;
    }

    // Check if manual timestamp entry
    if (state.waitingForManualTimestamp) {
      // Try to parse the date
      const dateMatch = text.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})/);
      if (!dateMatch) {
        await ctx.reply('[ERROR] Invalid date format. Please use: MM/DD/YYYY HH:MM\n\nExample: 12/09/2025 16:02');
        return;
      }

      const [, month, day, year, hour, minute] = dateMatch;
      const timestamp = new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T${hour.padStart(2, '0')}:${minute}:00`);

      if (isNaN(timestamp.getTime())) {
        await ctx.reply('[ERROR] Invalid date. Please try again.');
        return;
      }

      state.timestamp = timestamp;
      delete state.waitingForManualTimestamp;
      await ctx.reply(`✅ Date/Time: ${timestamp.toLocaleString('en-US', { timeZone: 'Africa/Dar_es_Salaam' })}`);

      // Show confirmation
      await showConfirmation(ctx, userId, state);
      return;
    }

    // Check what we're editing
    if (state.editingLuku) {
      if (value < 0 || value > 999999) {
        await ctx.reply('[ERROR] Invalid kWh reading. Must be between 0-999999');
        return;
      }
      state.lukuValue = value;
      delete state.editingLuku;
      await ctx.reply(`✅ Electricity updated to: ${value} kWh`);

      // Show confirmation again
      await showConfirmation(ctx, userId, state);

    } else if (state.editingHumidity) {
      if (value < 0 || value > 100) {
        await ctx.reply('[ERROR] Humidity must be between 0-100%');
        return;
      }
      state.humidityValue = value;
      delete state.editingHumidity;
      await ctx.reply(`✅ Humidity updated to: ${value}%`);

      // Show confirmation again
      await showConfirmation(ctx, userId, state);
    }

  } catch (error) {
    console.error('Error handling manual input:', error);
    await ctx.reply('[ERROR] Error processing input. Please try again.');
  }
}

/**
 * Show confirmation message with current values
 */
async function showConfirmation(ctx: any, userId: number, state: any) {
  const timestampText = state.timestamp
    ? state.timestamp.toLocaleString('en-US', {
        timeZone: 'Africa/Dar_es_Salaam',
        dateStyle: 'medium',
        timeStyle: 'short'
      })
    : 'Not detected';

  const confirmationMessage =
    `📊 *Reading Extracted\\!*\n\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `⚡ *Electricity:* ${state.lukuValue} kWh\n` +
    `💧 *Humidity:* ${state.humidityValue}%\n` +
    `📅 *Date/Time:* ${timestampText.replace(/[-.()]/g, '\\$&')}\n` +
    `━━━━━━━━━━━━━━━━━━━━\n\n` +
    `Is this information correct?`;

  await ctx.reply(confirmationMessage, {
    parse_mode: 'MarkdownV2',
    reply_markup: {
      inline_keyboard: [
        [
          { text: '✅ Confirm & Save', callback_data: `confirm_both_${userId}` }
        ],
        [
          { text: '✏️ Edit Electricity', callback_data: `edit_luku_${userId}` },
          { text: '✏️ Edit Humidity', callback_data: `edit_humidity_${userId}` }
        ],
        [
          { text: '❌ Cancel', callback_data: `cancel_reading_${userId}` }
        ]
      ]
    }
  });
}

/**
 * Handle manual entry button clicks
 */
export async function handleManualEntry(ctx: any, meterType: string, userId: number) {
  try {
    await ctx.answerCbQuery();
    await ctx.editMessageReplyMarkup({ inline_keyboard: [] });

    const state = userState[userId];
    if (!state) {
      await ctx.reply('Session expired. Please start over by sending photos.');
      return;
    }

    if (meterType === 'luku') {
      state.waitingForManualLuku = true;
      await ctx.reply(
        '⚡ Please enter the electricity reading (in kWh):\n\nExample: 1174.66',
        { reply_markup: { force_reply: true } }
      );
    } else if (meterType === 'humidity') {
      state.waitingForManualHumidity = true;
      await ctx.reply(
        '💧 Please enter the humidity percentage:\n\nExample: 30.9',
        { reply_markup: { force_reply: true } }
      );
    } else if (meterType === 'both') {
      // Both meters failed - ask for electricity first
      state.waitingForManualLuku = true;
      await ctx.reply(
        '⚡ Please enter the electricity reading (in kWh):\n\nExample: 1174.66',
        { reply_markup: { force_reply: true } }
      );
    }
  } catch (error) {
    console.error('Error handling manual entry:', error);
    await ctx.reply('[ERROR] Error setting up manual entry. Please try again.');
  }
}

// Export state for external access if needed
export { userState };
