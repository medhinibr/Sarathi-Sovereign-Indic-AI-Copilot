import os
import shutil
import math
import struct
import io
import wave
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional

from rag_engine import ingest_pdf_document, query_rag_system

app = FastAPI(
    title="Sarathi Sovereign Indic AI Copilot Backend",
    description="FastAPI Backend for document processing, RAG orchestration, and voice API placeholders."
)

# Enable CORS to allow requests from the React frontend
# In production, specify actual allowed origins instead of wildcard '*'
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Temporary directory to store uploaded files before ingestion
UPLOAD_DIR = "./temp_uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

# Data models for API requests
class ChatRequest(BaseModel):
    message: str
    mode: str          # 'education' or 'healthcare'
    language: str      # e.g., 'Kannada', 'Hindi', 'Tamil', 'English'

class TTSRequest(BaseModel):
    text: str
    language: str

@app.post("/upload")
async def upload_pdf(file: UploadFile = File(...)):
    """
    Endpoint to receive a PDF file, write it to temporary storage,
    and process it using the RAG engine.
    """
    if not file.filename.endswith(".pdf"):
        raise HTTPException(
            status_code=400, 
            detail="Invalid file format. Only PDF files are supported."
        )

    file_path = os.path.join(UPLOAD_DIR, file.filename)
    try:
        # Save file to temp path
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # Ingest and index PDF content
        num_chunks = ingest_pdf_document(file_path, file.filename)
        
        return {
            "success": True,
            "filename": file.filename,
            "chunks_processed": num_chunks,
            "message": "Document uploaded and indexed successfully."
        }
    except Exception as e:
        # Log error locally and raise HTTP 500
        print(f"Error during PDF upload processing: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        # Clean up the physical file from the temp directory to save storage
        if os.path.exists(file_path):
            os.remove(file_path)

@app.post("/chat")
async def chat_interaction(request: ChatRequest):
    """
    Endpoint for RAG-based query processing.
    Executes search on the vector db, constructs prompts, and calls the LLM.
    """
    if not request.message.strip():
        raise HTTPException(status_code=400, detail="Message content cannot be empty.")
    
    try:
        answer = query_rag_system(
            query=request.message,
            mode=request.mode,
            language=request.language
        )
        return {"response": answer}
    except Exception as e:
        print(f"Error during chat interaction: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/stt")
async def speech_to_text(file: UploadFile = File(...)):
    """
    Speech-to-Text placeholder endpoint.
    Expects an audio file upload and returns transcription.
    Integrate Sarvam AI speech-to-text API here.
    """
    # Verify file is uploaded
    if not file:
        raise HTTPException(status_code=400, detail="No audio file provided.")
    
    # Mocking behavior: returning a static transcription string.
    # To integrate Sarvam AI:
    # 1. Read file bytes.
    # 2. Make a POST request to 'https://api.sarvam.ai/speech-to-text' with the file.
    # 3. Parse and return the transcribed text.
    return {
        "text": "This is a mock transcription of the uploaded audio. Replace this with Sarvam AI API client calls.",
        "language_detected": "English"
    }

@app.post("/tts")
async def text_to_speech(request: TTSRequest):
    """
    Text-to-Speech placeholder endpoint.
    Takes input text and generates a 1-second audio tone WAV file dynamically.
    Integrate Sarvam AI text-to-speech API here.
    """
    if not request.text.strip():
        raise HTTPException(status_code=400, detail="Text parameter cannot be empty.")
    
    try:
        # Generate a simple 1-second mono 440Hz sine wave WAV file in memory.
        # This acts as a working demonstration so the UI has playable audio content.
        sample_rate = 8000
        duration = 1.0
        frequency = 440.0
        num_samples = int(sample_rate * duration)
        
        wav_io = io.BytesIO()
        with wave.open(wav_io, 'wb') as wav_file:
            wav_file.setnchannels(1)      # Mono
            wav_file.setsampwidth(2)      # 16-bit (2 bytes)
            wav_file.setframerate(sample_rate)
            
            for i in range(num_samples):
                # Standard sine wave calculation
                sample_val = int(32767.0 * math.sin(2.0 * math.pi * frequency * i / sample_rate))
                wav_file.writeframesraw(struct.pack('<h', sample_val))
        
        # Reset pointer to start of stream for reading
        wav_io.seek(0)
        
        # To integrate Sarvam AI:
        # 1. Call Sarvam AI's text-to-speech endpoint.
        # 2. Receive the audio bytes (usually MP3/WAV).
        # 3. Stream the bytes back to the frontend with the appropriate media type.
        
        return StreamingResponse(
            wav_io, 
            media_type="audio/wav", 
            headers={"Content-Disposition": "attachment; filename=speech.wav"}
        )
    except Exception as e:
        print(f"Error in TTS execution: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    # Start uvicorn server locally on port 8000 when main.py is run directly
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
