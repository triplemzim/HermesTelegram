## Context

The user wants a lightweight, self-hosted AI personal assistant deployed on a Raspberry Pi 5 (8GB RAM). It needs to run a local LLM (like Google's Gemma) using Hermes, have a Telegram bot interface for remote access, maintain conversational context, perform web automation/crawling, and manage notes, reminders, and automated tasks. Additionally, it must automate a Facebook page with trend-based posts every 4 hours. The entire setup must be containerized (Docker) for easy deployment.

## Goals / Non-Goals

**Goals:**
- Provide a functional Telegram bot that communicates with a local AI model.
- Containerize all components using Docker for a single-command setup on a Raspberry Pi 5.
- Implement persistent memory/context for conversations.
- Enable basic tool use for the AI: web browsing/crawling, note-taking, and task scheduling.
- Automate a Facebook page with scheduled posts every 4 hours based on trend analysis.

**Non-Goals:**
- Supporting high-resource models that exceed the 8GB RAM constraint of the Raspberry Pi 5.
- Complex multi-user authentication (designed as a personal assistant).
- Real-time video/audio processing.

## Decisions

- **AI Runtime:** Use a highly optimized inference engine like Ollama or llama.cpp within Hermes to run lightweight models like Gemma 2B or 7B, ensuring it fits within the Pi 5's memory.
- **Bot Framework:** Use a standard Telegram Bot API library (e.g., node-telegram-bot-api or python-telegram-bot).
- **Context Storage:** Use a lightweight embedded database like SQLite to store chat history, notes, and reminders without the overhead of a separate DB server container.
- **Browser Automation:** Use Puppeteer or Playwright with a headless Chromium build optimized for ARM64/Raspberry Pi.
- **Task Scheduling:** Use a library like `node-cron` or APScheduler to manage reminders and triggered tasks natively within the bot application, including the 4-hour Facebook post schedule.
- **Facebook Integration:** Use the official Facebook Graph API to publish posts. The AI model will generate content by analyzing current trends relevant to the page topic via the web crawler.
- **Deployment:** A single `docker-compose.yml` defining the bot service and the model inference service, mapping necessary volumes for persistent SQLite storage.

## Risks / Trade-offs

- **Risk: Out of Memory (OOM) on Pi 5.** → Mitigation: Limit context window size, use quantized (e.g., 4-bit) models, and configure swap space.
- **Risk: High latency for AI responses.** → Mitigation: Keep the user informed with "typing..." indicators in Telegram; optimize prompt engineering to reduce generation tokens.
- **Risk: Browser automation overhead.** → Mitigation: Run headless browser instances only when necessary and terminate them immediately after task completion.
- **Risk: Facebook API rate limits/bans.** → Mitigation: Ensure post frequency adheres to FB policies (every 4 hours is generally safe) and generated content is high quality.