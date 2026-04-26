import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const OLLAMA_HOST = process.env.OLLAMA_HOST || 'http://localhost:11434';
const MODEL = 'gemma:2b'; // Quantized model for Raspberry Pi 5

export async function generateResponse(prompt: string, history: { role: string, content: string }[]) {
  const fullPrompt = history.map(h => `${h.role}: ${h.content}`).join('\n') + `\nassistant: ${prompt}`;

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

export async function* generateResponseStream(prompt: string, history: { role: string, content: string }[]) {
  const fullPrompt = history.map(h => `${h.role}: ${h.content}`).join('\n') + `\nassistant: ${prompt}`;

  try {
    const response = await axios.post(`${OLLAMA_HOST}/api/generate`, {
      model: MODEL,
      prompt: fullPrompt,
      stream: true
    }, { responseType: 'stream' });

    for await (const chunk of response.data) {
      const lines = chunk.toString().split('\n');
      for (const line of lines) {
        if (!line.trim()) continue;
        const parsed = JSON.parse(line);
        if (parsed.response) yield parsed.response;
      }
    }
  } catch (error) {
    console.error('Error in AI stream:', error);
    yield 'Error generating response.';
  }
}
