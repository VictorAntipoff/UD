import { Context } from 'telegraf';
import { backendAPI } from '../api/backend';
import { formatDate, formatCompletionDate, formatDuration } from '../utils/formatters';
import { differenceInHours } from 'date-fns';
import { getMessage } from '../api/messages';

export async function menuHandler(ctx: Context) {
  try {
    // Enhanced interactive menu with all available commands
    const mainMenu = {
      inline_keyboard: [
        [
          { text: '📊 Drying Processes', callback_data: 'menu_processes' }
        ],
        [
          { text: '➕ Add Reading', callback_data: 'menu_add_reading' }
        ],
        [
          { text: '📈 Status Summary', callback_data: 'menu_summary' }
        ],
        [
          { text: '📋 All Commands', callback_data: 'menu_all_commands' }
        ],
        [
          { text: '❓ Help', callback_data: 'menu_help' }
        ]
      ]
    };

    // Fetch message from database with fallback
    const welcomeMessage = await getMessage('menu_message',
      '🏭 *UD System Bot* \\- Main Menu\n\n' +
      'Choose an option below:\n\n' +
      '📊 *Drying Processes* \\- View all active batches\n' +
      '➕ *Add Reading* \\- Record new meter readings\n' +
      '📈 *Status Summary* \\- Quick overview of all processes\n' +
      '📋 *All Commands* \\- See available commands\n' +
      '❓ *Help* \\- Get help and instructions'
    );

    await ctx.reply(welcomeMessage, {
      
      parse_mode: 'HTML',
      reply_markup: mainMenu
    });

  } catch (error) {
    console.error('Error in menu handler:', error);
    await ctx.reply('[ERROR] Error loading menu. Please try again later.');
  }
}

export async function allCommandsHandler(ctx: any) {
  try {
    await ctx.answerCbQuery();

    // Fetch message from database with fallback
    const message = await getMessage('all_commands_message',
      '📋 *Available Commands*\n\n' +
      '*Main Commands:*\n' +
      '/start \\- Welcome message and quick start\n' +
      '/menu \\- Show main menu \\(this menu\\)\n' +
      '/help \\- Show help and instructions\n' +
      '/status \\- Quick status overview\n\n' +
      '*Quick Actions:*\n' +
      '• Type "menu" \\- Show main menu\n' +
      '• Send photo 📸 \\- OCR reading from meter\n' +
      '• Send number \\- Manual reading entry\n\n' +
      '*Tips:*\n' +
      '• Use the menu buttons for easy navigation\n' +
      '• All commands start with /\n' +
      '• You can also use keyboard shortcuts'
    );

    const keyboard = {
      inline_keyboard: [
        [
          { text: '🏠 Back to Menu', callback_data: 'back_to_menu' }
        ]
      ]
    };

    await ctx.reply(message, {
      
      parse_mode: 'HTML',
      reply_markup: keyboard
    });

  } catch (error) {
    console.error('Error in all commands handler:', error);
    await ctx.reply('[ERROR] Error loading commands. Please try again.');
  }
}

export async function helpMenuHandler(ctx: any) {
  try {
    await ctx.answerCbQuery();

    // Fetch message from database with fallback
    const message = await getMessage('help_menu_message',
      '📖 *Help \\- How to Use*\n\n' +
      '*Adding Readings:*\n' +
      '1\\. Click "➕ Add Reading" from menu\n' +
      '2\\. Select the drying batch\n' +
      '3\\. Enter Electricity reading \\(kWh\\)\n' +
      '4\\. Enter Humidity reading \\(%\\)\n' +
      '5\\. Enter Date/Time\n' +
      '6\\. Confirm and save\n\n' +
      '*Photo Reading \\(OCR\\):*\n' +
      '• Send a photo of the meter\n' +
      '• Bot will extract the reading\n' +
      '• Confirm or edit the value\n\n' +
      '*Examples:*\n' +
      '• Electricity: 1174\\.66 kWh\n' +
      '• Humidity: 30\\.9 %\n' +
      '• Date: 12/09/2025 16:02\n\n' +
      '*Need help?* Contact your administrator\\.'
    );

    const keyboard = {
      inline_keyboard: [
        [
          { text: '📋 All Commands', callback_data: 'menu_all_commands' }
        ],
        [
          { text: '🏠 Back to Menu', callback_data: 'back_to_menu' }
        ]
      ]
    };

    await ctx.reply(message, {
      
      parse_mode: 'HTML',
      reply_markup: keyboard
    });

  } catch (error) {
    console.error('Error in help menu handler:', error);
    await ctx.reply('[ERROR] Error loading help. Please try again.');
  }
}

