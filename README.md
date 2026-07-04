# Sarathi: Sovereign Indic AI Copilot

Sarathi is a production-grade, serverless-ready sovereign AI copilot proof-of-concept designed for Indian languages, Education, and Healthcare. It features a dual-mode interaction framework that acts as a government school teacher for textbook explanation (Education Mode) or an empathetic clinical assistant for simplifying document terminology (Healthcare Mode).

This repository is optimized for serverless deployment on Vercel, utilizing cloud vector index hosting and direct third-party AI APIs to remain completely within serverless memory and disk execution limits.

---

## Technical Stack

### Frontend
* React.js (Vite Build Toolchain)
* Tailwind CSS (Utility-first design system)
* Lucide React (Icon sets)
* HTML5 Media Capture API (In-browser audio recording)

### Backend (Serverless & Docker)
* Python 3.11
* FastAPI (Asynchronous framework)
* PyPDF (In-memory PDF text extraction)
* Uvicorn (ASGI server implementation)
* HTTPX (Asynchronous HTTP client for voice API calls)

### AI and RAG Orchestration
* LangChain (LLM wrappers, document splitting, and retriever orchestration)
* Pinecone Serverless (Cloud vector database hosting)
* Pinecone Embeddings (multilingual-e5-large model via Pinecone serverless inference)
* ChatGroq (High-performance inference engine for LLaMA 3 models)

### DevOps and Deployment
* Vercel (Serverless host environment for SPA and API routes)
* Docker (Containerization engine for local validation)
* Docker Compose (Multi-container orchestration)

---

## Project Structure

```
├── api/
│   ├── index.py            # Vercel Serverless FastAPI entrypoint
│   └── rag_engine.py       # Pinecone and ChatGroq orchestration
├── backend/
│   ├── Dockerfile          # Multi-stage distroless build file for backend container
│   ├── main.py             # FastAPI local development entrypoint
│   ├── rag_engine.py       # Local copy of RAG module
│   ├── requirements.txt    # Python library requirements for local development
│   └── .env.example        # Environment template file
├── frontend/
│   ├── src/
│   │   ├── App.jsx         # Modern Tailwind React workspace
│   │   ├── index.css       # Tailwind setup and styles
│   │   └── main.jsx        # React DOM mount point
│   ├── Dockerfile          # Frontend container configuration
│   ├── package.json        # Node dependency manifest
│   ├── tailwind.config.js  # Color palette and themes
│   └── vite.config.js      # Vite compilation parameters
├── docker-compose.yml      # Local orchestration config
├── vercel.json             # Vercel serverless routing config
├── requirements.txt        # Root-level python dependencies for Vercel builds
└── .gitignore              # Files ignored by git
```

---

## Architecture and Design Decisions

### 1. Zero-Disk In-Memory Processing
Vercel's serverless environment operates with a read-only filesystem. To support file ingestion, the upload API receives PDF documents as multipart file uploads, reads them directly into RAM as bytes, processes them via in-memory ByteIO streams, and extracts text without creating temporary local files.

### 2. Cloud Vector Database and Inference
Local vector stores (such as ChromaDB) require local database writes, and local embedding models (such as SentenceTransformers) load large weights into memory, violating Vercel's 250MB deployment size limit. Sarathi uses Pinecone Serverless to host the vector index in the cloud, utilizing Pinecone's managed multilingual-e5-large inference model for vector embeddings.

### 3. Integrated Voice Capabilities
* Speech-to-Text (STT): Direct integration with Sarvam AI's Saaras v3 REST API transcribes audio captured from the user's microphone.
* Text-to-Speech (TTS): Direct integration with Sarvam AI's Bulbul v3 REST API maps output languages to BCP-47 codes, generates spoken responses, and streams binary audio back to the client.

### 4. Strict Dual-Persona Prompt Enforcement
Prompt configurations in the RAG engine enforce distinct personas:
* Education Mode: Models the behavior of a government school teacher in India using analogies and local examples.
* Healthcare Mode: Models the behavior of an empathetic assistant, explaining medical jargon in simple terms. It includes safety checks to prevent medical diagnosis and directs users to qualified professionals.
* Script Alignment: Outputs translation text directly using the correct Indic script of the language (such as Devanagari for Hindi, Kannada script for Kannada, etc.).

---

## Environment Variables Configuration

To run the application, the following environment variables must be configured in your environment or in a local .env file (placed in the backend directory):

```env
# Database Credentials
PINECONE_API_KEY=your_pinecone_api_key_here
PINECONE_INDEX_NAME=sarathi-db

# Groq LLM Settings
GROQ_API_KEY=your_groq_api_key_here
LLM_MODEL=llama3-8b-8192

# Sarvam Voice API Key
SARVAM_API_KEY=your_sarvam_api_key_here
```

On Vercel, navigate to Project Settings -> Environment Variables and add the above keys.

---

## Local Setup and Running

### Running via Docker Compose

Docker Compose runs the entire stack in isolated container environments.

1. Ensure Docker and Docker Desktop are running on your system.
2. Initialize the environment configuration:
   ```bash
   cp backend/.env.example backend/.env
   ```
3. Update the newly created backend/.env with your actual API keys.
4. Run the build and launch command:
   ```bash
   docker compose up --build
   ```
5. Access the applications:
   * Web Frontend: http://localhost:5173
   * API Documentation: http://localhost:8000/docs
