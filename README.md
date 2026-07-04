# Sarathi: Sovereign Indic AI Copilot

Sarathi is a production-ready, serverless-optimized artificial intelligence copilot designed specifically for rural Indian environments, focusing on localized Education (Shiksha Mode) and Healthcare (Arogya Mode). Built to run natively in serverless cloud environments like Vercel, the application operates entirely within strict memory constraints by utilizing cloud-based vector databases, low-latency large language model (LLM) inference engines, and real-time voice processing application programming interfaces (APIs).

---

## Why Sarathi? (Product Strategy)

Sarathi addresses structural accessibility barriers in rural India through a multi-tiered deployment approach:

### 1. Teacher-in-the-Loop Smart Classrooms
In rural public schools, teachers use Sarathi on smart TVs and tablets as an instructional aide. It allows teachers to explain complex science and mathematical concepts to classrooms of over 50 students by simplifying textbook contents using localized, regional analogies.

### 2. Evening Homework Assistant
Outside school hours, students access the system via their parents' mobile phones. Because text typing is a major digital literacy barrier for parents and young children, Sarathi features a voice-first interface, allowing users to ask questions verbally and receive synthesized spoken answers in their native dialects.

### 3. Future Scalability (WhatsApp & IVR)
The architecture is designed to support omni-channel scale. The backend services expose modular, stateless API endpoints that can be integrated directly with WhatsApp business bots or Interactive Voice Response (IVR) telephony lines. This guarantees that users without smartphones can query the knowledge bases using standard feature phones.

---

## UI/UX and Safety Philosophy

### 1. Voice-First Accessibility
The interface prioritizes speech interaction. A large, prominent Floating Action Button (FAB) at the bottom center of the screen acts as the primary touch target. It provides tactile recording feedback, encouraging voice query submission.

### 2. Indic-Inspired Dynamic Theming
The design system dynamically alters the visual theme based on the active mode:
* Shiksha (Education) Mode: Uses warm orange tones representing educational focus, heritage, and warmth.
* Arogya (Healthcare) Mode: Transition to clinical teal and indigo tones to establish an atmosphere of trust, safety, and clinical calm.

### 3. Non-Diagnostic Medical Safety Guardrails
In Arogya mode, the assistant functions as an ASHA worker copilot rather than a replacement for clinical professionals. The system prompt engineering enforces a non-diagnostic safety boundary. The LLM simplifies medical terms and clinical discharge summaries, but is blocked from diagnosing conditions, prescribing therapies, or recommending drug dosages. Every healthcare output contains a mandatory safety disclaimer directing patients to a qualified medical practitioner.

---

## Technical Architecture and Stack

### Core Technology Stack
* LLM Inference: LLaMA 3 models accessed via the Groq Cloud SDK (ChatGroq).
* Embeddings: Pinecone Serverless inference hosting the multilingual-e5-large model (1024 dimensions).
* Vector Storage: Pinecone Serverless cloud vector database.
* Voice Translation: Sarvam AI Saaras v3 REST API for speech transcription.
* Voice Synthesis: Sarvam AI Bulbul v3 REST API for text-to-speech WAV rendering.
* Web Backend: FastAPI (Python 3.11) with HTTPX for asynchronous third-party request handling.
* Web Frontend: React.js (Vite compiler) styled with utility-first Tailwind CSS.

### File Orchestration
* `vercel.json`: Handles edge configuration, routing all API requests under `/api/*` to the serverless backend, and serving the static React app.
* `api/index.py`: Serverless endpoint router handling in-memory PDF parsing, Pinecone vector ingestion, ChatGroq LLM RAG queries, and Sarvam REST connections.
* `api/rag_engine.py`: Encapsulates PDF chunking (RecursiveCharacterTextSplitter) and vector upload.
* `src/App.jsx`: Renders the single-page application, handling state-based CSS variables for dynamic themer swaps and web-audio recording streams.

---

## Environment Variables Configuration

To run the application, configure the following keys in your local environment or within your Vercel deployment console:

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

---

## Local Development and Verification

### Manual Service Execution

#### 1. Setup Web Server
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

#### 2. Run React App
1. Open a new terminal and move to the frontend folder:
   ```bash
   cd frontend
   ```
2. Install npm packages:
   ```bash
   npm install
   ```
3. Boot the development compiler:
   ```bash
   npm run dev
   ```
