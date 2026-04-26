## ADDED Requirements

### Requirement: Docker Compose Setup
The system SHALL provide a docker-compose.yml file that orchestrates all necessary services.

#### Scenario: Starting the application
- **WHEN** the user runs `docker-compose up -d`
- **THEN** all containers (bot, AI runtime, browser dependencies) start correctly on a Raspberry Pi 5

### Requirement: Persistent Volumes
The system SHALL configure Docker volumes to ensure database and model weights persist across container restarts.

#### Scenario: Restarting the container
- **WHEN** the containers are stopped and started again
- **THEN** the chat history, notes, and downloaded AI models are preserved