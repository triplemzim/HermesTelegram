import { getDb } from '../database/db.js';

export async function addMessage(chatId: number, role: 'user' | 'assistant', content: string) {
  const db = await getDb();
  await db.run(
    'INSERT INTO messages (chat_id, role, content) VALUES (?, ?, ?)',
    [chatId, role, content]
  );
}

export async function getHistory(chatId: number, limit: number = 20) {
  const db = await getDb();
  const messages = await db.all(
    'SELECT role, content FROM messages WHERE chat_id = ? ORDER BY timestamp DESC LIMIT ?',
    [chatId, limit]
  );
  return messages.reverse(); // Ensure chronological order (oldest to newest)
}

export async function clearHistory(chatId: number) {
  const db = await getDb();
  await db.run('DELETE FROM messages WHERE chat_id = ?', [chatId]);
  await db.run('DELETE FROM ai_sessions WHERE chat_id = ?', [chatId]);
}

export async function getSessionId(chatId: number): Promise<string | null> {
  const db = await getDb();
  const session = await db.get('SELECT session_id FROM ai_sessions WHERE chat_id = ?', [chatId]);
  return session?.session_id || null;
}

export async function setSessionId(chatId: number, sessionId: string) {
  const db = await getDb();
  await db.run(
    'INSERT OR REPLACE INTO ai_sessions (chat_id, session_id, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)',
    [chatId, sessionId]
  );
}
