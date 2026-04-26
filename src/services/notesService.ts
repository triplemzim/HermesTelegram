import { getDb } from '../database/db.js';

export async function addNote(chatId: number, content: string) {
  const db = await getDb();
  await db.run(
    'INSERT INTO notes (chat_id, content) VALUES (?, ?)',
    [chatId, content]
  );
}

export async function getNotes(chatId: number) {
  const db = await getDb();
  return db.all('SELECT id, content, timestamp FROM notes WHERE chat_id = ? ORDER BY timestamp DESC', [chatId]);
}

export async function deleteNote(chatId: number, noteId: number) {
  const db = await getDb();
  await db.run('DELETE FROM notes WHERE id = ? AND chat_id = ?', [noteId, chatId]);
}
