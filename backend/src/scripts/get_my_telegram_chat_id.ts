// Convenience: lists recent Telegram chats that have messaged the bot.
// Use this to find your chat ID after sending a message to @ud_system_bot.

async function main() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.error('TELEGRAM_BOT_TOKEN is missing from env');
    process.exit(1);
  }
  const res = await fetch(`https://api.telegram.org/bot${token}/getUpdates`);
  const json = (await res.json()) as any;
  if (!json.ok) {
    console.error('Telegram API error:', json);
    process.exit(1);
  }
  const updates = json.result || [];
  if (updates.length === 0) {
    console.log('No recent updates. Send any message to @ud_system_bot first, then re-run this script.');
    return;
  }
  // Collect unique chats with their first/last seen time and most recent message
  const chats = new Map<number, { name: string; lastText: string; lastDate: number }>();
  for (const u of updates) {
    const msg = u.message ?? u.edited_message ?? null;
    if (!msg?.chat) continue;
    const chat = msg.chat;
    const name = chat.username
      ? '@' + chat.username
      : `${chat.first_name ?? ''} ${chat.last_name ?? ''}`.trim() || `chat:${chat.id}`;
    const existing = chats.get(chat.id);
    if (!existing || msg.date > existing.lastDate) {
      chats.set(chat.id, { name, lastText: (msg.text ?? '').slice(0, 60), lastDate: msg.date });
    }
  }
  console.log('Recent chats with the bot:');
  for (const [id, info] of chats) {
    const ts = new Date(info.lastDate * 1000).toISOString();
    console.log(`  chatId=${id}  ${info.name}  "${info.lastText}"  (${ts})`);
  }
  console.log('\nUse the numeric chatId for the user you want to link.');
}

main().catch(e => { console.error(e); process.exit(1); });
