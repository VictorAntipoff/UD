import { Context } from 'telegraf';
import { getMessage } from '../api/messages';

export async function startHandler(ctx: Context) {
  const firstName = ctx.from?.first_name || 'there';

  // Fetch message from database with fallback
  const messageTemplate = await getMessage('start_message', `
👋 Welcome {firstName}\\!

I'm the *UD System Bot* \\- your drying process monitoring assistant\\.

I can help you:
• 📊 Monitor active drying processes
• ➕ Add meter readings
• ⏱️ Get completion time estimates
• 📈 Track humidity and electricity

*Quick Start:*
Tap the menu button below to get started\\!
`);

  // Replace placeholders
  const message = messageTemplate.replace(/\{firstName\}/g, firstName);

  const keyboard = {
    inline_keyboard: [
      [
        { text: '📋 Main Menu', callback_data: 'back_to_menu' }
      ],
      [
        { text: '📋 All Commands', callback_data: 'menu_all_commands' },
        { text: '❓ Help', callback_data: 'menu_help' }
      ]
    ]
  };

  await ctx.reply(message, {
    
    parse_mode: 'HTML',
      reply_markup: keyboard
  });
}

export async function helpHandler(ctx: Context) {
  // Fetch message from database with fallback
  const message = await getMessage('help_message', `
📖 *Help \\- Available Commands*

*Main Commands:*
• /menu \\- Show main menu
• /help \\- Show this help message

*Main Menu Options:*
• 📊 *Drying Processes* \\- View all active batches with estimates
• ➕ *Add Reading* \\- Record new meter readings

*Adding a Reading:*
1\\. Click "Add Reading" from the menu
2\\. Select the batch
3\\. Enter Electricity reading \\(kWh\\)
4\\. Enter Humidity reading \\(%\\)
5\\. Enter Date and Time \\(MM/DD/YYYY HH:MM\\)
6\\. Confirm and save

*Examples:*
• Electricity: 1174\\.66
• Humidity: 30\\.9
• Date/Time: 12/09/2025 16:02

Need help? Contact your system administrator\\.
`);

  const keyboard = {
    inline_keyboard: [
      [
        { text: '📋 Main Menu', callback_data: 'back_to_menu' }
      ],
      [
        { text: '📋 All Commands', callback_data: 'menu_all_commands' }
      ]
    ]
  };

  await ctx.reply(message, {
    
    parse_mode: 'HTML',
      reply_markup: keyboard
  });
}
