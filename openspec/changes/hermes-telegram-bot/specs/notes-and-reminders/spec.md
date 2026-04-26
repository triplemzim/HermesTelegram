## ADDED Requirements

### Requirement: Note Taking
The system SHALL allow the user to create, read, update, and delete notes or lists.

#### Scenario: Creating a note
- **WHEN** the user asks the bot to "remember that my flight is at 8 PM"
- **THEN** the bot saves this information as a note and confirms it was saved

### Requirement: Reminders
The system SHALL allow the user to set time-based reminders.

#### Scenario: Setting a reminder
- **WHEN** the user says "remind me to check the oven in 30 minutes"
- **THEN** the system schedules a task to send a Telegram message to the user exactly 30 minutes later

### Requirement: Automated Tasks
The system SHALL execute recurring automated tasks defined by the user.

#### Scenario: Daily summary
- **WHEN** the user sets a daily task to "summarize top tech news at 9 AM"
- **THEN** the system executes the web crawling tool at 9 AM daily and sends the summary to the user