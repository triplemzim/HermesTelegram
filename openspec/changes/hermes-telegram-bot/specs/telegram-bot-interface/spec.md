## ADDED Requirements

### Requirement: Telegram Bot Connection
The system SHALL connect to the Telegram Bot API using a provided bot token and listen for incoming messages.

#### Scenario: Successful connection and message reception
- **WHEN** the application starts with a valid Telegram token
- **THEN** it successfully connects to Telegram and can receive messages from the user

### Requirement: Command Handling
The system SHALL support basic commands like /start, /help, and /clear.

#### Scenario: User sends /start command
- **WHEN** the user sends the /start command
- **THEN** the bot replies with a welcoming message and a brief explanation of its capabilities