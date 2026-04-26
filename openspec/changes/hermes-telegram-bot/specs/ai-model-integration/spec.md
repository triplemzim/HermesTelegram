## ADDED Requirements

### Requirement: Model Inference
The system SHALL use Hermes to prompt a local open-source model (e.g., Gemma) and stream or return the generated response.

#### Scenario: Processing a standard query
- **WHEN** the user sends a general knowledge question
- **THEN** the system queries the local AI model and returns the generated text

### Requirement: Resource constraints
The system SHALL configure the model inference to operate within the 8GB memory limit of the Raspberry Pi 5.

#### Scenario: Model loading
- **WHEN** the application initializes the AI model
- **THEN** it loads a quantized version that consumes less than 6GB of RAM, leaving room for the OS and other services