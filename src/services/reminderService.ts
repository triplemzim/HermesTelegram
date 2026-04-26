import { getDb } from '../database/db.js';

export async function addReminder(chatId: number, content: string, dueAt: string) {
  const db = await getDb();
  await db.run(
    'INSERT INTO reminders (chat_id, content, due_at) VALUES (?, ?, ?)',
    [chatId, content, dueAt]
  );
}
