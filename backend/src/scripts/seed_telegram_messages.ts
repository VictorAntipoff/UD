import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding Telegram messages...');

  // START COMMAND MESSAGE
  await prisma.telegramMessage.upsert({
    where: { key: 'start_message' },
    update: {},
    create: {
      key: 'start_message',
      name: 'Start/Welcome Message',
      category: 'COMMANDS',
      description: 'Message shown when user types /start',
      isActive: true,
      content: `👋 Welcome {firstName}!

I'm the *UD System Bot* - your drying process monitoring assistant.

I can help you:
• 📊 Monitor active drying processes
• ➕ Add meter readings
• ⏱️ Get completion time estimates
• 📈 Track humidity and electricity

*Quick Start:*
1. Type /menu to see the main menu
2. Click "Add Reading" to record new readings
3. View "Drying Processes" to see active batches

*Commands:*
/menu - Show main menu
/help - Show this help message

Let's get started! Try /menu now.`
    }
  });

  // HELP COMMAND MESSAGE
  await prisma.telegramMessage.upsert({
    where: { key: 'help_message' },
    update: {},
    create: {
      key: 'help_message',
      name: 'Help Message',
      category: 'COMMANDS',
      description: 'Message shown when user types /help',
      isActive: true,
      content: `📖 *Help - Available Commands*

*Main Commands:*
• /menu - Show main menu
• /help - Show this help message

*Main Menu Options:*
• 📊 *Drying Processes* - View all active batches with estimates
• ➕ *Add Reading* - Record new meter readings

*Adding a Reading:*
1. Click "Add Reading" from the menu
2. Select the batch
3. Enter Electricity reading (kWh)
4. Enter Humidity reading (%)
5. Enter Date and Time (MM/DD/YYYY HH:MM)
6. Confirm and save

*Examples:*
• Electricity: 1174.66
• Humidity: 30.9
• Date/Time: 12/09/2025 16:02

Need help? Contact your system administrator.`
    }
  });

  // MENU MESSAGE
  await prisma.telegramMessage.upsert({
    where: { key: 'menu_message' },
    update: {},
    create: {
      key: 'menu_message',
      name: 'Main Menu Message',
      category: 'MENU',
      description: 'Main menu text shown when user types /menu',
      isActive: true,
      content: `🏭 UD System Bot

Choose an option:

📊 Drying Processes - View all active processes
➕ Add Reading - Add new meter reading`
    }
  });

  // DRYING PROCESSES - LOADING
  await prisma.telegramMessage.upsert({
    where: { key: 'loading_processes' },
    update: {},
    create: {
      key: 'loading_processes',
      name: 'Loading Processes Message',
      category: 'MENU',
      description: 'Shown while loading drying processes',
      isActive: true,
      content: 'Loading drying processes...'
    }
  });

  // DRYING PROCESSES - EMPTY
  await prisma.telegramMessage.upsert({
    where: { key: 'no_processes' },
    update: {},
    create: {
      key: 'no_processes',
      name: 'No Processes Found',
      category: 'MENU',
      description: 'Shown when there are no active processes',
      isActive: true,
      content: 'No active drying processes found.'
    }
  });

  // ADD READING - LOADING BATCHES
  await prisma.telegramMessage.upsert({
    where: { key: 'loading_batches' },
    update: {},
    create: {
      key: 'loading_batches',
      name: 'Loading Batches Message',
      category: 'ADD_READING',
      description: 'Shown while loading batch list for adding reading',
      isActive: true,
      content: 'Loading active batches...'
    }
  });

  // ADD READING - NO BATCHES
  await prisma.telegramMessage.upsert({
    where: { key: 'no_batches' },
    update: {},
    create: {
      key: 'no_batches',
      name: 'No Batches Available',
      category: 'ADD_READING',
      description: 'Shown when no active batches are available',
      isActive: true,
      content: '[ERROR] No active batches found. Please create a drying process first.'
    }
  });

  // ADD READING - SELECT BATCH
  await prisma.telegramMessage.upsert({
    where: { key: 'select_batch_prompt' },
    update: {},
    create: {
      key: 'select_batch_prompt',
      name: 'Select Batch Prompt',
      category: 'ADD_READING',
      description: 'Prompt user to select a batch',
      isActive: true,
      content: '📊 Select batch for new reading:'
    }
  });

  // ADD READING - ENTER LUKU
  await prisma.telegramMessage.upsert({
    where: { key: 'enter_luku_prompt' },
    update: {},
    create: {
      key: 'enter_luku_prompt',
      name: 'Enter Electricity Prompt',
      category: 'ADD_READING',
      description: 'Prompt user to enter electricity reading',
      isActive: true,
      content: `⚡ Enter Electricity reading (kWh):

Example: 1174.66`
    }
  });

  // ADD READING - ENTER HUMIDITY
  await prisma.telegramMessage.upsert({
    where: { key: 'enter_humidity_prompt' },
    update: {},
    create: {
      key: 'enter_humidity_prompt',
      name: 'Enter Humidity Prompt',
      category: 'ADD_READING',
      description: 'Prompt user to enter humidity reading',
      isActive: true,
      content: `💧 Enter Humidity reading (%):

Example: 30.9`
    }
  });

  // ADD READING - ENTER DATE/TIME
  await prisma.telegramMessage.upsert({
    where: { key: 'enter_datetime_prompt' },
    update: {},
    create: {
      key: 'enter_datetime_prompt',
      name: 'Enter Date/Time Prompt',
      category: 'ADD_READING',
      description: 'Prompt user to enter date and time',
      isActive: true,
      content: `📅 Enter Date and Time:

Format: MM/DD/YYYY HH:MM
Example: 12/09/2025 16:02`
    }
  });

  // ADD READING - CONFIRMATION
  await prisma.telegramMessage.upsert({
    where: { key: 'reading_confirmation' },
    update: {},
    create: {
      key: 'reading_confirmation',
      name: 'Reading Confirmation',
      category: 'ADD_READING',
      description: 'Confirmation message with all entered values',
      isActive: true,
      content: `📊 Confirm Reading

━━━━━━━━━━━━━━━━━━━━
Batch: {batchNumber}
⚡ Electricity: {electricity} kWh
💧 Humidity: {humidity}%
📅 Date/Time: {datetime}
━━━━━━━━━━━━━━━━━━━━

Is this correct?`
    }
  });

  // ADD READING - SAVING
  await prisma.telegramMessage.upsert({
    where: { key: 'saving_reading' },
    update: {},
    create: {
      key: 'saving_reading',
      name: 'Saving Reading Message',
      category: 'ADD_READING',
      description: 'Shown while saving the reading',
      isActive: true,
      content: '💾 Saving reading...'
    }
  });

  // ADD READING - SUCCESS
  await prisma.telegramMessage.upsert({
    where: { key: 'reading_saved_success' },
    update: {},
    create: {
      key: 'reading_saved_success',
      name: 'Reading Saved Successfully',
      category: 'ADD_READING',
      description: 'Success message after saving reading',
      isActive: true,
      content: `✅ Reading saved successfully!

Batch: {batchNumber}
⚡ Electricity: {electricity} kWh
💧 Humidity: {humidity}%
📅 Time: {datetime}

Type /menu to add more readings or view processes.`
    }
  });

  // ADD READING - CANCELLED
  await prisma.telegramMessage.upsert({
    where: { key: 'reading_cancelled' },
    update: {},
    create: {
      key: 'reading_cancelled',
      name: 'Reading Cancelled',
      category: 'ADD_READING',
      description: 'Shown when user cancels reading entry',
      isActive: true,
      content: '❌ Reading cancelled. Type /menu to start again.'
    }
  });

  // ERRORS - INVALID NUMBER
  await prisma.telegramMessage.upsert({
    where: { key: 'error_invalid_number' },
    update: {},
    create: {
      key: 'error_invalid_number',
      name: 'Error: Invalid Number',
      category: 'ERRORS',
      description: 'Shown when user enters invalid number',
      isActive: true,
      content: '[ERROR] Invalid number. Please enter a valid reading (e.g., 15.5)'
    }
  });

  // ERRORS - INVALID KWH
  await prisma.telegramMessage.upsert({
    where: { key: 'error_invalid_kwh' },
    update: {},
    create: {
      key: 'error_invalid_kwh',
      name: 'Error: Invalid kWh',
      category: 'ERRORS',
      description: 'Shown when electricity value is out of range',
      isActive: true,
      content: '[ERROR] Invalid kWh reading. Must be between 0-999999'
    }
  });

  // ERRORS - INVALID HUMIDITY
  await prisma.telegramMessage.upsert({
    where: { key: 'error_invalid_humidity' },
    update: {},
    create: {
      key: 'error_invalid_humidity',
      name: 'Error: Invalid Humidity',
      category: 'ERRORS',
      description: 'Shown when humidity value is out of range',
      isActive: true,
      content: '[ERROR] Humidity must be between 0-100%'
    }
  });

  // ERRORS - INVALID DATE FORMAT
  await prisma.telegramMessage.upsert({
    where: { key: 'error_invalid_date_format' },
    update: {},
    create: {
      key: 'error_invalid_date_format',
      name: 'Error: Invalid Date Format',
      category: 'ERRORS',
      description: 'Shown when date format is incorrect',
      isActive: true,
      content: `[ERROR] Invalid date format. Please use: MM/DD/YYYY HH:MM

Example: 12/09/2025 16:02`
    }
  });

  // ERRORS - INVALID DATE
  await prisma.telegramMessage.upsert({
    where: { key: 'error_invalid_date' },
    update: {},
    create: {
      key: 'error_invalid_date',
      name: 'Error: Invalid Date',
      category: 'ERRORS',
      description: 'Shown when date is invalid',
      isActive: true,
      content: '[ERROR] Invalid date. Please try again.'
    }
  });

  // ERRORS - SAVE FAILED
  await prisma.telegramMessage.upsert({
    where: { key: 'error_save_failed' },
    update: {},
    create: {
      key: 'error_save_failed',
      name: 'Error: Failed to Save',
      category: 'ERRORS',
      description: 'Shown when saving reading fails',
      isActive: true,
      content: '[ERROR] Failed to save reading: {errorMessage}'
    }
  });

  // ERRORS - SESSION EXPIRED
  await prisma.telegramMessage.upsert({
    where: { key: 'error_session_expired' },
    update: {},
    create: {
      key: 'error_session_expired',
      name: 'Error: Session Expired',
      category: 'ERRORS',
      description: 'Shown when user session has expired',
      isActive: true,
      content: '[ERROR] Session expired. Please start again by clicking "Add Reading".'
    }
  });

  // ERRORS - GENERAL ERROR
  await prisma.telegramMessage.upsert({
    where: { key: 'error_general' },
    update: {},
    create: {
      key: 'error_general',
      name: 'Error: General',
      category: 'ERRORS',
      description: 'Generic error message',
      isActive: true,
      content: '[ERROR] Error processing input. Please try again.'
    }
  });

  // ERRORS - MENU ERROR
  await prisma.telegramMessage.upsert({
    where: { key: 'error_menu_load' },
    update: {},
    create: {
      key: 'error_menu_load',
      name: 'Error: Menu Load Failed',
      category: 'ERRORS',
      description: 'Shown when menu fails to load',
      isActive: true,
      content: '[ERROR] Error loading menu. Please try again later.'
    }
  });

  console.log('✅ Telegram messages seeded successfully!');
  console.log('📝 Total messages: 24');
  console.log('\nCategories:');
  console.log('  - COMMANDS: 2 messages');
  console.log('  - MENU: 3 messages');
  console.log('  - ADD_READING: 8 messages');
  console.log('  - ERRORS: 11 messages');
}

main()
  .catch((e) => {
    console.error('Error seeding messages:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
