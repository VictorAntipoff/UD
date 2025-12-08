import { Context } from 'telegraf';

export async function startHandler(ctx: Context) {
  const firstName = ctx.from?.first_name || 'there';

  const message = `
👋 Welcome ${firstName}\\!

I'm the *UD System Bot* \\- your drying process monitoring assistant\\.

I can help you:
• 📸 Upload meter photos \\(I'll extract readings automatically\\)
• 📊 Monitor active drying processes
• ⏱️ Get completion time estimates
• 📈 Track humidity and electricity readings

*Quick Start:*
1\\. Send "Menu" or /menu to see all active batches
2\\. Send a photo of your humidity or Luku meter
3\\. Use /status \\[batch\\] for detailed info

*Commands:*
/menu \\- Show all active drying processes
/status \\[batch\\] \\- Get detailed status
/help \\- Show this help message

Let's get started\\! Try sending "Menu" now\\.
`;

  await ctx.reply(message, { parse_mode: 'MarkdownV2' });
}

export async function helpHandler(ctx: Context) {
  const message = `
📖 *Help \\- Available Commands*

*Main Commands:*
• *Menu* or /menu \\- Show all active drying processes with estimates
• /list \\- Same as Menu \\(alias\\)
• /status \\[batch\\] \\- Get detailed status for a specific batch
  Example: \`/status UD\\-DRY\\-00012\`

*Photo Upload:*
Just send a photo of your meter and I'll:
1\\. Extract the reading using OCR
2\\. Ask you which batch it belongs to
3\\. Save it automatically

*Interactive Features:*
• Click "📊 Details" buttons in Menu to see full batch info
• Click batch names when uploading photos for quick selection
• Click "🔄 Refresh" to update status info

*Tips:*
• 📸 Take clear, well\\-lit photos for best OCR accuracy
• 🕐 Photos are automatically timestamped
• 💡 Both humidity and electricity readings are supported

Need help? Contact your system administrator\\.
`;

  await ctx.reply(message, { parse_mode: 'MarkdownV2' });
}
