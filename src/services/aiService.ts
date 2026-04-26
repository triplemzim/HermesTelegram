import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const OLLAMA_HOST = process.env.OLLAMA_HOST || 'http://localhost:11434';
const MODEL = 'gemma4:e4b'; // Quantized model for Raspberry Pi 5

const SYSTEM_PROMPT = `You are Hermes, a highly intelligent and proactive personal assistant.
Your goal is to help the user manage their life, notes, and reminders.

CAPABILITIES:
1. Save Notes: Use [SAVE_NOTE: content]
2. Set Reminders: Use [SET_REMINDER: content, ISO_TIMESTAMP]
3. Search Web: Use [SEARCH: query] if you need real-time information (like prices, news, or weather).

GUIDELINES:
- Be concise but friendly.
- If the user says "Remind me tomorrow", you MUST ask "What time tomorrow?" and "What should I remind you about?" if not specified.
- Only use the tags when all information is gathered.

EXAMPLES:
User: Take a note.
Assistant: Sure! What would you like the note to say?
User: Buy milk.
Assistant: I've saved that note for you. [SAVE_NOTE: Buy milk]

User: Remind me about my dentist appointment.
Assistant: Of course! What date and time is your appointment?
User: Tomorrow at 4pm.
Assistant: Noted. I'll remind you tomorrow at 4:00 PM. [SET_REMINDER: Dentist appointment, 2026-04-28T16:00:00Z]

User: What's the price of iPhone 15 in Singapore?
Assistant: Let me check the latest prices for you. [SEARCH: iPhone 15 price Singapore]
`;

export async function generateResponse(prompt: string, history: { role: string, content: string }[]) {
  const fullPrompt = `${SYSTEM_PROMPT}\n\n` + history.map(h => `${h.role}: ${h.content}`).join('\n') + `\nuser: ${prompt}\nassistant: `;

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
