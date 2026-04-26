import TelegramBot from 'node-telegram-bot-api';
import dotenv from 'dotenv';
import { initDatabase } from './database/db.js';
import { initScheduler } from './services/scheduler.js';
import * as contextService from './services/contextService.js';
import * as aiService from './services/aiService.js';
import * as notesService from './services/notesService.js';
import * as reminderService from './services/reminderService.js';
import * as browser from './tools/browser.js';

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

// Set bot commands for the context menu
bot.setMyCommands([
  { command: 'start', description: 'Start the bot' },
  { command: 'help', description: 'Show help message' },
  { command: 'clear', description: 'Clear chat context' },
  { command: 'note', description: 'Save a note' },
  { command: 'notes', description: 'Show all saved notes' },
  { command: 'reminders', description: 'Show all reminders' },
  { command: 'remind', description: 'Set a reminder' },
]);

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

// Note command
bot.onText(/\/note(?:\s+(.+))?/, async (msg, match) => {
  const chatId = msg.chat.id;
  const content = match?.[1];
  
  if (!content) {
    bot.sendMessage(chatId, "Sure! What would you like to note down?");
  } else {
    // If they provided content, we still pass it to the AI to "process" it
    // This makes it feel like the AI is doing the work
    const prompt = `The user wants to save this note: "${content}". Confirm it and save it using the [SAVE_NOTE] tag.`;
    const sentMsg = await bot.sendMessage(chatId, '...');
    const history = await contextService.getHistory(chatId);
    let fullResponse = '';
    
    for await (const chunk of aiService.generateResponseStream(prompt, history)) {
      fullResponse += chunk;
    }
    
    const cleanResponse = fullResponse.replace(/\[(SAVE_NOTE|SET_REMINDER):.+?\]/g, '').trim();
    await bot.editMessageText(cleanResponse || fullResponse, {
      chat_id: chatId,
      message_id: sentMsg.message_id
    });

    if (fullResponse.includes('[SAVE_NOTE:')) {
      const saveMatch = fullResponse.match(/\[SAVE_NOTE:\s*(.+?)\]/);
      if (saveMatch?.[1]) {
        await notesService.addNote(chatId, saveMatch[1]);
        await bot.sendMessage(chatId, '✅ Note saved!');
      }
    }
    
    await contextService.addMessage(chatId, 'assistant', fullResponse);
  }
});

// List notes command
bot.onText(/\/notes/, async (msg) => {
  const chatId = msg.chat.id;
  const notes = await notesService.getNotes(chatId);
  
  if (notes.length === 0) {
    bot.sendMessage(chatId, 'You have no saved notes.');
  } else {
    const notesList = notes.map((n, i) => `${i + 1}. ${n.content} (${new Date(n.timestamp).toLocaleDateString()})`).join('\n');
    bot.sendMessage(chatId, `Your notes:\n\n${notesList}`);
  }
});

// List reminders command
bot.onText(/\/reminders/, async (msg) => {
  const chatId = msg.chat.id;
  const reminders = await reminderService.getReminders(chatId);
  
  if (reminders.length === 0) {
    bot.sendMessage(chatId, 'You have no reminders.');
  } else {
    const remindersList = reminders
      .map((r, i) => `${i + 1}. ${r.content} - ${new Date(r.due_at).toLocaleString()} [${r.status}]`)
      .join('\n');
    bot.sendMessage(chatId, `Your reminders:\n\n${remindersList}`);
  }
});

