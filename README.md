# Sarathi: Sovereign Indic AI Copilot

Sarathi is a production-grade sovereign AI copilot proof-of-concept focusing on Indian languages, Education, and Healthcare. It features a dual-mode interaction framework that acts as a government school teacher for textbook explanation (Education Mode) or an empathetic clinical assistant for document simplification (Healthcare Mode).

The application integrates retrieval-augmented generation (RAG) using a local vector database, speech-to-text, text-to-speech placeholders, and a modern React interface.

---

## Technical Stack

### Frontend
* React.js (Vite build toolchain)
* Tailwind CSS (Utility-first styling)
* Lucide React (Icon assets)

### Backend
* Python 3.10
* FastAPI (Asynchronous web frame)
* PyPDF (PDF text extraction)
* Uvicorn (ASGI server implementation)

### AI and RAG Orchestration
* LangChain (LLM and retriever chains)
* ChromaDB (Local persistent vector database)
* Sentence-Transformers (Local embedding model: all-MiniLM-L6-v2)
* LangChain-OpenAI (Compatible client for Groq / OpenAI LLM APIs)

### DevOps and Deployment
* Docker (Containerization engine)
* Docker Compose (Multi-container orchestration)

---

## Repository Structure

```
├── backend/
│   ├── chroma_db/          # Persistent Chroma DB storage (Git ignored)
│   ├── temp_uploads/       # Temporary folder for PDF processing (Git ignored)
│   ├── Dockerfile          # Python backend build instructions
│   ├── main.py             # FastAPI router, models, and endpoints
│   ├── rag_engine.py       # Text extraction, chunking, retrieval and prompts
│   ├── requirements.txt    # Python library dependencies
│   └── .env.example        # Reference environment variables
├── frontend/
│   ├── src/
│   │   ├── App.jsx         # Main application UI and logic
│   │   ├── index.css       # Tailwind entry and custom styling
│   │   └── main.jsx        # React root registration
│   ├── Dockerfile          # Node.js frontend build instructions
│   ├── index.html          # Web page entry template
│   ├── package.json        # Frontend project dependencies
│   ├── postcss.config.js   # PostCSS configuration
│   ├── tailwind.config.js  # Tailwind custom styles and colors
│   └── vite.config.js      # Vite compilation parameters
├── docker-compose.yml      # Multi-service build and run configurations
└── .gitignore              # Files excluded from git version control
```

---

## Mode Persona and Prompt Design

The core of Sarathi's utility is governed by strict Prompt Engineering settings configured in `backend/rag_engine.py`:

### 1. Education Mode
Instructs the LLM to behave like a helpful, encouraging Indian government school teacher. It uses simple analogies, localized examples (village life, farming, simple household activities), and breaks down textbook topics step-by-step.

### 2. Healthcare Mode
Instructs the LLM to act as a warm, reassuring clinical navigator. It translates medical terminology into layman's terms. Importantly, it enforces safety rules: it must never diagnose, prescribe, or recommend specific drugs, and must direct patients to real doctors for diagnostic decisions.

### 3. Multi-lingual Synthesis
Instructs the model to output responses entirely in the selected Indic language (such as Kannada, Hindi, Tamil, Telugu, Malayalam, Marathi) using the correct native script.

---

## API Endpoints Walkthrough

* **POST /upload**: Receives an uploaded PDF file, saves it to a secure temporary path, extracts raw text, breaks text into 1,000-character chunks with a 200-character overlap, inserts embeddings into ChromaDB, and deletes the temporary file.
* **POST /chat**: Accepts a JSON payload containing the user's message, current mode (Education/Healthcare), and output language. It queries ChromaDB to retrieve matching context and passes it along with the mode-specific system instructions to the LLM.
* **POST /stt**: Accepts an audio file upload and returns transcribed text. Currently configured as a mock endpoint, it receives the media stream directly from the browser's mic recording.
* **POST /tts**: Accepts text and language parameters. It dynamically compiles a 1-second WAV audio file containing a 440Hz sine wave and returns a binary audio stream. The React frontend reads this response directly and plays it in the browser.

---

## Local Setup and Installation

Follow either of the two installation methods below.

### Method 1: Using Docker Compose (Recommended)

This method packages the entire stack and runs both services in container isolation.

1. Clone or navigate to the repository directory:
   ```bash
   cd "Sarathi Sovereign Indic AI Copilot"
   ```

2. Create the environment file:
   Copy the example file to a live `.env` file inside the `backend` folder:
   ```bash
   cp backend/.env.example backend/.env
   ```

3. Configure LLM credentials:
   Open the newly created `backend/.env` file and insert your API credentials (either Groq or OpenAI):
   ```env
   LLM_API_KEY=your_actual_api_key_here
   LLM_API_BASE=https://api.groq.com/openai/v1
   LLM_MODEL=llama3-8b-8192
   ```

4. Build and start the services:
   ```bash
   docker-compose up --build
   ```

5. Access the applications:
   * Frontend Application: http://localhost:5173
   * FastAPI API Documentation: http://localhost:8000/docs

---

### Method 2: Manual Installation (Without Docker)

If you prefer to run the services directly on your host machine:

#### 1. Setup Backend
1. Move to the backend folder:
   ```bash
   cd backend
   ```
2. Create and activate a Python virtual environment:
   ```bash
   python -m venv venv
   # On Windows:
   venv\Scripts\activate
   # On macOS/Linux:
   source venv/bin/activate
   ```
3. Install the dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Copy the environment variables:
   ```bash
   cp .env.example .env
   ```
5. Configure `backend/.env` with your API keys.
6. Run the FastAPI development server:
   ```bash
   python main.py
   ```
   The backend server will run on http://localhost:8000.

#### 2. Setup Frontend
1. Open a new terminal and move to the frontend folder:
   ```bash
   cd frontend
   ```
2. Install Node modules:
   ```bash
   npm install
   ```
3. Start the Vite development server:
   ```bash
   npm run dev
   ```
   The frontend app will launch on http://localhost:5173.

---

## Voice API Integration Guide

To swap the placeholder endpoints for production-grade APIs (such as Sarvam AI's Indic audio models):

### Speech-to-Text (STT) Integration
In `backend/main.py` under the `/stt` route:
1. Capture the uploaded audio file bytes.
2. Send a POST request to the Sarvam Speech-to-Text translation API:
   ```python
   headers = {"api-subscription-key": "your_sarvam_api_key"}
   files = {"file": (file.filename, file.file.read(), file.content_type)}
   # Call Sarvam translation endpoints
   ```
3. Extract the transcribed string from the response and return it in the JSON body.

### Text-to-Speech (TTS) Integration
In `backend/main.py` under the `/tts` route:
1. Capture the synthesized LLM text and chosen Indic language.
2. Request audio synthesis from the Sarvam Text-to-Speech API:
   ```python
   payload = {
       "inputs": [text],
       "target_language_code": "kn-IN", # Translate language string to code (e.g. kn-IN, hi-IN)
       "speaker": "meera"
   }
   ```
3. Stream the raw output audio bytes back to the client as a binary file.
