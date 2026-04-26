## 1. Setup & Environment

- [x] 1.1 Initialize project structure and dependencies
- [x] 1.2 Add dependencies for Telegram bot, Hermes, SQLite, and cron scheduler
- [x] 1.3 Create `docker-compose.yml` for multi-service setup (bot, AI model, browser)

## 2. Core Bot Interface

- [x] 2.1 Set up Telegram bot connection using API token
- [x] 2.2 Implement `/start`, `/help`, and generic message handlers
- [x] 2.3 Implement `/clear` command to wipe user context

## 3. Database & Context Management

- [x] 3.1 Initialize SQLite database schema for users, messages, notes, and reminders
- [x] 3.2 Implement functions to store and retrieve recent chat history (context window)
- [x] 3.3 Implement functions to perform CRUD operations on notes

## 4. AI Model Integration

- [x] 4.1 Configure Hermes to connect to a local quantized Gemma model
- [x] 4.2 Integrate context retrieval to prepend chat history to AI prompts
- [x] 4.3 Add streaming/chunking of AI responses back to the Telegram bot interface

## 5. Tool Integration: Web & Automation

- [x] 5.1 Integrate Puppeteer/Playwright headless browser wrapper
- [x] 5.2 Implement function for AI to extract text from a provided URL
- [x] 5.3 Implement basic web search crawling function for the AI to call

## 6. Scheduling & Reminders

- [x] 6.1 Set up cron/scheduler to run in the background
- [x] 6.2 Implement logic to parse time and schedule future messages (reminders)
- [x] 6.3 Implement logic for recurring automated tasks (e.g., daily summaries)
- [x] 6.4 Implement 4-hour cron job for Facebook page trend analysis and posting

## 7. Facebook Page Automation

- [x] 7.1 Integrate Facebook Graph API for page publishing
- [x] 7.2 Implement web crawling logic specifically to find latest trends relevant to page topic
- [x] 7.3 Implement prompt template for AI to generate engaging Facebook posts based on trends

## 8. Final Dockerization & Testing

- [x] 8.1 Write `Dockerfile` for the bot, optimizing for Raspberry Pi 5 (ARM64)
- [x] 8.2 Configure Docker volumes for SQLite DB and model weights persistence
- [x] 8.3 Test deployment using `docker-compose up` and verify memory footprint