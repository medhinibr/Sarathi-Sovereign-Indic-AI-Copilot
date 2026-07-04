import os
import io
from typing import List
from dotenv import load_dotenv
import pypdf
from pinecone import Pinecone
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_pinecone import PineconeVectorStore, PineconeEmbeddings
from langchain_groq import ChatGroq
from langchain_core.documents import Document

# Load environmental variables from .env file
load_dotenv()

# Configuration variables retrieved dynamically from serverless environment
PINECONE_API_KEY = os.getenv("PINECONE_API_KEY", "")
PINECONE_INDEX_NAME = os.getenv("PINECONE_INDEX_NAME", "sarathi-db")
PINECONE_INDEX_HOST = os.getenv("PINECONE_INDEX_HOST", "https://sarathi-db-szh18us.svc.aped-4627-b74a.pinecone.io")
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
LLM_MODEL = os.getenv("LLM_MODEL", "llama-3.1-8b-instant")

# Initialize Pinecone embeddings model
# multilingual-e5-large is a high-performance model hosted on Pinecone's serverless inference endpoints (Dimension 1024)
if PINECONE_API_KEY:
    embeddings = PineconeEmbeddings(
        model="multilingual-e5-large",
        pinecone_api_key=PINECONE_API_KEY
    )
    
    # Connect directly to index using the provided index host URL to prevent permission/index-listing failures
    pc = Pinecone(api_key=PINECONE_API_KEY)
    index = pc.Index(name=PINECONE_INDEX_NAME, host=PINECONE_INDEX_HOST)
    
    # Initialize connection to Pinecone serverless vector database
    vector_db = PineconeVectorStore(
        index=index,
        embedding=embeddings,
        pinecone_api_key=PINECONE_API_KEY
    )
else:
    embeddings = None
    vector_db = None
    print("[Warning] PINECONE_API_KEY is missing. PineconeVectorStore not initialized.")

def extract_text_from_pdf_bytes(file_bytes: bytes) -> str:
    """
    Extracts text from a PDF byte stream in-memory using pypdf.
    Avoids writing any temporary files to local disk to satisfy serverless read-only restrictions.
    """
    pdf_file = io.BytesIO(file_bytes)
    reader = pypdf.PdfReader(pdf_file)
    extracted_text = []
    for page_num, page in enumerate(reader.pages):
        text = page.extract_text()
        if text:
            extracted_text.append(text)
    return "\n\n".join(extracted_text)

def ingest_pdf_bytes(file_bytes: bytes, filename: str) -> tuple:
    """
    Ingests and indexes a PDF document entirely in-memory.
    Extracts text, chunks it, and indexes it into the cloud Pinecone vector database.
    """
    if not PINECONE_API_KEY:
        raise ValueError("PINECONE_API_KEY is not set. In-memory indexing requires cloud Pinecone access.")

    raw_text = extract_text_from_pdf_bytes(file_bytes)
    if not raw_text.strip():
        raise ValueError("The uploaded PDF does not contain extractable text.")

    # Chunking strategies optimized for retrieval context depth and serverless API latency
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000,
        chunk_overlap=200,
        length_function=len
    )
    chunks = text_splitter.split_text(raw_text)

    # Convert split text segments to LangChain Document structures
    documents = [
        Document(
            page_content=chunk,
            metadata={"source": filename, "chunk_index": i}
        )
        for i, chunk in enumerate(chunks)
    ]

    # Batch insert to Pinecone vector store synchronously to avoid multiprocessing error on Vercel/Lambda
    vector_db.add_documents(documents, async_req=False)
    
    return len(documents), chunks

def generate_document_suggestions(chunks: list, mode: str) -> list:
    """
    Generates 3 context-specific user question suggestions based on the first few chunks of the document.
    """
    try:
        if not chunks:
            return []
            
        # Combine the first 3 chunks to get a good overview of the document
        sample_context = "\n---\n".join(chunks[:3])
        
        llm = ChatGroq(
            groq_api_key=GROQ_API_KEY,
            model="llama-3.1-8b-instant",
            temperature=0.7
        )
        
        persona = "teacher assisting rural Indian students" if mode == "education" else "supportive ASHA healthcare worker"
        
        system_message = (
            f"You are a helpful assistant assisting a {persona}.\n"
            f"Based on the following document content excerpt, generate exactly 3 short, natural, user-friendly questions "
            f"that a user might want to ask about this document. Keep each question brief (under 12 words) and easy to understand.\n"
            f"Provide the 3 questions as a plain list, one per line. Do not number them or add any other text."
        )
        
        messages = [
            ("system", system_message),
            ("user", f"Document Excerpt:\n{sample_context}")
        ]
        
        response = llm.invoke(messages)
        questions = [q.strip() for q in response.content.split("\n") if q.strip()]
        
        # Clean any numbering like "1. ", "2. ", etc. if the LLM ignored instructions
        cleaned_questions = []
        for q in questions:
            cleaned_q = q.lstrip("0123456789. -*)")
            if cleaned_q:
                cleaned_questions.append(cleaned_q)
        
        return cleaned_questions[:3]
    except Exception as e:
        print(f"Error generating suggestions: {e}")
        return []

