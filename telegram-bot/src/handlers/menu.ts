import { Context } from 'telegraf';
import { backendAPI } from '../api/backend';
import { formatDate, formatDuration } from '../utils/formatters';

export async function menuHandler(ctx: Context) {
  try {
    await ctx.reply('🔍 Loading active drying processes...');

    const processes = await backendAPI.getActiveProcesses();

    if (!processes || processes.length === 0) {
      await ctx.reply('📭 No active drying processes found.');
      return;
    }

    // Build menu message
    let message = '🔥 *Active Drying Processes*\n\n';

    processes.forEach((process: any, index: number) => {
      const number = index + 1;
      const emoji = getNumberEmoji(number);

      message += `${emoji} *${process.batchNumber}* \\- ${escapeMarkdown(process.woodType)} ${process.thickness || ''}\n`;
      message += `   💧 Current: ${process.currentHumidity}% → Target: ${process.targetHumidity}%\n`;
      message += `   ⏱️ Est\\. Completion: ${formatDuration(process.estimatedDays)} \\(${formatDate(process.estimatedDate)}\\)\n`;

      if (process.lotNumber) {
        message += `   📦 LOT: ${escapeMarkdown(process.lotNumber)}\n`;
      }

      message += '\n';
    });

    message += `📊 Total Active: ${processes.length} batch${processes.length > 1 ? 'es' : ''}\n`;

    if (processes[0]?.nextReadingDue) {
      message += `🕐 Next reading due: ${formatDuration(processes[0].nextReadingDue)}\n`;
    }

    // Create inline keyboard with detail buttons
    const keyboard = {
      inline_keyboard: processes.map((process: any, index: number) => [{
        text: `📊 Details ${index + 1}`,
        callback_data: `details_${process.id}`
      }])
    };

    await ctx.reply(message, {
      parse_mode: 'MarkdownV2',
      reply_markup: keyboard
    });

  } catch (error) {
    console.error('Error in menu handler:', error);
    await ctx.reply('❌ Error loading menu. Please try again later.');
  }
}

// Helper function to escape MarkdownV2 special characters
function escapeMarkdown(text: string): string {
  if (!text) return '';
  return text
    .replace(/[_*[\]()~`>#+\-=|{}.!]/g, '\\$&');
}

// Helper function to get number emoji
function getNumberEmoji(num: number): string {
  const emojis: { [key: number]: string } = {
    1: '1️⃣', 2: '2️⃣', 3: '3️⃣', 4: '4️⃣', 5: '5️⃣',
    6: '6️⃣', 7: '7️⃣', 8: '8️⃣', 9: '9️⃣', 10: '🔟'
  };
  return emojis[num] || `${num}.`;
}
