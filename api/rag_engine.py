import os
import io
from typing import List
from dotenv import load_dotenv
import pypdf
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_pinecone import PineconeVectorStore, PineconeEmbeddings
from langchain_groq import ChatGroq
from langchain.schema import Document

# Load environmental variables from .env file
load_dotenv()

# Configuration variables
PINECONE_API_KEY = os.getenv("PINECONE_API_KEY", "")
PINECONE_INDEX_NAME = os.getenv("PINECONE_INDEX_NAME", "sarathi-db")
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
LLM_MODEL = os.getenv("LLM_MODEL", "llama3-8b-8192")

# Initialize Pinecone embeddings model
# multilingual-e5-large is a high-performance model hosted on Pinecone's serverless inference endpoints (Dimension 1024)
if PINECONE_API_KEY:
    embeddings = PineconeEmbeddings(
        model="multilingual-e5-large",
        pinecone_api_key=PINECONE_API_KEY
    )
    
    # Initialize connection to Pinecone serverless vector database
    vector_db = PineconeVectorStore(
        index_name=PINECONE_INDEX_NAME,
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

def ingest_pdf_bytes(file_bytes: bytes, filename: str) -> int:
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

    # Batch insert to Pinecone vector store
    vector_db.add_documents(documents)
    
    return len(documents)

def get_system_prompt(mode: str, language: str) -> str:
    """
    Synthesizes custom prompt guidelines defining the AI agent's behavior.
    """
    # System prompt for Education Mode
    education_prompt = (
        "You are a helpful, enthusiastic government school teacher in India. "
        "Your goal is to explain educational and textbook concepts in a simple, clear, "
        "and engaging manner. Use analogies, local examples (such as village life, agricultural "
        "concepts, or common household scenarios), and break down complex ideas step-by-step. "
        "Be encouraging and patient."
    )

    # System prompt for Healthcare Mode
    healthcare_prompt = (
        "You are an empathetic, patient-focused clinical assistant. "
        "Your task is to simplify complex clinical documents, lab reports, or medical terms. "
        "You must explain medical concepts in simple layperson terms, using a reassuring, warm tone. "
        "CRITICAL SAFETY WARNING: You are an AI assistant, not a doctor. You must NOT diagnose conditions, "
        "prescribe treatments, or recommend specific medications. Your explanations must be informational only. "
        "If the user asks for diagnosis or treatment, politely direct them to consult a qualified healthcare professional. "
        "Always add a brief disclaimer at the end of your response noting that this information is for educational purposes."
    )

    base_persona = education_prompt if mode.lower() == "education" else healthcare_prompt

    # Script/translation rules for Indian languages
    language_instructions = (
        f"\n\nOutput Language Requirement: You must write your entire response in {language}. "
        f"Use the standard script of the language (e.g., Devanagari for Hindi, Kannada script for Kannada, "
        f"Tamil script for Tamil, etc.). If the target language is English, write in standard English. "
        f"If a specific technical or medical term has no common translation, you may write the English term "
        f"in parentheses next to its phonetic spelling. Avoid using emojis in your output text."
    )

    # Strict constraint instructions for retrieved context alignment
    context_constraint = (
        "\n\nConstraint: Answer the user's question query STRICTLY based on the provided context retrieved "
        "from the document. If the answer cannot be found in the context, state that you do not have that "
        "information in the uploaded document, and answer using general knowledge while explicitly stating "
        "that it is general knowledge and not from the document. Do not fabricate facts."
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

    # Retrieve relevant source chunks from the Pinecone vector database
    docs = vector_db.similarity_search(query, k=4)
    context_pieces = [doc.page_content for doc in docs]
    context = "\n---\n".join(context_pieces) if context_pieces else "No relevant document context found."

    try:
        # Initialize LangChain ChatGroq wrapper for LLaMA inference
        llm = ChatGroq(
            groq_api_key=GROQ_API_KEY,
            model=LLM_MODEL,
            temperature=0.3
        )

        system_message = get_system_prompt(mode, language)
        user_message = f"Document Context:\n{context}\n\nUser Query: {query}"

        messages = [
            ("system", system_message),
            ("user", user_message)
        ]
        
        response = llm.invoke(messages)
        return response.content

    except Exception as e:
        return f"Error executing query through the Groq LLM engine: {str(e)}"