export async function processesMenuHandler(ctx: any) {
  try {
    await ctx.answerCbQuery();

    const loadingMsg = await ctx.reply('Loading drying processes...');

    const processes = await backendAPI.getActiveProcesses();

    await ctx.telegram.deleteMessage(ctx.chat.id, loadingMsg.message_id);

    if (!processes || processes.length === 0) {
      await ctx.reply('No active drying processes found.');
      return;
    }

    // Show each process with key details
    let message = '🔥 Active Drying Processes\n\n';

    processes.forEach((process: any, index: number) => {
      message += `━━━━━━━━━━━━━━━━━━━━\n`;
      message += `${index + 1}. ${process.batchNumber}\n`;
      message += `Wood: ${process.woodType}${process.thickness ? ' ' + process.thickness : ''}`;
      if (process.pieceCount) {
        message += ` - ${process.pieceCount} pcs`;
      }
      message += `\n`;
      message += `Humidity: ${process.currentHumidity}%\n`;
      message += `Electricity: ${process.currentElectricity} kWh\n`;
      message += `Used: ${process.electricityUsed} kWh\n`;

      // Show completion estimation like DRY page
      if (process.estimatedDate) {
        message += `Estimation: ${formatCompletionDate(process.estimatedDate)}\n`;
      } else {
        message += `Estimation: N/A\n`;
      }
      message += `\n`;
    });

    const keyboard = {
      inline_keyboard: [
        [
          { text: 'Refresh', callback_data: 'menu_processes' },
          { text: 'Menu', callback_data: 'back_to_menu' }
        ]
      ]
    };

    await ctx.reply(message, {
      parse_mode: 'HTML',
      reply_markup: keyboard
    });

  } catch (error) {
    console.error('Error in processes menu:', error);
    await ctx.reply('[ERROR] Error loading processes. Please try again.');
  }
}

export async function showAllProcessesHandler(ctx: any) {
  try {
    await ctx.answerCbQuery();
    await ctx.editMessageReplyMarkup({ inline_keyboard: [] });

    const processes = await backendAPI.getActiveProcesses();

    if (!processes || processes.length === 0) {
      await ctx.reply('No active drying processes found.');
      return;
    }

    // Build detailed process list with online/offline status
    let message = '*Active Drying Processes*\n\n';

    processes.forEach((process: any, index: number) => {
      const number = index + 1;
      const status = getProcessStatus(process);

      message += `${number}\\. ${status.emoji} *${process.batchNumber}* \\- ${escapeMarkdown(process.woodType)} ${process.thickness || ''}\n`;
      message += `   Humidity: ${process.currentHumidity}% → ${process.targetHumidity}% \\(Target\\)\n`;
      message += `   Est: ${formatDuration(process.estimatedDays)} \\(${formatDate(process.estimatedDate)}\\)\n`;
      message += `   Location: ${process.location || 'Unknown'}\n`;
      message += `   ${status.message}\n`;

      if (process.lotNumber) {
        message += `   LOT: ${escapeMarkdown(process.lotNumber)}\n`;
      }

      message += '\n';
    });

    message += `━━━━━━━━━━━━━━━━━━━━\n`;
    message += `Legend:\n`;
    message += `\\[OK\\] Online \\(\\< 1 hour ago\\)\n`;
    message += `\\[WARN\\] Warning \\(1\\-6 hours ago\\)\n`;
    message += `\\[OFF\\] Offline \\(\\> 6 hours ago\\)\n`;

    // Create inline keyboard with action buttons
    const buttons = [];

    // Add detail buttons in rows of 2
    for (let i = 0; i < processes.length; i += 2) {
      const row = [];
      row.push({
        text: `Details ${i + 1}`,
        callback_data: `details_${processes[i].id}`
      });
      if (i + 1 < processes.length) {
        row.push({
          text: `Details ${i + 2}`,
          callback_data: `details_${processes[i + 1].id}`
        });
      }
      buttons.push(row);
    }

    // Add action row
    buttons.push([
      { text: 'Refresh', callback_data: 'filter_all' },
      { text: 'Menu', callback_data: 'back_to_menu' }
    ]);

    const keyboard = { inline_keyboard: buttons };

    await ctx.reply(message, {
      
      parse_mode: 'HTML',
      reply_markup: keyboard
    });

  } catch (error) {
    console.error('Error showing processes:', error);
    await ctx.reply('[ERROR] Error loading processes. Please try again.');
  }
}

