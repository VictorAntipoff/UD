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
  photoFileId: string;
  photoBuffer?: Buffer;
  photoUrl?: string;
  meterType?: 'luku' | 'humidity';
  ocrValue?: number;
  ocrConfidence?: number;
  timestamp?: Date;
  rawOcrText?: string;
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

    // Store photo file ID for later
    userState[userId] = { photoFileId: photo.file_id };

    await ctx.reply('Photo received! What type of meter is this?', {
      reply_markup: {
        inline_keyboard: [
          [
            { text: 'Luku Meter (kWh)', callback_data: `meter_type_luku_${userId}` },
            { text: 'Humidity Meter (%)', callback_data: `meter_type_humidity_${userId}` }
          ]
        ]
      }
    });

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
 * Handler for meter type selection (called from button callback)
 */
export async function handleMeterTypeSelection(ctx: any, meterType: 'luku' | 'humidity', userId: number) {
  try {
    await ctx.answerCbQuery();
    await ctx.editMessageReplyMarkup({ inline_keyboard: [] }); // Remove buttons

    const processingMsg = await ctx.reply(`Processing ${meterType === 'luku' ? 'Luku' : 'Humidity'} meter photo...\nThis may take 10-20 seconds...`);

    // Get file ID from user state
    const state = userState[userId];
    if (!state || !state.photoFileId) {
      await ctx.reply('[ERROR] Photo not found. Please send the photo again.');
      return;
    }

    const fileId = state.photoFileId;

    // Download photo
    const file = await ctx.telegram.getFile(fileId);
    const fileUrl = `https://api.telegram.org/file/bot${CONFIG.TELEGRAM_BOT_TOKEN}/${file.file_path}`;

    // Download image buffer
    const response = await fetch(fileUrl);
    const buffer = Buffer.from(await response.arrayBuffer());

    // Store buffer in user state
    userState[userId].photoBuffer = buffer;
    userState[userId].meterType = meterType;

    try {
      // Process image with OCR
      if (meterType === 'luku') {
        // Process Luku meter
        const result = await processLukuMeter(buffer);

        userState[userId].ocrValue = result.value;
        userState[userId].ocrConfidence = result.confidence;
        userState[userId].rawOcrText = result.rawText;

        // Upload to Cloudinary
        const imageUrl = await uploadToCloudinary(buffer, 'luku');
        userState[userId].photoUrl = imageUrl;

        // Show results
        const confidenceText = formatConfidence(result.confidence);
        const isGoodReading = isConfidenceAcceptable(result.confidence);

        await ctx.telegram.deleteMessage(ctx.chat.id, processingMsg.message_id);

        await ctx.reply(
          `[SUCCESS] *OCR Complete\\!*\n\n` +
          `*Luku Meter Reading:* ${result.value} kWh\n` +
          `*Confidence:* ${confidenceText} \\(${result.confidence.toFixed(1)}%\\)\n\n` +
          `${isGoodReading ? 'Reading looks good\\!' : '[WARNING] Low confidence \\- please verify'}`,
          { parse_mode: 'MarkdownV2' }
        );

        // Ask for confirmation
        await ctx.reply(
          'Is this reading correct?',
          {
            reply_markup: {
              inline_keyboard: [
                [
                  { text: 'Yes, Continue', callback_data: `confirm_reading_${userId}` },
                  { text: 'Edit Value', callback_data: `edit_reading_${userId}` },
                  { text: 'Cancel', callback_data: `cancel_reading_${userId}` }
                ]
              ]
            }
          }
        );

      } else {
        // Process Humidity meter
        const result = await processHumidityMeter(buffer);

        userState[userId].ocrValue = result.humidity;
        userState[userId].ocrConfidence = result.confidence;
        userState[userId].timestamp = result.timestamp;
        userState[userId].rawOcrText = result.rawText;

        // Upload to Cloudinary
        const imageUrl = await uploadToCloudinary(buffer, 'humidity');
        userState[userId].photoUrl = imageUrl;

        // Show results
        const confidenceText = formatConfidence(result.confidence);
        const isGoodReading = isConfidenceAcceptable(result.confidence);
        const timestampText = result.timestamp
          ? `\n*Timestamp:* ${result.timestamp.toLocaleString('en-US', { timeZone: 'Africa/Dar_es_Salaam' })}`
          : '';

        await ctx.telegram.deleteMessage(ctx.chat.id, processingMsg.message_id);

        await ctx.reply(
          `[SUCCESS] *OCR Complete\\!*\n\n` +
          `*Humidity Reading:* ${result.humidity}%\n` +
          `*Confidence:* ${confidenceText} \\(${result.confidence.toFixed(1)}%\\)` +
          timestampText.replace(/[-.()]/g, '\\$&') + `\n\n` +
          `${isGoodReading ? 'Reading looks good\\!' : '[WARNING] Low confidence \\- please verify'}`,
          { parse_mode: 'MarkdownV2' }
        );

        // Ask for confirmation
        await ctx.reply(
          'Is this reading correct?',
          {
            reply_markup: {
              inline_keyboard: [
                [
                  { text: 'Yes, Continue', callback_data: `confirm_reading_${userId}` },
                  { text: 'Edit Value', callback_data: `edit_reading_${userId}` },
                  { text: 'Cancel', callback_data: `cancel_reading_${userId}` }
                ]
              ]
            }
          }
        );
      }

    } catch (error: any) {
      console.error('OCR Error:', error);
      await ctx.telegram.deleteMessage(ctx.chat.id, processingMsg.message_id);

      await ctx.reply(
        `[ERROR] OCR Failed\n\n` +
        `${error.message || 'Could not extract reading from photo'}\n\n` +
        `Tips for better results:\n` +
        `• Ensure good lighting\n` +
        `• Keep camera steady\n` +
        `• Focus on the display clearly\n` +
        `• Avoid glare and shadows\n\n` +
        `You can try again with a new photo, or enter the value manually.`,
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
    await ctx.reply('[ERROR] Error processing meter selection. Please try again.');
  }
}

/**
 * Handler for reading confirmation
 */
export async function handleReadingConfirmation(ctx: any, userId: number) {
  try {
    await ctx.answerCbQuery();
    await ctx.editMessageReplyMarkup({ inline_keyboard: [] });

    const state = userState[userId];
    if (!state || !state.ocrValue || !state.meterType) {
      await ctx.reply('[ERROR] Session expired. Please upload photo again.');
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
      `*Select which batch this reading is for:*`,
      {
        parse_mode: 'MarkdownV2',
        reply_markup: keyboard
      }
    );

  } catch (error) {
    console.error('Error handling confirmation:', error);
    await ctx.reply('[ERROR] Error confirming reading. Please try again.');
  }
}

/**
 * Handler for manual reading entry
 */
export async function handleManualEntry(ctx: any, meterType: string, userId: number) {
  try {
    await ctx.answerCbQuery();
    await ctx.editMessageReplyMarkup({ inline_keyboard: [] });

    await ctx.reply(
      `Please enter the ${meterType === 'luku' ? 'kWh' : 'humidity %'} reading:\n\n` +
      `Example: ${meterType === 'luku' ? '1234.5' : '15.5'}`
    );

    // Store state for text input handler
    if (!userState[userId]) {
      userState[userId] = { photoFileId: '', meterType: meterType as 'luku' | 'humidity' };
    }
    userState[userId].meterType = meterType as 'luku' | 'humidity';

  } catch (error) {
    console.error('Error handling manual entry:', error);
    await ctx.reply('[ERROR] Error. Please try again.');
  }
}

/**
 * Handler for batch selection
 */
export async function handleBatchSelection(ctx: any, batchId: string, userId: number) {
  try {
    await ctx.answerCbQuery();
    await ctx.editMessageReplyMarkup({ inline_keyboard: [] });

    const state = userState[userId];
    if (!state || !state.ocrValue || !state.meterType) {
      await ctx.reply('[ERROR] Session expired. Please upload photo again.');
      return;
    }

    await ctx.reply('Saving reading to database...');

    // Prepare reading data
    const readingData: any = {
      batchId: batchId
    };

    if (state.meterType === 'luku') {
      readingData.electricityMeter = state.ocrValue;
      readingData.lukuMeterImageUrl = state.photoUrl;
    } else {
      readingData.humidity = state.ocrValue;
      readingData.humidityMeterImageUrl = state.photoUrl;
    }

    if (state.timestamp) {
      readingData.photoTimestamp = state.timestamp.toISOString();
    }

    if (state.ocrConfidence) {
      readingData.ocrConfidence = state.ocrConfidence;
    }

    readingData.notes = `OCR extracted from Telegram bot\nRaw text: ${state.rawOcrText}`;

    // Save to backend
    try {
      const reading = await backendAPI.createReading(readingData);

      await ctx.reply(
        `[SUCCESS] *Reading saved successfully\\!*\n\n` +
        `*Value:* ${state.ocrValue}${state.meterType === 'luku' ? ' kWh' : '%'}\n` +
        `*Confidence:* ${state.ocrConfidence?.toFixed(1)}%\n` +
        `*Time:* ${new Date().toLocaleString('en-US', { timeZone: 'Africa/Dar_es_Salaam' })}\n\n` +
        `Send another photo or type *Menu* to see all processes\\.`,
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
 * Handler for reading edit
 */
export async function handleReadingEdit(ctx: any, userId: number) {
  try {
    await ctx.answerCbQuery();
    await ctx.editMessageReplyMarkup({ inline_keyboard: [] });

    const state = userState[userId];
    if (!state || !state.meterType) {
      await ctx.reply('[ERROR] Session expired. Please upload photo again.');
      return;
    }

    await ctx.reply(
      `Please enter the correct ${state.meterType === 'luku' ? 'kWh' : 'humidity %'} reading:\n\n` +
      `Example: ${state.meterType === 'luku' ? '1234.5' : '15.5'}`
    );

    // Keep state for text input handler

  } catch (error) {
    console.error('Error handling edit:', error);
    await ctx.reply('[ERROR] Error. Please try again.');
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

    await ctx.reply('[CANCELLED] Reading cancelled. Send a new photo to try again.');

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

    const state = userState[userId];
    if (!state || !state.meterType) {
      return; // Not in a reading flow
    }

    // Parse the input
    const value = parseFloat(text.replace(',', '.'));

    if (isNaN(value)) {
      await ctx.reply('[ERROR] Invalid number. Please enter a valid reading (e.g., 15.5)');
      return;
    }

    // Validate range
    if (state.meterType === 'humidity' && (value < 0 || value > 100)) {
      await ctx.reply('[ERROR] Humidity must be between 0-100%');
      return;
    }

    if (state.meterType === 'luku' && (value < 0 || value > 999999)) {
      await ctx.reply('[ERROR] Invalid kWh reading. Must be between 0-999999');
      return;
    }

    // Store value
    state.ocrValue = value;
    state.ocrConfidence = 100; // Manual entry is 100% accurate

    await ctx.reply(`Got it: ${value}${state.meterType === 'luku' ? ' kWh' : '%'}`);

    // Get batches for selection
    const batches = await backendAPI.getActiveBatches();

    if (!batches || batches.length === 0) {
      await ctx.reply('[ERROR] No active batches found.');
      delete userState[userId];
      return;
    }

    const keyboard = {
      inline_keyboard: batches.map((batch: any) => [{
        text: `${batch.batchNumber} - ${batch.woodType}`,
        callback_data: `select_batch_${batch.id}_${userId}`
      }])
    };

    await ctx.reply('Select which batch:', { reply_markup: keyboard });

  } catch (error) {
    console.error('Error handling manual input:', error);
    await ctx.reply('[ERROR] Error processing input. Please try again.');
  }
}
