# Development and Operational Workflows

This document details the operational pipelines and development processes implemented within Sarathi.

---

## Local Development Workflow

To initiate and verify changes locally:

### 1. Backend Ingestion Server
* Environment: Python 3.11 virtual environment.
* Execution command: `python main.py` executed within the backend directory.
* Result: Local ASGI server runs on port 8000. FastAPI interactive documentation is accessible at `/docs`.

### 2. Frontend Development Server
* Environment: Node.js packages compiled via Vite.
* Execution command: `npm run dev` executed within the frontend directory.
* Result: Development server compiles the layout and hosts the single-page application on port 5173.

---

## Document Ingestion Workflow

When a user uploads a document (PDF format) in the chat workspace, the following processing sequence occurs:

```
[User PDF Upload]
       |
[FastAPI Ingestion Endpoint]
       |
[PyPDF Text Extraction]
       |
[RecursiveCharacterTextSplitter] (500 character chunks, 50 character overlap)
       |
[Pinecone Embeddings API] (multilingual-e5-large model)
       |
[Vector Storage in Pinecone Index]
```

1. Ingestion: The backend receives the binary file stream via a multipart form data request.
2. Partitioning: The raw extracted text is split into chunks to fit within the context windows of regional embedding transformers.
3. Vector Upload: The server embeds the chunks and upserts the values to Pinecone, referencing the active user session metadata.

---

## Query and Retrieval Workflow

When a voice-first query is submitted in a regional Indic language, the system executes this pipeline:

```
[Voice Input in Indic Script]
       |
[Sarvam Saaras v3 transcription] -> [Indic Text]
       |
[Translation to English Text]
       |
[Pinecone Index Query] (retrieve top 4 matching document chunks)
       |
[Strict Prompt Construction]
       |
[Groq Cloud ChatGroq Model Evaluation] (LLaMA 3 8B)
       |
[Translation back to Target Indic Script]
       |
[Sarvam Bulbul v3 synthesis] -> [Audio WAV Out]
```

1. Speech to Text: The binary audio file from the browser is sent to the Sarvam Saaras v3 API to yield the transcription.
2. Context Retrieval: The text is queried against Pinecone to locate matching chunks.
3. LLM Inference: The retrieved text chunks are injected as Context. The system prompt commands the LLM to output a direct answer strictly based on the Context, refusing using internal knowledge.
4. Voice Generation: The text answer is translated and sent to Sarvam Bulbul v3 to produce the speech output WAV file, which is streamed to the frontend.

---

## Deployment and CI/CD Workflow

Sarathi utilizes Vercel for serverless production deployments.

1. Version Control: Developers push changes to the main branch on GitHub.
2. Vercel Hook: The push triggers a production deployment hook on Vercel.
3. Build Step: Vercel installs Node.js packages, compiles the React assets via Vite, and configures the API routes specified in the root `vercel.json` file.
4. Serverless Launch: Backend Python code is packaged as individual serverless functions under the `/api` directory.