def translate_query_to_english(query: str, groq_api_key: str) -> str:
    """
    Translates non-English queries into English to ensure similarity search matches English vector index.
    """
    try:
        # Use ChatGroq with a fast model to translate
        translator_llm = ChatGroq(
            groq_api_key=groq_api_key,
            model="llama-3.1-8b-instant",
            temperature=0.0
        )
        messages = [
            ("system", "You are a professional translator. Translate the user query into plain English. Respond ONLY with the translation, nothing else."),
            ("user", query)
        ]
        response = translator_llm.invoke(messages)
        return response.content.strip()
    except Exception as e:
        print(f"Translation helper failed: {e}")
        return query

def get_system_prompt(mode: str, language: str) -> str:
    """
    Synthesizes custom prompt guidelines defining the AI agent's behavior.
    """
    # System prompt for Education Mode
    education_prompt = (
        "You are Sarathi, a Sovereign AI Copilot acting as a rural Indian teacher. Use simple village analogies. Be warm and encouraging."
    )

    # System prompt for Healthcare Mode
    healthcare_prompt = (
        "You are Sarathi, a Sovereign AI Copilot acting as a supportive ASHA worker. Simplify medical terms. "
        "STRICT SAFETY RULE: Never diagnose or prescribe medication. Always advise consulting a real doctor. Be reassuring and clear."
    )

    base_persona = education_prompt if mode.lower() == "education" else healthcare_prompt

    # Script/translation rules for Indian languages
    if language != "English":
        language_instructions = (
            f"\n\nLanguage Instruction: Write your entire response in {language} (using native {language} script/characters)."
        )
    else:
        language_instructions = "\n\nLanguage Instruction: Write your response in English."

    # Strict constraint instructions for retrieved context alignment
    context_constraint = (
        f"\n\nSTRICT RAG RULE: You MUST answer the user's question using ONLY the provided Context. "
        f"If the answer is not explicitly found in the Context, you MUST NOT use your internal knowledge. "
        f"Instead, reply strictly with: \"I am sorry, but this information is not available in the uploaded document. Please ask a question related to the document.\" "
        f"Translate this refusal to the requested language ({language}) using native characters/script."
    )

    return base_persona + language_instructions + context_constraint

def query_rag_system(query: str, mode: str, language: str) -> str:
    """
    Executes the retriever and generator loop using Pinecone and ChatGroq.
    """
    if not vector_db:
        return "Vector database connection is uninitialized. Ensure PINECONE_API_KEY is configured."

    if not GROQ_API_KEY:
        return "Groq API Key is not configured. Please set the GROQ_API_KEY environment variable."

    # Translate query to English if the user selected language is not English
    search_query = query
    if language != "English":
        search_query = translate_query_to_english(query, GROQ_API_KEY)
        print(f"Translated query '{query}' to '{search_query}' for Pinecone search.")

    # Retrieve relevant source chunks from the Pinecone vector database using the translated query
    docs = vector_db.similarity_search(search_query, k=4)
    context_pieces = [doc.page_content for doc in docs]
    context = "\n---\n".join(context_pieces) if context_pieces else ""

    # Check if we have no chunks retrieved
    if not context_pieces or not context.strip():
        refusal_en = "I am sorry, but this information is not available in the uploaded document. Please ask a question related to the document."
        if language == "English":
            return refusal_en
        else:
            try:
                translator_llm = ChatGroq(
                    groq_api_key=GROQ_API_KEY,
                    model="llama-3.1-8b-instant",
                    temperature=0.0
                )
                messages = [
                    ("system", f"You are a professional translator. Translate the refusal message to {language} (using native {language} characters/script). Return ONLY the translation, nothing else."),
                    ("user", refusal_en)
                ]
                response = translator_llm.invoke(messages)
                return response.content.strip()
            except Exception as e:
                print(f"Refusal translation failed: {e}")
                return refusal_en

    try:
        # Initialize LangChain ChatGroq wrapper for LLaMA inference
        llm = ChatGroq(
            groq_api_key=GROQ_API_KEY,
            model=LLM_MODEL,
            temperature=0.0  # Set temperature to 0.0 for strict facts adherence
        )

        system_message = get_system_prompt(mode, language)
        
        if language != "English":
            user_message = (
                f"Document Context:\n{context}\n\n"
                f"User Query: {search_query}\n\n"
                f"Please answer the user query based strictly on the context, and translate your entire final response to {language}. "
                f"Write the response using native {language} characters. If the answer is not explicitly found in the context, output the exact refusal message."
            )
        else:
            user_message = f"Document Context:\n{context}\n\nUser Query: {query}"

        messages = [
            ("system", system_message),
            ("user", user_message)
        ]
        
        response = llm.invoke(messages)
        return response.content

    except Exception as e:
        return f"Error executing query through the Groq LLM engine: {str(e)}"
