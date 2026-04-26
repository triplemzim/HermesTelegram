import TelegramBot from 'node-telegram-bot-api';
import dotenv from 'dotenv';
import { initDatabase } from './database/db.js';
import { initScheduler } from './services/scheduler.js';
import * as contextService from './services/contextService.js';
import * as aiService from './services/aiService.js';

dotenv.config();

const token = process.env.TELEGRAM_BOT_TOKEN;

if (!token) {
  console.error('TELEGRAM_BOT_TOKEN is not defined in .env');
  process.exit(1);
}

// Initialize database
initDatabase().catch(console.error);

// Initialize scheduler
initScheduler();

const bot = new TelegramBot(token, { polling: true });

console.log('Bot is running...');

// Start command
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, 'Welcome! I am Hermes, your personal AI assistant. Type /help to see what I can do.');
});

// Help command
bot.onText(/\/help/, (msg) => {
  const chatId = msg.chat.id;
  const helpText = `
Available commands:
/start - Start the bot
/help - Show this help message
/clear - Clear chat context
/note <text> - Save a note
/remind <text> <time> - Set a reminder
  `;
  bot.sendMessage(chatId, helpText);
});

// Clear command
bot.onText(/\/clear/, async (msg) => {
  const chatId = msg.chat.id;
  await contextService.clearHistory(chatId);
  bot.sendMessage(chatId, 'Chat context cleared.');
});

// Generic message handler
bot.on('message', async (msg) => {
  if (msg.text?.startsWith('/') || !msg.text) return;

  const chatId = msg.chat.id;
  const text = msg.text;

  console.log(`Received message from ${chatId}: ${text}`);
  
  // Get history
  const history = await contextService.getHistory(chatId);
  
  // Store user message
  await contextService.addMessage(chatId, 'user', text);

  // Send initial message
  const sentMsg = await bot.sendMessage(chatId, '...');
  
  let fullResponse = '';
  let lastUpdate = Date.now();

  try {
    for await (const chunk of aiService.generateResponseStream(text, history)) {
      fullResponse += chunk;
      
      // Update message every 1 second to avoid Telegram rate limits
      if (Date.now() - lastUpdate > 1000) {
        await bot.editMessageText(fullResponse + '...', {
          chat_id: chatId,
          message_id: sentMsg.message_id
        }).catch(() => {}); // Ignore errors if message content is same
        lastUpdate = Date.now();
      }
    }

    // Final update
    await bot.editMessageText(fullResponse, {
      chat_id: chatId,
      message_id: sentMsg.message_id
    });

    // Store assistant response
    await contextService.addMessage(chatId, 'assistant', fullResponse);
  } catch (error) {
    console.error('Error in message handler:', error);
    bot.sendMessage(chatId, 'An error occurred while processing your request.');
  }
});

export default bot;
