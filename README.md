# Sarathi: Sovereign Indic AI Copilot

Sarathi is a production-ready, serverless-optimized artificial intelligence copilot designed specifically for rural Indian environments, focusing on localized Education (Shiksha Mode) and Healthcare (Arogya Mode). Built to run natively in serverless cloud environments like Vercel, the application operates entirely within strict memory constraints by utilizing cloud-based vector databases, low-latency large language model (LLM) inference engines, and real-time voice processing application programming interfaces (APIs).

---

## Live Demo

To explore the live production instance of the application, navigate to the following link:

[https://sarathi-sovereign-indic-ai-copilot.vercel.app/](https://sarathi-sovereign-indic-ai-copilot.vercel.app/)

---

## Live Application

The production application is synced directly from the main branch on GitHub to Vercel, enabling automatic CI/CD deployment. The application features two view states:
* Landing Page: A public marketing and architectural overview.
* Chat Workspace: A workspace for uploading documents, selecting Indic languages, and engaging with the voice-first context-bound copilot.

---

## Screenshots

The following sections illustrate the user interface design:

### 1. Dual Dedicated Environments Selection
The interactive landing page selector allows users to toggle between Shiksha (Education) and Arogya (Healthcare) modes to preview typical regional speech transactions.
![Dual Environments Preview](docs/screenshots/landing_modes.png)

### 2. Sovereign RAG Flow Visualization
A structured 4-step execution flow detailing voice input, translation, vector match, and final synthesis.
![Sovereign RAG Flow](docs/screenshots/landing_rag_flow.png)

### 3. Voice-First Chat Workspace
The distraction-free chat interface with dynamic Sandalwood or Teal theming depending on the active mode, complete with document upload and voice-to-voice indicators.
![Chat Workspace Interface](docs/screenshots/workspace_chat.png)

---

## Architecture

Sarathi implements a dual-view single-page application architecture backed by a lightweight serverless FastAPI execution environment. 

### Core Workflow
1. Ingestion: The user uploads a source document (e.g., school textbook or clinical report). The backend parses the PDF and splits the text into chunks using recursive character partitioning.
2. Indexing: The text chunks are embedded via a multilingual embedding model and indexed in Pinecone Serverless.
3. Query Phase: The user submits a question using regional voice input (Kannada, Hindi, etc.). The voice is transcribed into text using Sarvam's speech-to-text API (Saaras v3) and translated to English.
4. Retrieval: The translated English query is matched against the Pinecone index.
5. Strict Generation: If relevant contexts are found, they are injected into a strict system prompt. If no relevant contexts are retrieved, the LLM bypasses internal knowledge and returns a translated refusal message.
6. Speech Synthesis: The synthesized response is translated back into the user's native Indic script and read aloud via Sarvam's text-to-speech engine (Bulbul v3).

---

## Features

* Strict retrieval-augmented generation (RAG): Bypasses LLM internal knowledge to restrict responses strictly to the context of the uploaded document, eliminating hallucinations.
* Dual domain-specific modes:
  * Shiksha Mode: Promotes classroom-friendly instruction using localized analogies.
  * Arogya Mode: Simplifies complex clinical documents without attempting self-diagnosis.
* Voice-First accessibility: Integrates voice recording waves and live speech feedback for low-literacy users.
* Dynamic theming: Automatically adjusts colors, buttons, and visual cues between Indian Sandalwood (Education) and Indigo/Teal (Healthcare) states.
* Cross-lingual indexing: Translates regional language speech queries to English for precise vector search operations.

---

## Tech Stack

* Frontend: React.js, Tailwind CSS, Lucide React, Vite.
* Backend: FastAPI (Python 3.11), PyPDF, HTTPX.
* LLM: LLaMA 3 via Groq Cloud SDK.
* Vector DB: Pinecone Serverless (multilingual-e5-large index).
* Speech APIs: Sarvam AI Saaras v3 (STT) and Bulbul v3 (TTS).

---

## Deployment

### Environment Variables
Configure the following keys in your local environment or within your Vercel deployment console:

```env
# Vector Database Credentials
PINECONE_API_KEY=your_pinecone_api_key
PINECONE_INDEX_NAME=sarathi-db

# Large Language Model Settings
GROQ_API_KEY=your_groq_api_key
LLM_MODEL=llama3-8b-8192

# Sarvam Voice API Key
SARVAM_API_KEY=your_sarvam_api_key
```

### Local Development Setup

#### 1. Setup Backend Server
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Create and run a python virtual environment:
   ```bash
   python -m venv .venv
   source .venv/bin/activate # On Windows use: .venv\Scripts\activate
   ```
3. Install packages:
   ```bash
   pip install -r requirements.txt
   ```
4. Start the FastAPI ASGI server:
   ```bash
   python main.py
   ```

#### 2. Setup Frontend Application
1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```
