# Sarathi: Sovereign Indic AI Copilot

Sarathi is a production-ready, serverless-optimized artificial intelligence copilot designed specifically for rural Indian environments, focusing on localized Education (Shiksha Mode) and Healthcare (Arogya Mode). Built to run natively in serverless cloud environments like Vercel, the application operates entirely within strict memory constraints by utilizing cloud-based vector databases, low-latency large language model (LLM) inference engines, and real-time voice processing application programming interfaces (APIs).

---

## Live Demo

To explore the live production instance of the application, navigate to the following link:

[https://sarathi-sovereign-indic-ai-copilot.vercel.app/](https://sarathi-sovereign-indic-ai-copilot.vercel.app/)

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

### Strict Retrieval-Augmented Generation (RAG)
The retrieval system retrieves top matching vector chunks from Pinecone. The system prompt enforces strict context constraints, preventing the LLM from utilizing its internal pre-trained weights if the answer is not explicitly found in the document. When context is unavailable, it returns a localized, pre-configured refusal message, ensuring zero hallucination.

### Domain-Specific Environments
* Shiksha Mode: Configured to support primary school teachers and students. Promotes pedagogical explanation using rural analogies, simple metaphors, and direct local dialect translations.
* Arogya Mode: Designed for ASHA workers and community healthcare helpers. Translates complex medical scripts and lab reports into accessible explanations, while enforcing a safety guardrail that prohibits clinical self-diagnosis or drug prescriptions.

### Voice-First Interface
A prominent voice trigger control utilizing browser audio streams to capture user speech. Visual audio waves provide real-time recording feedback to assist low-literacy users.

### Cross-Lingual Pipeline
The system automatically translates regional speech inputs into English queries for database vector match, then translates the returned document context back into the target Indic script.

### Dynamic Theming System
State-driven colors adapt between Sandalwood orange (representing school heritage and focus) and deep Teal/Indigo (representing clinical calmness, safety, and health).

---

## Tech Stack

### Frontend Architecture
* React: Structured component-based layout management and persistent session state coordination.
* Tailwind CSS: Responsive design layouts, custom keyframe audio wave animations, and themed styling.
* Lucide React: Vector iconography system for clear interface cues.
* Vite: Fast build tool and development server compiler.
* Web Audio API: Browser audio stream ingestion.

### Backend Infrastructure
* FastAPI: Asynchronous, low-overhead REST framework optimized for serverless server deployments.
* PyPDF: Serverless PDF text extractor and parser.
* HTTPX: Asynchronous HTTP client for low-latency calls to external AI APIs.
* Uvicorn: ASGI web server execution.

### Machine Learning and Vectors
* LLaMA 3: LLaMA 3 8B model hosted on Groq Cloud SDK (ChatGroq), achieving sub-second token latency.
* Pinecone Serverless: Distributed cloud vector database hosting the multilingual-e5-large embeddings index for semantically matching queries.

### Audio APIs
* Sarvam Saaras v3: Multilingual speech-to-text REST API for transcribing Indic language voice inputs.
* Sarvam Bulbul v3: Natural sounding text-to-speech engine for regional language voice synthesis.

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
