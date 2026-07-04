# Contributing to Sarathi

We welcome contributions to Sarathi. Please follow these guidelines to ensure a smooth collaboration process.

---

## Code of Conduct

Maintain a professional, respectful, and inclusive environment. Avoid jargon, personal attacks, or disrespectful communications in comments, issues, and pull requests.

---

## Coding Standards

### Frontend Development
* Use functional React components with hooks.
* Maintain clean state management. Avoid global states unless required for workspace coordination.
* Tailwind CSS should be used for responsive layouts. Avoid hardcoded inline styles.
* Ensure all assets and custom components comply with the sandaled and indigo dynamic theme configurations.

### Backend Development
* Backend endpoints must be built using asynchronous FastAPI definitions (use async def for route handlers).
* Ensure HTTPX requests to external API services (Pinecone, Groq, Sarvam) are asynchronous.
* Maintain strict context-bound retrieval boundaries. Do not modify the system prompt rules regarding out-of-context refusal translation.
* Place clear, meaningful logging statements for key operations.

---

## Development Workflow

1. Fork the repository and create your feature branch from the main branch.
2. Verify changes locally by running both the FastAPI backend server and Vite frontend compiler.
3. Keep pull requests focused on a single responsibility or feature.

---

## Commit Guidelines

To maintain a clean and parseable repository history, we enforce a strict commit format.
* Every commit message must consist of exactly two technical words.
* Do not include emojis, punctuation, or extra words.
* Examples of valid commit messages:
  * Setup Backend
  * Refactor Frontend
  * Fix Routing
  * Add Middleware
  * Optimize Ingestion
  * Update Documentation
