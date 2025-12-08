import { Context } from 'telegraf';
import { backendAPI } from '../api/backend';
import { formatDate, formatRelativeTime, formatPercentage, formatNumber, formatDuration } from '../utils/formatters';

export async function statusHandler(ctx: Context) {
  try {
    const args = ctx.message && 'text' in ctx.message
      ? ctx.message.text.split(' ').slice(1)
      : [];

    if (args.length === 0) {
      await ctx.reply('Please specify a batch number. Example: /status UD-DRY-00012');
      return;
    }

    const batchNumber = args.join(' ');
    await ctx.reply(`🔍 Loading status for ${batchNumber}...`);

    const status = await backendAPI.getBatchStatus(batchNumber);

    if (!status) {
      await ctx.reply(`❌ Batch ${batchNumber} not found.`);
      return;
    }

    // Build detailed status message
    let message = `📊 *Detailed Report: ${escapeMarkdown(status.batchNumber)}*\n\n`;

    // Wood info
    message += `🌳 *Wood:* ${escapeMarkdown(status.woodType)} ${escapeMarkdown(status.thickness || '')}\n`;

    if (status.lotNumber) {
      message += `📦 *LOT Number:* ${escapeMarkdown(status.lotNumber)}\n`;
    }

    message += `📍 *Status:* ${escapeMarkdown(status.status)}\n\n`;

    // Humidity progress
    message += `💧 *Humidity Progress:*\n`;
    message += `├─ Current: ${formatPercentage(status.currentHumidity)}\n`;
    message += `├─ Target: ${formatPercentage(status.targetHumidity)}\n`;
    message += `└─ Remaining: ${formatPercentage(status.currentHumidity - status.targetHumidity)}\n\n`;

    // Time estimates
    message += `⏱️ *Time Estimates:*\n`;
    message += `├─ Started: ${escapeMarkdown(formatDate(status.startTime))} \\(${escapeMarkdown(formatRelativeTime(status.startTime))}\\)\n`;

    if (status.estimatedCompletion) {
      message += `├─ Est\\. Completion: ${escapeMarkdown(formatDate(status.estimatedCompletion))} \\(${escapeMarkdown(formatDuration(status.daysRemaining))}\\)\n`;
    }

    if (status.totalDuration) {
      message += `└─ Total Duration: \\~${escapeMarkdown(formatDuration(status.totalDuration))}\n`;
    }

    message += '\n';

    // Performance metrics
    if (status.dryingRate) {
      message += `📈 *Drying Rate:* ${formatPercentage(status.dryingRate)} per day\n`;
    }

    if (status.electricityUsed) {
      message += `🔋 *Electricity Used:* ${escapeMarkdown(formatNumber(status.electricityUsed))} kWh\n`;
    }

    message += '\n';

    // Recent readings
    if (status.recentReadings && status.recentReadings.length > 0) {
      message += `📊 *Recent Readings:*\n`;

      status.recentReadings.slice(0, 4).forEach((reading: any) => {
        message += `• ${formatPercentage(reading.humidity)} \\- ${escapeMarkdown(formatRelativeTime(reading.readingTime))}\n`;
      });
    }

    // Inline keyboard
    const keyboard = {
      inline_keyboard: [
        [
          { text: '🔄 Refresh', callback_data: `refresh_${status.id}` },
          { text: '📸 Add Reading', callback_data: `add_reading_${status.id}` }
        ],
        [
          { text: '📊 Full Report', callback_data: `report_${status.id}` }
        ]
      ]
    };

    await ctx.reply(message, {
      parse_mode: 'MarkdownV2',
      reply_markup: keyboard
    });

  } catch (error) {
    console.error('Error in status handler:', error);
    await ctx.reply('❌ Error loading status. Please check the batch number and try again.');
  }
}

function escapeMarkdown(text: string): string {
  if (!text) return '';
  return text
    .toString()
    .replace(/[_*[\]()~`>#+\-=|{}.!]/g, '\\$&');
}
