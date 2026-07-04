import os
import io
import base64
import httpx
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional

from rag_engine import ingest_pdf_bytes, query_rag_system

app = FastAPI(
    title="Sarathi Sovereign Indic AI Copilot Backend",
    description="FastAPI Backend updated for serverless architecture with Pinecone embeddings and real Sarvam AI voice endpoints."
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Standard mapping dictionary for translating Indic languages to their respective BCP-47 codes supported by Sarvam AI
LANGUAGE_CODE_MAP = {
    "English": "en-IN",
    "Kannada": "kn-IN",
    "Hindi": "hi-IN",
    "Tamil": "ta-IN",
    "Telugu": "te-IN",
    "Malayalam": "ml-IN",
    "Marathi": "mr-IN",
    "Gujarati": "gu-IN",
    "Bengali": "bn-IN",
    "Punjabi": "pa-IN",
    "Odia": "or-IN"
}

class ChatRequest(BaseModel):
    message: str
    mode: str
    language: str

class TTSRequest(BaseModel):
    text: str
    language: str

@app.post("/api/upload")
async def upload_pdf(file: UploadFile = File(...)):
    """
    Endpoint to receive a PDF file and process it completely in-memory.
    Ensures zero disk writes to prevent serverless read-only filesystem crash.
    """
    if not file.filename.endswith(".pdf"):
        raise HTTPException(
            status_code=400, 
            detail="Invalid file format. Only PDF files are supported."
        )

    try:
        # Read the file bytes directly into RAM memory
        file_bytes = await file.read()
        
        # Process and index PDF contents into Pinecone Cloud Vector DB
        num_chunks = ingest_pdf_bytes(file_bytes, file.filename)
        
        return {
            "success": True,
            "filename": file.filename,
            "chunks_processed": num_chunks,
            "message": "Document processed in-memory and indexed to Pinecone cloud successfully."
        }
    except Exception as e:
        print(f"Error during in-memory PDF processing: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/chat")
async def chat_interaction(request: ChatRequest):
    """
    RAG-powered chat response endpoint.
    Retrieves context from Pinecone and synthesizes output via LLM.
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

@app.post("/api/stt")
async def speech_to_text(file: UploadFile = File(...)):
    """
    Speech-to-Text translation endpoint using Sarvam AI's Saaras v3 REST API.
    Converts Indian speech formats to transcribed string data.
    """
    sarvam_api_key = os.getenv("SARVAM_API_KEY")
    if not sarvam_api_key:
        raise HTTPException(
            status_code=500,
            detail="SARVAM_API_KEY is not configured in the environment variables."
        )

    try:
        # Load audio file bytes directly in memory
        audio_bytes = await file.read()
        
        # Build headers and request parameters for Sarvam STT REST API
        url = "https://api.sarvam.ai/speech-to-text"
        headers = {
            "api-subscription-key": sarvam_api_key
        }
        files = {
            "file": (file.filename, audio_bytes, file.content_type or "audio/wav")
        }
        data = {
            "model": "saaras:v3",
            "mode": "transcribe"
        }

        async with httpx.AsyncClient() as client:
            response = await client.post(url, headers=headers, files=files, data=data, timeout=30.0)
            
        if response.status_code != 200:
            print(f"Sarvam STT connection failed: {response.text}")
            raise HTTPException(
                status_code=response.status_code,
                detail=f"Sarvam STT API returned error: {response.text}"
            )
            
        result = response.json()
        transcript = result.get("transcript", "")
        
        return {
            "text": transcript,
            "language_detected": result.get("language_code", "Unknown")
        }
    except httpx.HTTPError as e:
        print(f"STT Network error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"HTTP connection error to Sarvam STT: {str(e)}")
    except Exception as e:
        print(f"STT parsing error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to transcribe speech: {str(e)}")

@app.post("/api/tts")
async def text_to_speech(request: TTSRequest):
    """
    Text-to-Speech synthesis endpoint using Sarvam AI's Bulbul v3 REST API.
    Converts Unicode text in Indian languages into playable WAV audio.
    """
    sarvam_api_key = os.getenv("SARVAM_API_KEY")
    if not sarvam_api_key:
        raise HTTPException(
            status_code=500,
            detail="SARVAM_API_KEY is not configured in the environment variables."
        )

    if not request.text.strip():
        raise HTTPException(status_code=400, detail="Text parameter cannot be empty.")

    # Retrieve target BCP-47 code or fallback to English (en-IN)
    language_code = LANGUAGE_CODE_MAP.get(request.language, "en-IN")

    try:
        url = "https://api.sarvam.ai/text-to-speech"
        headers = {
            "api-subscription-key": sarvam_api_key,
            "Content-Type": "application/json"
        }
        payload = {
            "text": request.text,
            "speaker": "meera",
            "target_language_code": language_code,
            "model": "bulbul:v3"
        }

        async with httpx.AsyncClient() as client:
            response = await client.post(url, headers=headers, json=payload, timeout=30.0)
            
        if response.status_code != 200:
            print(f"Sarvam TTS connection failed: {response.text}")
            raise HTTPException(
                status_code=response.status_code,
                detail=f"Sarvam TTS API returned error: {response.text}"
            )
            
        result = response.json()
        audios = result.get("audios", [])
        
        if not audios:
            raise HTTPException(status_code=500, detail="Sarvam TTS response did not contain audio data.")
            
        # Decode the base64 string from Sarvam to obtain binary WAV payload
        audio_base64 = audios[0]
        audio_bytes = base64.b64decode(audio_base64)
        
        # Return binary audio stream for native HTML5 audio component playback
        return StreamingResponse(
            io.BytesIO(audio_bytes),
            media_type="audio/wav"
        )
    except httpx.HTTPError as e:
        print(f"TTS Network error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"HTTP connection error to Sarvam TTS: {str(e)}")
    except Exception as e:
        print(f"TTS compilation error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to synthesize speech: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