export async function showSummaryHandler(ctx: any) {
  try {
    await ctx.answerCbQuery();

    const loadingMsg = await ctx.reply('Loading summary...');

    const processes = await backendAPI.getActiveProcesses();

    await ctx.telegram.deleteMessage(ctx.chat.id, loadingMsg.message_id);

    if (!processes || processes.length === 0) {
      await ctx.reply('No active drying processes found\\.');
      return;
    }

    let message = '📊 UD System - Drying Summary\n\n';
    message += `Date: ${formatDate(new Date())}\n\n`;

    // Show each process with key details
    processes.forEach((process: any, index: number) => {
      message += `━━━━━━━━━━━━━━━━━━━━\n`;
      message += `${index + 1}. ${process.batchNumber}\n`;
      message += `━━━━━━━━━━━━━━━━━━━━\n`;
      message += `Wood: ${process.woodType}${process.thickness ? ' ' + process.thickness : ''}`;
      if (process.pieceCount) {
        message += ` - ${process.pieceCount} pcs`;
      }
      message += `\n`;
      message += `Humidity: ${process.currentHumidity}%\n`;
      message += `Electricity: ${process.currentElectricity} kWh (current)\n`;
      message += `Total Used: ${process.electricityUsed} kWh\n`;

      // Show completion estimation like DRY page
      if (process.estimatedDate) {
        message += `Estimation: ${formatCompletionDate(process.estimatedDate)}\n`;
      } else {
        message += `Estimation: N/A\n`;
      }
      message += `\n`;
    });

    const keyboard = {
      inline_keyboard: [
        [
          { text: 'View All', callback_data: 'filter_all' },
          { text: 'Refresh', callback_data: 'menu_summary' }
        ],
        [
          { text: 'Menu', callback_data: 'back_to_menu' }
        ]
      ]
    };

    await ctx.reply(message, {
      parse_mode: 'HTML',
      reply_markup: keyboard
    });

  } catch (error) {
    console.error('Error showing summary:', error);
    await ctx.reply('[ERROR] Error loading summary. Please try again.');
  }
}

// Helper: Get process online/offline status
function getProcessStatus(process: any): { emoji: string; message: string } {
  if (!process.lastReadingTime) {
    return {
      emoji: '\\[OFF\\]',
      message: 'No readings yet'
    };
  }

  const hoursSinceReading = differenceInHours(new Date(), new Date(process.lastReadingTime));

  if (hoursSinceReading < 1) {
    return {
      emoji: '\\[OK\\]',
      message: `Last reading: ${Math.round(hoursSinceReading * 60)} mins ago`
    };
  } else if (hoursSinceReading < 6) {
    return {
      emoji: '\\[WARN\\]',
      message: `Last reading: ${hoursSinceReading.toFixed(0)} hours ago`
    };
  } else {
    return {
      emoji: '\\[OFF\\]',
      message: `OFFLINE \\- No data for ${hoursSinceReading.toFixed(0)} hours\\!`
    };
  }
}

// Helper: Count online processes
function countOnlineProcesses(processes: any[]): number {
  return processes.filter((p: any) => {
    if (!p.lastReadingTime) return false;
    const hours = differenceInHours(new Date(), new Date(p.lastReadingTime));
    return hours < 1;
  }).length;
}

// Helper: Count warning processes
function countWarningProcesses(processes: any[]): number {
  return processes.filter((p: any) => {
    if (!p.lastReadingTime) return false;
    const hours = differenceInHours(new Date(), new Date(p.lastReadingTime));
    return hours >= 1 && hours < 6;
  }).length;
}

// Helper: Count offline processes
function countOfflineProcesses(processes: any[]): number {
  return processes.filter((p: any) => {
    if (!p.lastReadingTime) return true;
    const hours = differenceInHours(new Date(), new Date(p.lastReadingTime));
    return hours >= 6;
  }).length;
}

// Helper: Calculate summary statistics
function calculateStats(processes: any[]) {
  const total = processes.length;
  const onTrack = countOnlineProcesses(processes);
  const warning = countWarningProcesses(processes);
  const offline = countOfflineProcesses(processes);

  let totalRate = 0;
  let fastestRate = 0;
  let slowestRate = Infinity;
  let completingToday = 0;
  let completingWeek = 0;

  processes.forEach((p: any) => {
    if (p.dryingRate) {
      totalRate += p.dryingRate;
      if (p.dryingRate > fastestRate) fastestRate = p.dryingRate;
      if (p.dryingRate < slowestRate) slowestRate = p.dryingRate;
    }

    if (p.estimatedDays && p.estimatedDays <= 1) completingToday++;
    if (p.estimatedDays && p.estimatedDays <= 7) completingWeek++;
  });

  return {
    total,
    onTrack,
    warning,
    offline,
    avgDryingRate: total > 0 ? totalRate / total : 0,
    fastestRate: fastestRate || 0,
    slowestRate: slowestRate === Infinity ? 0 : slowestRate,
    completingToday,
    completingWeek
  };
}

// Helper: Escape MarkdownV2 special characters
function escapeMarkdown(text: string): string {
  if (!text) return '';
  return text.replace(/[_*[\]()~`>#+\-=|{}.!]/g, '\\$&');
}

