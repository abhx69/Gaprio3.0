import os
import logging
from glob import glob
from langchain_community.document_loaders import PyPDFLoader, TextLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.embeddings import SentenceTransformerEmbeddings
from langchain_community.vectorstores import Chroma

# Setup logging to see the progress
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# Define the paths for your knowledge base and the database
KNOWLEDGE_BASE_DIR = "knowledge_base"
DB_DIR = "db"

def ingest_documents():
    """
    Reads all documents from the knowledge base, splits them into manageable chunks,
    converts them into vector embeddings, and stores them in a local ChromaDB vector store.
    """
    
    if not os.path.exists(KNOWLEDGE_BASE_DIR):
        logging.error(f"Knowledge base directory not found at '{KNOWLEDGE_BASE_DIR}'. Please create it and add your documents.")
        return

    logging.info("Starting document ingestion process...")

    # --- CORRECTED FILE LOADING LOGIC ---
    # Manually find and load each type of file to ensure compatibility.
    documents = []
    
    # Find and load all PDF files
    pdf_files = glob(os.path.join(KNOWLEDGE_BASE_DIR, "**/*.pdf"), recursive=True)
    for pdf_path in pdf_files:
        logging.info(f"Loading PDF: {pdf_path}")
        try:
            loader = PyPDFLoader(pdf_path)
            documents.extend(loader.load())
        except Exception as e:
            logging.error(f"Failed to load PDF {pdf_path}: {e}")

    # Find and load all TXT files
    txt_files = glob(os.path.join(KNOWLEDGE_BASE_DIR, "**/*.txt"), recursive=True)
    for txt_path in txt_files:
        logging.info(f"Loading TXT: {txt_path}")
        try:
            loader = TextLoader(txt_path, encoding='utf-8')
            documents.extend(loader.load())
        except Exception as e:
            logging.error(f"Failed to load TXT {txt_path}: {e}")

    if not documents:
        logging.warning("No documents were successfully loaded from the knowledge base. The vector database will be empty.")
        return
    
    logging.info(f"Successfully loaded {len(documents)} document(s) in total.")

    # Split the documents into smaller chunks for better processing
    text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
    chunks = text_splitter.split_documents(documents)
    logging.info(f"Split documents into {len(chunks)} chunks.")

    # Load the AI model that will create the vector embeddings.
    logging.info("Loading sentence transformer model for embeddings...")
    embeddings = SentenceTransformerEmbeddings(model_name="all-MiniLM-L6-v2")
    logging.info("Embedding model loaded.")

    # Create the vector store from the document chunks using batch processing
    logging.info(f"Creating vector store in directory: '{DB_DIR}'...")
    
    # Process in batches to avoid ChromaDB batch size limitation
    batch_size = 4000  # Safe batch size well below ChromaDB's 5461 limit
    total_batches = (len(chunks) + batch_size - 1) // batch_size  # Ceiling division
    
    logging.info(f"Processing {len(chunks)} chunks in {total_batches} batches of {batch_size}...")
    
    for batch_num in range(total_batches):
        start_idx = batch_num * batch_size
        end_idx = min(start_idx + batch_size, len(chunks))
        batch_chunks = chunks[start_idx:end_idx]
        
        logging.info(f"Processing batch {batch_num + 1}/{total_batches} with {len(batch_chunks)} chunks...")
        
        if batch_num == 0:
            # Create the vector store with the first batch
            db = Chroma.from_documents(
                documents=batch_chunks, 
                embedding=embeddings, 
                persist_directory=DB_DIR
            )
        else:
            # Add subsequent batches to the existing store
            db.add_documents(batch_chunks)
        
        logging.info(f"Completed batch {batch_num + 1}/{total_batches}")
    
    logging.info("Vector store created and persisted successfully.")
    logging.info("Ingestion complete!")


if __name__ == "__main__":
    ingest_documents()