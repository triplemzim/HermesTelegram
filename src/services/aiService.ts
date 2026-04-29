import axios from 'axios';
import dotenv from 'dotenv';
import { spawn } from 'child_process';

dotenv.config();

const OLLAMA_HOST = process.env.OLLAMA_HOST || 'http://localhost:11434';
const LLM_PROVIDER = process.env.LLM_PROVIDER || 'ollama'; // 'ollama' or 'gemini'
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'flash';
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

async function runGeminiCli(prompt: string): Promise<string> {
  return new Promise((resolve) => {
    const child = spawn('gemini', ['-m', GEMINI_MODEL, '-o', 'text'], { shell: true });
    
    let stdout = '';
    let stderr = '';
    
    child.stdout.on('data', (data) => stdout += data.toString());
    child.stderr.on('data', (data) => stderr += data.toString());
    
    child.on('close', (code) => {
      if (code !== 0) {
        console.error('Gemini CLI error:', stderr);
        resolve('Sorry, I am having trouble thinking right now. (Gemini CLI error)');
      } else {
        // Remove standard CLI warnings
        let cleanOutput = stdout
          .replace(/Warning: Windows 10 detected.*?experience\./gi, '')
          .replace(/Warning: 256-color support not detected.*?experience\./gi, '')
          .trim();
        resolve(cleanOutput);
      }
    });

    child.stdin.write(prompt);
    child.stdin.end();
  });
}

export async function generateResponse(prompt: string, history: { role: string, content: string }[]) {
  const fullPrompt = `${SYSTEM_PROMPT}\n\n` + history.map(h => `${h.role}: ${h.content}`).join('\n') + `\nuser: ${prompt}\nassistant: `;

  console.log('--- SENDING PROMPT TO AI (NON-STREAM) ---');
  console.log(fullPrompt);
  console.log('--- END PROMPT ---');

  if (LLM_PROVIDER === 'gemini') {
    return await runGeminiCli(fullPrompt);
  }

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

  if (LLM_PROVIDER === 'gemini') {
    const child = spawn('gemini', ['-m', GEMINI_MODEL, '-o', 'stream-json'], { shell: true });
    
    // Write prompt to stdin
    child.stdin.write(fullPrompt);
    child.stdin.end();

    let buffer = '';

    for await (const chunk of child.stdout) {
      buffer += chunk.toString();
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const parsed = JSON.parse(line);
          if (parsed.type === 'message' && parsed.role === 'assistant' && parsed.delta) {
            yield parsed.content;
          }
        } catch (e) {
          // ignore parsing errors for warnings
        }
      }
    }
    return;
  }

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
