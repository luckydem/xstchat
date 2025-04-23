from langchain_community.vectorstores import FAISS
from langchain_openai import OpenAIEmbeddings
from dotenv import load_dotenv
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def load_vector_store(store_path: str = "./vector_store"):
    """Load the FAISS vector store from disk."""
    try:
        load_dotenv()  # Load OpenAI API key
        embeddings = OpenAIEmbeddings(model="text-embedding-3-small")
        vector_store = FAISS.load_local(
            store_path, 
            embeddings, 
            allow_dangerous_deserialization=True
        )
        logger.info(f"Successfully loaded vector store from {store_path}")
        return vector_store
    except Exception as e:
        logger.error(f"Error loading vector store: {e}")
        raise

def search_functions(query: str, vector_store: FAISS, k: int = 3):
    """Search the vector store for relevant function documentation."""
    try:
        results = vector_store.similarity_search(query, k=k)
        return results
    except Exception as e:
        logger.error(f"Error performing search: {e}")
        raise

def format_result(doc):
    """Format a single search result with metadata handling."""
    output = []
    
    # Add metadata information
    output.append("Metadata:")
    for key, value in doc.metadata.items():
        output.append(f"- {key}: {value}")
    
    # Add content
    output.append("\nContent:")
    output.append(doc.page_content)
    
    return "\n".join(output)

if __name__ == "__main__":
    # Load the vector store
    vs = load_vector_store()

    # Example queries
    queries = [
        "How do I compare XML documents?",
        "What functions are available for finding differences between documents?"
    ]

    # Process each query
    for query in queries:
        print(f"\nQuery: {query}")
        print("=" * 80)
        
        results = search_functions(query, vs, k=2)
        
        for i, doc in enumerate(results, 1):
            print(f"\nResult {i}:")
            print("-" * 40)
            print(format_result(doc))
            print("-" * 80)