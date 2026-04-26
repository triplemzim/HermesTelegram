import cron from 'node-cron';
import { getDb } from '../database/db.js';
import bot from '../index.js';
import * as aiService from './aiService.js';
import * as facebookService from './facebookService.js';

export function initScheduler() {
  // Check for reminders every minute
  cron.schedule('* * * * *', async () => {
    const db = await getDb();
    const now = new Date().toISOString();
    
    const dueReminders = await db.all(
      "SELECT id, chat_id, content FROM reminders WHERE status = 'pending' AND due_at <= ?",
      [now]
    );

    for (const reminder of dueReminders) {
      await bot.sendMessage(reminder.chat_id, `Reminder: ${reminder.content}`);
      await db.run("UPDATE reminders SET status = 'completed' WHERE id = ?", [reminder.id]);
    }
  });

  // Daily summary at 8:00 AM
  cron.schedule('0 8 * * *', async () => {
    const db = await getDb();
    const users = await db.all("SELECT DISTINCT chat_id FROM messages");
    
    for (const user of users) {
      const history = await db.all(
        "SELECT content FROM messages WHERE chat_id = ? AND timestamp > date('now', '-1 day') AND role = 'user'",
        [user.chat_id]
      );
      
      if (history.length > 0) {
        const prompt = "Please provide a concise summary of my activities and questions from yesterday based on these messages.";
        const summary = await aiService.generateResponse(prompt, history.map(h => ({ role: 'user', content: h.content })));
        await bot.sendMessage(user.chat_id, `Good morning! Here is your summary from yesterday:\n\n${summary}`);
      }
    }
  });

  // Facebook trend analysis and post every 4 hours
  cron.schedule('0 */4 * * *', async () => {
    await facebookService.runTrendAnalysisAndPost('AI & Automation');
  });

  console.log('Scheduler initialized.');
}
