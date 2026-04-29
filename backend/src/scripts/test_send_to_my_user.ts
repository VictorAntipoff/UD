// END-TO-END test: send a Telegram message to the currently-linked admin user
// using the SAME code path the production app uses (sendTelegramMessage).
// This proves: token works → user lookup works → chatId is valid → Telegram accepts → message lands.

import { prisma } from '../lib/prisma.js';
import { sendTelegramMessage, isTelegramConfigured } from '../services/telegramNotify.js';

async function main() {
  console.log('=== End-to-end Telegram delivery test ===\n');

  // 1. Token check
  if (!isTelegramConfigured()) {
    console.log('✗ TELEGRAM_BOT_TOKEN missing in env');
    process.exit(1);
  }
  console.log('✓ TELEGRAM_BOT_TOKEN is set in env');

  // 2. Find a user with a linked Telegram chat (preferring the admin)
  const linkedUser = await prisma.user.findFirst({
    where: { telegramChatId: { not: null }, isActive: true },
    orderBy: [{ role: 'asc' }, { createdAt: 'asc' }],  // ADMIN sorts before USER alphabetically
    select: {
      id: true, email: true, firstName: true, lastName: true, role: true,
      telegramChatId: true, telegramLinkedAt: true,
    },
  });

  if (!linkedUser) {
    console.log('\n✗ No user has linked their Telegram yet.');
    console.log('  Go to UserSettings → Telegram → save your chat ID first, then re-run.');
    process.exit(1);
  }

  console.log(`\nLinked user found:`);
  console.log(`  email:    ${linkedUser.email}`);
  console.log(`  name:     ${linkedUser.firstName ?? ''} ${linkedUser.lastName ?? ''}`);
  console.log(`  role:     ${linkedUser.role}`);
  console.log(`  chatId:   ${linkedUser.telegramChatId}`);
  console.log(`  linkedAt: ${linkedUser.telegramLinkedAt?.toISOString() ?? 'n/a'}`);

  // 3. Send a message via the SAME helper the app uses
  const text =
    '🧪 *UD System — delivery test*\n' +
    '━━━━━━━━━━━━━━━━━━━━━\n' +
    'This is a test message sent through the *exact same code path* the app uses for ' +
    'reading-added / close-approved / etc. notifications.\n\n' +
    `Time: \`${new Date().toISOString()}\`\n` +
    `Sent to: \`${linkedUser.telegramChatId}\`\n\n` +
    'If you can read this on your phone, the system can send you messages reliably. ✅';

  console.log(`\nDispatching via sendTelegramMessage()...`);
  const result = await sendTelegramMessage({
    userId: linkedUser.id,
    text,
    parseMode: 'Markdown',
  });

  console.log(`\nResult:`);
  console.log(JSON.stringify(result, null, 2));

  if (result.ok) {
    console.log(`\n✓✓✓ Message accepted by Telegram (telegramMessageId: ${result.telegramMessageId})`);
    console.log('    Check your phone — should arrive within seconds.');
  } else {
    console.log(`\n✗ Failed: ${result.error ?? result.skipped}`);
  }
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
