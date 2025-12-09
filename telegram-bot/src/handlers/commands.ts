import { Context } from 'telegraf';

export async function startHandler(ctx: Context) {
  const firstName = ctx.from?.first_name || 'there';

  const message = `
👋 Welcome ${firstName}\\!

I'm the *UD System Bot* \\- your drying process monitoring assistant\\.

I can help you:
• 📊 Monitor active drying processes
• ➕ Add meter readings
• ⏱️ Get completion time estimates
• 📈 Track humidity and electricity

*Quick Start:*
1\\. Type /menu to see the main menu
2\\. Click "Add Reading" to record new readings
3\\. View "Drying Processes" to see active batches

*Commands:*
/menu \\- Show main menu
/help \\- Show this help message

Let's get started\\! Try /menu now\\.
`;

  await ctx.reply(message, { parse_mode: 'MarkdownV2' });
}

export async function helpHandler(ctx: Context) {
  const message = `
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
`;

  await ctx.reply(message, { parse_mode: 'MarkdownV2' });
}
