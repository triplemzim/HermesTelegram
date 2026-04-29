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

async function runGeminiCli(prompt: string, sessionId?: string | null): Promise<{ content: string, sessionId: string }> {
  return new Promise((resolve) => {
    const args = ['-m', GEMINI_MODEL, '-o', 'stream-json'];
    if (sessionId) {
      args.push('-r', sessionId);
    }
    const child = spawn('gemini', args, { shell: true });
    
    let content = '';
    let newSessionId = sessionId || '';
    let stderr = '';
    
    child.stdout.on('data', (data) => {
      const lines = data.toString().split('\n');
      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const parsed = JSON.parse(line);
          if (parsed.type === 'init' && parsed.session_id) {
            newSessionId = parsed.session_id;
          }
          if (parsed.type === 'message' && parsed.role === 'assistant') {
            content += parsed.content;
          }
        } catch (e) {
          // ignore parsing errors
        }
      }
    });

    child.stderr.on('data', (data) => stderr += data.toString());
    
    child.on('close', (code) => {
      if (code !== 0 && !content) {
        console.error('Gemini CLI error:', stderr);
        resolve({ content: 'Sorry, I am having trouble thinking right now.', sessionId: newSessionId });
      } else {
        resolve({ content: content.trim(), sessionId: newSessionId });
      }
    });

    child.stdin.write(prompt);
    child.stdin.end();
  });
}

export async function generateResponse(prompt: string, history: { role: string, content: string }[], sessionId?: string | null) {
  let contextSection = ''; // Context is usually handled in index.ts for non-stream too? No, usually not passed.
  
  const now = new Date().toLocaleString();
  let fullPrompt: string;
  if (sessionId) {
    fullPrompt = `CURRENT TIME: ${now}\n\nuser: ${prompt}\nassistant: `;
  } else {
    fullPrompt = `${SYSTEM_PROMPT}\n\nCURRENT TIME: ${now}\n\n` + history.map(h => `${h.role}: ${h.content}`).join('\n') + `\nuser: ${prompt}\nassistant: `;
  }

  console.log('--- SENDING PROMPT TO AI (NON-STREAM) ---');
  console.log(fullPrompt);
  console.log('--- END PROMPT ---');

  if (LLM_PROVIDER === 'gemini') {
    return await runGeminiCli(fullPrompt, sessionId);
  }

  try {
    const response = await axios.post(`${OLLAMA_HOST}/api/generate`, {
      model: MODEL,
      prompt: fullPrompt,
      stream: false
    });

    return { content: response.data.response, sessionId: '' };
  } catch (error) {
    console.error('Error generating AI response:', error);
    return { content: 'Sorry, I am having trouble thinking right now.', sessionId: '' };
  }
}

export async function* generateResponseStream(
  prompt: string, 
  history: { role: string, content: string }[], 
  context?: string,
  options?: { sessionId?: string | null, onSessionId?: (id: string) => void }
) {
  let contextSection = '';
  if (context) {
    contextSection = `\n\nCURRENT CONTEXT:\n${context}\n`;
  }

  const now = new Date().toLocaleString();
  
  // If we have a session ID, we don't need to send the full history again
  let fullPrompt: string;
  if (options?.sessionId) {
    fullPrompt = `CURRENT TIME: ${now}${contextSection}\n\nuser: ${prompt}\nassistant: `;
  } else {
    fullPrompt = `${SYSTEM_PROMPT}\n\nCURRENT TIME: ${now}${contextSection}\n\n` + history.map(h => `${h.role}: ${h.content}`).join('\n') + `\nuser: ${prompt}\nassistant: `;
  }

  console.log('--- SENDING PROMPT TO AI ---');
  console.log(fullPrompt);
  console.log('--- END PROMPT ---');

  if (LLM_PROVIDER === 'gemini') {
    const args = ['-m', GEMINI_MODEL, '-o', 'stream-json'];
    if (options?.sessionId) {
      console.log(`[Gemini CLI] Resuming session: ${options.sessionId}`);
      args.push('-r', options.sessionId);
    } else {
      console.log(`[Gemini CLI] Starting new session with model: ${GEMINI_MODEL}`);
    }

    const child = spawn('gemini', args, { shell: true });
    
    // Log stderr for debugging
    child.stderr.on('data', (data) => {
      console.error(`[Gemini CLI stderr]: ${data.toString()}`);
    });

    // Write prompt to stdin
    child.stdin.write(fullPrompt);
    child.stdin.end();

    let buffer = '';

    for await (const chunk of child.stdout) {
      const rawChunk = chunk.toString();
      buffer += rawChunk;
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const parsed = JSON.parse(line);
          
          // Capture session ID from init message
          if (parsed.type === 'init' && parsed.session_id) {
            console.log(`[Gemini CLI] Session ID: ${parsed.session_id}`);
            options?.onSessionId?.(parsed.session_id);
          }

          if (parsed.type === 'message' && parsed.role === 'assistant' && parsed.delta) {
            console.log(`[Gemini CLI Chunk]: ${parsed.content}`);
            yield parsed.content;
          }
        } catch (e) {
          // ignore parsing errors for warnings
        }
      }
    }
    console.log('[Gemini CLI] Stream finished');
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
