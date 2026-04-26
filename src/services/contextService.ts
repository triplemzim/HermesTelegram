import { getDb } from '../database/db.js';

export async function addMessage(chatId: number, role: 'user' | 'assistant', content: string) {
  const db = await getDb();
  await db.run(
    'INSERT INTO messages (chat_id, role, content) VALUES (?, ?, ?)',
    [chatId, role, content]
  );
}

export async function getHistory(chatId: number, limit: number = 10) {
  const db = await getDb();
  return db.all(
    'SELECT role, content FROM messages WHERE chat_id = ? ORDER BY timestamp DESC LIMIT ?',
    [chatId, limit]
  );
}

export async function clearHistory(chatId: number) {
  const db = await getDb();
  await db.run('DELETE FROM messages WHERE chat_id = ?', [chatId]);
}
