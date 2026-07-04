import os
from typing import List, Tuple
from dotenv import load_dotenv
import pypdf
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import Chroma
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_openai import OpenAIEmbeddings, ChatOpenAI
from langchain.schema import Document

# Load environmental variables from .env file
load_dotenv()

# Configuration variables
CHROMA_PERSIST_DIR = os.getenv("CHROMA_PERSIST_DIR", "./chroma_db")
EMBEDDINGS_PROVIDER = os.getenv("EMBEDDINGS_PROVIDER", "local")  # 'local' or 'openai'
LLM_API_KEY = os.getenv("LLM_API_KEY", "")
LLM_API_BASE = os.getenv("LLM_API_BASE", "https://api.openai.com/v1")
LLM_MODEL = os.getenv("LLM_MODEL", "gpt-3.5-turbo")

# Initialize embeddings model
# We default to a lightweight, local model to save costs and run out-of-the-box.
# If OpenAI embeddings are preferred, they can be configured via environment variables.
if EMBEDDINGS_PROVIDER.lower() == "openai":
    if not os.getenv("OPENAI_API_KEY"):
        # Fallback to local if key is missing to prevent startup crash
        print("[Warning] OPENAI_API_KEY not found. Falling back to local embeddings.")
        embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
    else:
        embeddings = OpenAIEmbeddings()
else:
    embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")

# Initialize Vector DB placeholder
# Chroma will load or create the database at CHROMA_PERSIST_DIR
vector_db = Chroma(
    persist_directory=CHROMA_PERSIST_DIR,
    embedding_function=embeddings,
    collection_name="sarathi_documents"
)

def extract_text_from_pdf(file_path: str) -> str:
    """
    Extracts plain text from a PDF file using pypdf.
    Handles multipage documents and filters out empty pages.
    """
    reader = pypdf.PdfReader(file_path)
    extracted_text = []
    for page_num, page in enumerate(reader.pages):
        text = page.extract_text()
        if text:
            extracted_text.append(text)
    return "\n\n".join(extracted_text)

def ingest_pdf_document(file_path: str, filename: str) -> int:
    """
    Processes an uploaded PDF: extracts text, splits it into semantic chunks,
    and indexes them in the Chroma vector database.
    Returns the number of chunks successfully added.
    """
    raw_text = extract_text_from_pdf(file_path)
    if not raw_text.strip():
        raise ValueError("The uploaded PDF does not contain extractable text.")

    # Using RecursiveCharacterTextSplitter to maintain paragraph integrity where possible.
    # Chunk size and overlap are configured to balance context depth and retriever precision.
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000,
        chunk_overlap=200,
        length_function=len
    )
    chunks = text_splitter.split_text(raw_text)

    # Convert chunks into LangChain Document objects with metadata
    documents = [
        Document(
            page_content=chunk,
            metadata={"source": filename, "chunk_index": i}
        )
        for i, chunk in enumerate(chunks)
    ]

    # Add documents to Chroma
    global vector_db
    vector_db.add_documents(documents)
    
    return len(documents)

def get_system_prompt(mode: str, language: str) -> str:
    """
    Generates a tailored system prompt based on the chosen operational mode.
    Instructs the LLM on its persona, safety bounds, and target output language.
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

    # Select base persona
    base_persona = education_prompt if mode.lower() == "education" else healthcare_prompt

    # Multi-lingual instructions
    language_instructions = (
        f"\n\nOutput Language Requirement: You must write your entire response in {language}. "
        f"Use the standard script of the language (e.g., Devanagari for Hindi, Kannada script for Kannada, "
        f"Tamil script for Tamil, etc.). If the target language is English, write in standard English. "
        f"If a specific technical or medical term has no common translation, you may write the English term "
        f"in parentheses next to its phonetic spelling. Avoid using emojis in your output text."
    )

    # Strict context constraint
    context_constraint = (
        "\n\nConstraint: Answer the user's question query STRICTLY based on the provided context retrieved "
        "from the document. If the answer cannot be found in the context, state that you do not have that "
        "information in the uploaded document, and answer using general knowledge while explicitly stating "
        "that it is general knowledge and not from the document. Do not fabricate facts."
    )

    return base_persona + language_instructions + context_constraint

def query_rag_system(query: str, mode: str, language: str) -> str:
    """
    Executes the complete RAG loop:
    1. Retrieval: Query Chroma vector db for matching document segments.
    2. Context construction: Format retrieved texts.
    3. Prompts generation: Fetch system persona.
    4. Generation: Send context and query to the LLM.
    """
    # Retrieve top 4 most relevant chunks
    docs = vector_db.similarity_search(query, k=4)
    context_pieces = [doc.page_content for doc in docs]
    context = "\n---\n".join(context_pieces) if context_pieces else "No relevant document context found."

    # Verify if LLM API Key is provided
    if not LLM_API_KEY:
        return (
            "LLM API Key is not configured. Please set the LLM_API_KEY environment variable. "
            "Mocked Context Retrieved:\n" + context[:300] + "..."
        )

    # Initialize LLM with custom API base and key
    # This allows swapping between OpenAI, Groq, or other OpenAI-compatible endpoints easily.
    try:
        llm = ChatOpenAI(
            openai_api_key=LLM_API_KEY,
            openai_api_base=LLM_API_BASE,
            model_name=LLM_MODEL,
            temperature=0.3  # Lower temperature for more factual, context-aligned answers
        )

        system_message = get_system_prompt(mode, language)
        user_message = f"Document Context:\n{context}\n\nUser Query: {query}"

        # Execute LLM call
        messages = [
            ("system", system_message),
            ("user", user_message)
        ]
        
        response = llm.invoke(messages)
        return response.content

    except Exception as e:
        return f"Error executing query through the LLM engine: {str(e)}"
