# --- backend/app/ai_utils.py ---
from langchain_ollama import OllamaLLM as Ollama
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import JsonOutputParser
from langchain_core.runnables import RunnablePassthrough
from langchain_community.vectorstores import Chroma
from langchain_community.embeddings import SentenceTransformerEmbeddings
from pydantic import BaseModel, Field
from jinja2 import Environment, FileSystemLoader
import os
from datetime import datetime
from typing import Optional

# --- MODIFIED DATA STRUCTURE ---
# Changed field names for clarity (e.g., commission_name -> client_name)
class ContractDetails(BaseModel):
    client_name: Optional[str] = Field(default="[Client Name Not Found]", description="Name of the Client or the party receiving services.")
    consultant_name: Optional[str] = Field(default="[Consultant Name Not Found]", description="Name of the Consultant or the party providing services.")
    project_name: Optional[str] = Field(default="[Project Name Not Found]", description="The name of the services or project.")
    total_payment_not_to_exceed: Optional[float] = Field(default=None, description="The total maximum payment amount. Should be null if not mentioned.")
    termination_notice_days: int = Field(default=30, description="Number of days for termination notice by either party.")
    scope_of_services: Optional[str] = Field(default="[Scope of Services Not Found]", description="A detailed description of the services to be performed.")

# --- Setup Jinja2 Template ---
template_dir = os.path.join(os.path.dirname(__file__), '..', 'templates')
env = Environment(loader=FileSystemLoader(template_dir))
env.globals['now'] = datetime.utcnow
template = env.get_template("contract_template.txt")

# --- Setup LangChain RAG Components ---
DB_DIR = "db"
embeddings = SentenceTransformerEmbeddings(model_name="all-MiniLM-L6-v2")
vectorstore = Chroma(persist_directory=DB_DIR, embedding_function=embeddings)
retriever = vectorstore.as_retriever(search_kwargs={"k": 5})

MODEL = "llama3:instruct"
OLLAMA_URL = "http://localhost:11434"

llm = Ollama(model=MODEL, base_url=OLLAMA_URL, format="json")
parser = JsonOutputParser(pydantic_object=ContractDetails)

# --- IMPROVED PROMPT TEMPLATE ---
# This new prompt specifically tells the AI to identify roles and ignore speaker tags.
prompt_template = """
You are an expert legal AI assistant. Your task is to extract key details for a contract from a conversation transcript.
Analyze the dialogue to understand the roles of the participants. Do not use generic labels like "SPEAKER 00" or "UNKNOWN" as party names. Instead, determine who the "Client" is and who the "Consultant" is based on what they say.

Use the provided "Legal Context" from similar documents to improve your accuracy.

LEGAL CONTEXT:
{context}

CONVERSATION TRANSCRIPT:
{conversation}

Based on the conversation and legal context, extract the key details. If a name is not mentioned, use the default from the schema.
Adhere to the schema provided below.

SCHEMA:
{format_instructions}

JSON_OUTPUT:
"""

prompt = ChatPromptTemplate.from_template(prompt_template)

def format_docs(docs):
    return "\n\n".join(doc.page_content for doc in docs)

rag_chain = {
    "context": retriever | format_docs,
    "conversation": RunnablePassthrough(),
    "format_instructions": lambda x: parser.get_format_instructions()
} | prompt | llm | parser

# --- MODIFIED FUNCTION ---
# This now cleans the transcript by removing asterisks before sending it to the AI.
def generate_contract(conversation: str) -> str:
    # Pre-process the transcript to remove markdown characters
    cleaned_conversation = conversation.replace('**', '')
    
    extracted_data = rag_chain.invoke(cleaned_conversation)
    contract_text = template.render(extracted_data)
    return contract_text