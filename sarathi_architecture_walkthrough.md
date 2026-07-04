# Sarathi Sovereign Indic AI Copilot - System Architecture Walkthrough

This document provides a detailed overview of the system architecture, component interaction, and specialized AI workflows implemented in the **Sarathi Sovereign Indic AI Copilot** application.

---

## 1. System Overview

Sarathi is a voice-first, document-augmented (RAG) assistant designed specifically for rural Indian contexts, operating in two modes:
1. 🎓 **Shiksha (Education Mode)**: Designed to act as a supportive, encouraging local teacher explaining concepts using simple rural analogies.
2. ⚕️ **Arogya (Healthcare Mode)**: Designed to act as a reassuring ASHA worker explaining medical/clinical reports in simple terms, strictly avoiding self-diagnosis or prescriptions.

```mermaid
graph TD
    User([User Speech / Text]) --> UI[React Frontend App.jsx]
    UI --> STT{Speech Input}
    STT -->|WebSpeech API| LocalSTT[Native Browser Recognition]
    STT -->|Audio Blob Fallback| ServerSTT[Sarvam STT /api/stt]
    LocalSTT --> InputReview[Input Review & Edit Area]
    ServerSTT --> InputReview
    InputReview -->|Send Query| ChatEndpoint[/api/chat]
    ChatEndpoint --> RAGEngine[RAG Engine query_rag_system]
```

---

## 2. Core Functional Modules

### A. State Decoupling & Mode Switching
To keep Education and Healthcare sessions clean and separated:
- **Independent History States**: `shikshaMessages` and `arogyaMessages` are managed as separate states in `App.jsx`.
- **Computed Message Feed**: The active message feed list is computed dynamically depending on the current mode selection:
  ```javascript
  const messages = mode === "education" ? shikshaMessages : arogyaMessages;
  ```
- **Context Preservation**: Swapping modes switches the rendering stack instantly without causing cross-contamination of LLM memory or message histories.

---

### B. Voice-First Interaction (STT)
Rural users rely primarily on voice interaction. Sarathi implements a **hybrid STT workflow**:
1. **Streaming Speech Recognition**: Uses the native browser `SpeechRecognition` API (Web Speech API) for real-time, low-latency, zero-cost transcription directly in the UI.
2. **Review & Edit Flow**: Transcription populates the input textarea in real-time, allowing users to pause, review, manually edit typos, and click send when ready.
3. **Backup Audio Ingestion**: If Web Speech API is unsupported (e.g., Safari or certain mobile browsers), a fallback `MediaRecorder` captures audio bytes into a `.wav` blob, sending it to the `/api/stt` endpoint powered by **Sarvam AI's Saaras v3** model.

---

### C. Strict RAG & Translation Engine
The Vector Database index (`multilingual-e5-large` on Pinecone) contains document chunks in English. To ensure accurate searching and prevent the LLM from fabricating information, the following sequence is executed:

```
[User Query in Kannada] 
       │
       ▼ (LLM Translation)
[Query Translated to English]
       │
       ▼ (Pinecone Search: k=4 Chunks)
[English Source Context Chunks]
       │
       ▼ (LLM Ingestion & Synthesis)
[Strict RAG Persona Prompt Execution]
       │
       ▼ (Translation to Kannada Script)
[Final Kannada Response / Refusal]
```

1. **Pre-Query Translation**: Non-English queries are translated to English before querying the vector DB. This ensures the search matching is extremely high-quality.
2. **Strict RAG Constraints**:
   - The system prompt defines `Sarathi, a Sovereign AI Copilot` and enforces that the answer must be derived **ONLY** from the context.
   - If the answer is not explicitly found in the retrieved context, the LLM is instructed to output the exact refusal message:
     > *"I am sorry, but this information is not available in the uploaded document. Please ask a question related to the document."*
   - This refusal is automatically translated to the user's selected Indic language.
3. **Empty Context Protection**: If Pinecone returns no chunks (or no file is uploaded), the backend translates and returns the refusal message directly, bypassing the primary LLM call.

---

### D. Audio Output Generation (TTS)
When users click the `"Listen to response"` button, the text is synthesized into regional speech:
- **Speaker Catalogs**: Sarvam AI uses different speaker catalogs for different models.
- **Dynamic Speaker Selection**:
  - **English (`en-IN`)**: Uses model `bulbul:v2` and speaker `"anushka"`.
  - **Indic Languages (Hindi, Kannada, etc.)**: Uses model `bulbul:v3` and speaker `"meera"`.
- **Streaming Response**: The backend retrieves the base64-encoded WAV from Sarvam, decodes it, and streams the binary audio back to the browser for direct HTML5 playback.

---

### E. Document-Specific Suggestion Generator
To replace static starting questions (like *"What is photosynthesis?"*) with questions relevant to the uploaded document:
1. On document upload, the first three chunks of the PDF are processed.
2. A fast Groq LLaMA call generates **3 brief, context-specific questions** (under 12 words) suited to the active mode (Education/Healthcare).
3. The suggestions are returned in the upload response and dynamically render as starting suggestion chips in the UI.
4. Removing the document resets the chips back to their default starting questions.

---

## 3. Configuration & API Keys
All serverless endpoints read credentials dynamically from environment variables:
- `PINECONE_API_KEY`, `PINECONE_INDEX_NAME`, `PINECONE_INDEX_HOST`
- `GROQ_API_KEY` (LLaMA 3.1 8b Inference)
- `SARVAM_API_KEY` (STT transcription & TTS speech synthesis)
