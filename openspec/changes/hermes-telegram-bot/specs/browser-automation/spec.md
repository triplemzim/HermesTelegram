## ADDED Requirements

### Requirement: Web Browsing
The system SHALL provide a tool for the AI model to fetch content from a given URL using a headless browser.

#### Scenario: Fetching a webpage
- **WHEN** the AI model decides to browse a URL to answer a user's question
- **THEN** the system opens a headless browser, navigates to the URL, extracts the text content, and provides it to the model

### Requirement: Web Crawling
The system SHALL allow the AI model to perform basic web searches or follow links to gather information.

#### Scenario: Performing a search
- **WHEN** the user asks about recent news
- **THEN** the system can execute a search query via the browser, read the results, and summarize them for the user