// Remind command
bot.onText(/\/remind (.+) in (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const content = match?.[1];
  const timeStr = match?.[2];
  
  if (content && timeStr) {
    // Simple duration parsing (e.g., "1 hour", "30 minutes")
    const now = new Date();
    let dueAt = new Date();
    
    if (timeStr.includes('hour')) {
      const hours = parseInt(timeStr);
      dueAt.setHours(now.getHours() + hours);
    } else if (timeStr.includes('minute')) {
      const minutes = parseInt(timeStr);
      dueAt.setMinutes(now.getMinutes() + minutes);
    } else if (timeStr.includes('day')) {
      const days = parseInt(timeStr);
      dueAt.setDate(now.getDate() + days);
    } else {
      bot.sendMessage(chatId, 'Sorry, I only understand "X hours", "X minutes", or "X days" for now.');
      return;
    }

    await reminderService.addReminder(chatId, content, dueAt.toISOString());
    bot.sendMessage(chatId, `Reminder set for ${dueAt.toLocaleString()}`);
  }
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

  // Prepare context if message is about notes or reminders
  let context = '';
  const lowercaseText = text.toLowerCase();
  
  if (lowercaseText.includes('note') || lowercaseText.includes('saved')) {
    const notes = await notesService.getNotes(chatId);
    if (notes.length > 0) {
      context += `User's saved notes:\n` + notes.map((n, i) => `${i + 1}. ${n.content}`).join('\n') + '\n';
    }
  }
  
  if (lowercaseText.includes('remind') || lowercaseText.includes('schedule') || lowercaseText.includes('appointment')) {
    const reminders = await reminderService.getReminders(chatId);
    if (reminders.length > 0) {
      context += `User's reminders:\n` + reminders.map((r, i) => `${i + 1}. ${r.content} at ${r.due_at}`).join('\n');
    }
  }

  if (!context) {
    // If we didn't find specific keywords but they are asking a question about "what I have", fetch both
    if (lowercaseText.includes('what') || lowercaseText.includes('show') || lowercaseText.includes('list')) {
        const notes = await notesService.getNotes(chatId);
        const reminders = await reminderService.getReminders(chatId);
        context = `Notes: ${notes.length}, Reminders: ${reminders.length}. Fetching details if needed...`;
    }
  }

  // Send initial message
  const sentMsg = await bot.sendMessage(chatId, '...');
  
  let fullResponse = '';
  let lastUpdate = Date.now();

  try {
    for await (const chunk of aiService.generateResponseStream(text, history, context)) {
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

    // Final update with tags stripped for the user
    const cleanResponse = fullResponse.replace(/\[(SAVE_NOTE|SET_REMINDER|SEARCH):.+?\]/g, '').trim();
    await bot.editMessageText(cleanResponse || fullResponse, {
      chat_id: chatId,
      message_id: sentMsg.message_id
    });

    console.log(`AI Response: ${fullResponse}`);

    // Check for tool tags in the response
    if (fullResponse.includes('[SAVE_NOTE:')) {
      const match = fullResponse.match(/\[SAVE_NOTE:\s*(.+?)\]/);
      if (match?.[1]) {
        await notesService.addNote(chatId, match[1]);
        await bot.sendMessage(chatId, '✅ Note saved to database.');
      }
    } else if (fullResponse.includes('[SET_REMINDER:')) {
      const match = fullResponse.match(/\[SET_REMINDER:\s*(.+?),\s*(.+?)\]/);
      if (match?.[1] && match?.[2]) {
        // Here we could add logic to parse the time, but for now we'll just save it
        // Or we can rely on a simpler format from the AI
        await reminderService.addReminder(chatId, match[1], new Date().toISOString()); 
        await bot.sendMessage(chatId, '✅ Reminder set.');
      }
    }

    // Store assistant response
    await contextService.addMessage(chatId, 'assistant', fullResponse);

    // Check for search tag
    if (fullResponse.includes('[SEARCH:')) {
      const searchMatch = fullResponse.match(/\[SEARCH:\s*(.+?)\]/);
      if (searchMatch?.[1]) {
        const query = searchMatch[1];
        await bot.sendMessage(chatId, `🔍 Searching for: ${query}...`);
        
        const results = await browser.search(query);
        if (results.length > 0 && results[0]) {
          const firstResult = results[0];
          // Extract text from the first result (simplified for now)
          const info = await browser.extractText(firstResult);
          const truncatedInfo = info.substring(0, 1000); // Truncate to avoid context bloat
          
          const searchPrompt = `I found some information for your search "${query}":\n\n${truncatedInfo}\n\nBased on this, please provide a final answer to the user.`;
          
          const followUpMsg = await bot.sendMessage(chatId, 'Thinking...');
          let finalResponse = '';
          
          for await (const chunk of aiService.generateResponseStream(searchPrompt, history)) {
            finalResponse += chunk;
          }
          
          await bot.editMessageText(finalResponse, {
            chat_id: chatId,
            message_id: followUpMsg.message_id
          });
          
          await contextService.addMessage(chatId, 'assistant', finalResponse);
        } else {
          await bot.sendMessage(chatId, "I couldn't find any results for that search.");
        }
      }
    }
  } catch (error) {
    console.error('Error in message handler:', error);
    bot.sendMessage(chatId, 'An error occurred while processing your request.');
  }
});

export default bot;
