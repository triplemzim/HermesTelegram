## ADDED Requirements

### Requirement: Context Persistence
The system SHALL store the history of the conversation for each user in a persistent local database.

#### Scenario: Continuing a conversation
- **WHEN** a user asks a follow-up question
- **THEN** the system retrieves recent messages and includes them in the prompt to the AI model

### Requirement: Context Clearing
The system SHALL allow the user to clear their conversational context.

#### Scenario: User clears context
- **WHEN** the user sends the /clear command
- **THEN** the system deletes the conversational history for that user from the database and confirms the action