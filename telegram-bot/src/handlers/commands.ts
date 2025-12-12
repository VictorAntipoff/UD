import { Context } from 'telegraf';
import { getMessageData } from '../api/messages';

export async function startHandler(ctx: Context) {
  const firstName = ctx.from?.first_name || 'there';

  // Fetch message and buttons from database with fallback
  const messageData = await getMessageData('start_message', {
    content: `👋 Welcome {firstName}!

I'm the <b>UD System Bot</b> - your drying process monitoring assistant.

I can help you:
• 📊 Monitor active drying processes
• ➕ Add meter readings
• ⏱️ Get completion time estimates
• 📈 Track humidity and electricity

<b>Quick Start:</b>
Tap the menu button below to get started!`,
    buttons: [
      [{ text: '📋 Main Menu', callback_data: 'back_to_menu' }],
      [
        { text: '📋 All Commands', callback_data: 'menu_all_commands' },
        { text: '❓ Help', callback_data: 'menu_help' }
      ]
    ]
  });

  // Replace placeholders
  const message = messageData.content.replace(/\{firstName\}/g, firstName);

  await ctx.reply(message, {
    parse_mode: 'HTML',
    reply_markup: messageData.buttons ? { inline_keyboard: messageData.buttons as any } : undefined
  });
}

export async function helpHandler(ctx: Context) {
  // Fetch message from database with fallback
  const messageData = await getMessageData('help_message', {
    content: `📖 <b>Help - Available Commands</b>

<b>Main Commands:</b>
• /menu - Show main menu
• /help - Show this help message

<b>Main Menu Options:</b>
• 📊 <b>Drying Processes</b> - View all active batches with estimates
• ➕ <b>Add Reading</b> - Record new meter readings

<b>Adding a Reading:</b>
1. Click "Add Reading" from the menu
2. Select the batch
3. Enter Electricity reading (kWh)
4. Enter Humidity reading (%)
5. Enter Date and Time (MM/DD/YYYY HH:MM)
6. Confirm and save

<b>Examples:</b>
• Electricity: 1174.66
• Humidity: 30.9
• Date/Time: 12/09/2025 16:02

Need help? Contact your system administrator.`,
    buttons: [
      [{ text: '📋 Main Menu', callback_data: 'back_to_menu' }],
      [{ text: '📋 All Commands', callback_data: 'menu_all_commands' }]
    ]
  });

  await ctx.reply(messageData.content, {
    parse_mode: 'HTML',
    reply_markup: messageData.buttons ? { inline_keyboard: messageData.buttons as any } : undefined
  });
}
