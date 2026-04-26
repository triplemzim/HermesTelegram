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
  const notes = await db.all('SELECT id, content, timestamp FROM notes WHERE chat_id = ? ORDER BY timestamp DESC', [chatId]);
  console.log(`Fetched ${notes.length} notes for chatId ${chatId}`);
  return notes;
}

export async function deleteNote(chatId: number, noteId: number) {
  console.log(`[Database] Attempting to delete note ID: ${noteId} for chatId: ${chatId}`);
  const db = await getDb();
  const result = await db.run('DELETE FROM notes WHERE id = ? AND chat_id = ?', [noteId, chatId]);
  
  if (result.changes && result.changes > 0) {
    console.log(`[Database] Successfully deleted note ID: ${noteId}. Rows affected: ${result.changes}`);
    return true;
  } else {
    console.log(`[Database] Failed to delete note ID: ${noteId}. Note not found or doesn't belong to chatId.`);
    return false;
  }
}
