import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const OLLAMA_HOST = process.env.OLLAMA_HOST || 'http://localhost:11434';
const MODEL = 'gemma4:e2b'; // Quantized model for Raspberry Pi 5

const SYSTEM_PROMPT = `You are Hermes, a highly intelligent and proactive personal assistant.
Your goal is to help the user manage their life, notes, and reminders.

### MANDATORY COMMAND FORMAT
To perform any action in the database, you MUST include the corresponding command tag in your response. If you don't include the tag, the action will NOT happen.

1. SAVE NOTE: [SAVE_NOTE: content]
2. DELETE NOTE: [DELETE_NOTE: note_id] (Get ID from CURRENT CONTEXT)
3. SET REMINDER: [SET_REMINDER: content, ISO_TIMESTAMP]
4. SEARCH WEB: [SEARCH: query]

### CRITICAL RULES:
- ALWAYS prioritize information in "CURRENT CONTEXT". If a note is listed there, it exists.
- To delete a note, look for its ID in the context (e.g., "[ID: 5]") and use [DELETE_NOTE: 5].
- DO NOT just tell the user you deleted/saved something. You MUST include the tag.
- If you don't see the note in the context, tell the user you can't find it.
- Be concise.

### EXAMPLES:
User: Delete my "buy milk" note.
Context: 1. [ID: 4] - buy milk
Assistant: I've deleted that note for you. [DELETE_NOTE: 4]

User: Remind me to call Mom tomorrow at 10am.
Assistant: Sure, I'll remind you tomorrow at 10:00 AM. [SET_REMINDER: Call Mom, 2026-04-28T10:00:00Z]
`;

export async function generateResponse(prompt: string, history: { role: string, content: string }[]) {
  const fullPrompt = `${SYSTEM_PROMPT}\n\n` + history.map(h => `${h.role}: ${h.content}`).join('\n') + `\nuser: ${prompt}\nassistant: `;

  console.log('--- SENDING PROMPT TO AI (NON-STREAM) ---');
  console.log(fullPrompt);
  console.log('--- END PROMPT ---');

  try {
    const response = await axios.post(`${OLLAMA_HOST}/api/generate`, {
      model: MODEL,
      prompt: fullPrompt,
      stream: false
    });

    return response.data.response;
  } catch (error) {
    console.error('Error generating AI response:', error);
    return 'Sorry, I am having trouble thinking right now.';
  }
}

export async function* generateResponseStream(prompt: string, history: { role: string, content: string }[], context?: string) {
  let contextSection = '';
  if (context) {
    contextSection = `\n\nCURRENT CONTEXT:\n${context}\n`;
  }

  const now = new Date().toLocaleString();
  const fullPrompt = `${SYSTEM_PROMPT}\n\nCURRENT TIME: ${now}${contextSection}\n\n` + history.map(h => `${h.role}: ${h.content}`).join('\n') + `\nuser: ${prompt}\nassistant: `;

  console.log('--- SENDING PROMPT TO AI ---');
  console.log(fullPrompt);
  console.log('--- END PROMPT ---');

  try {
    const response = await axios.post(`${OLLAMA_HOST}/api/generate`, {
      model: MODEL,
      prompt: fullPrompt,
      stream: true
    }, { responseType: 'stream' });

    let buffer = '';
    for await (const chunk of response.data) {
      buffer += chunk.toString();
      const lines = buffer.split('\n');

      // Keep the last partial line in the buffer
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const parsed = JSON.parse(line);
          if (parsed.response) yield parsed.response;
        } catch (e) {
          console.error('Error parsing JSON line:', line, e);
        }
      }
    }
  } catch (error) {
    console.error('Error in AI stream:', error);
    yield 'Error generating response.';
  }
}
