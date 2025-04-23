import os
from typing import List
import xml.etree.ElementTree as ET
from dataclasses import dataclass
from pathlib import Path
import numpy as np
from langchain_community.vectorstores import FAISS
from langchain_openai import OpenAIEmbeddings
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain.schema import Document
from dotenv import load_dotenv

@dataclass
class XQDocFunction:
    name: str
    signature: str
    description: str
    params: List[str]
    returns: str

def parse_xml_file(file_path: str) -> List[Document]:
    """Parse XQDoc XML file and convert to documents."""
    tree = ET.parse(file_path)
    root = tree.getroot()
    
    # Define namespace
    ns = {'xqdoc': 'http://www.xqdoc.org/1.0'}
    
    # Extract module information
    module = root.find('.//xqdoc:module', ns)
    module_name = module.find('xqdoc:name', ns).text
    module_uri = module.find('xqdoc:uri', ns).text
    module_desc = module.find('.//xqdoc:description', ns).text
    
    documents = []
    
    # Add module overview document
    module_text = f"""
    Module: {module_name}
    URI: {module_uri}
    Description: {module_desc}
    """
    documents.append(Document(
        page_content=module_text,
        metadata={"source": file_path, "type": "module_overview"}
    ))
    
    # Process each function
    for func in root.findall('.//xqdoc:function', ns):
        function = XQDocFunction(
            name=func.find('xqdoc:name', ns).text,
            signature=func.find('xqdoc:signature', ns).text,
            description=func.find('.//xqdoc:description', ns).text,
            params=[param.text for param in func.findall('.//xqdoc:param', ns)],
            returns=func.find('.//xqdoc:return', ns).text if func.find('.//xqdoc:return', ns) is not None else ""
        )
        
        # Create a structured text representation of the function
        function_text = f"""
        Function: {function.name}
        Signature: {function.signature}
        Description: {function.description}
        Parameters:
        {chr(10).join(['- ' + param for param in function.params])}
        Returns: {function.returns}
        """
        
        documents.append(Document(
            page_content=function_text,
            metadata={
                "source": file_path,
                "type": "function",
                "function_name": function.name
            }
        ))
    
    return documents

def create_vector_store():
    load_dotenv()  # Load OpenAI API key from .env file
    
    # Initialize text splitter and embeddings
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000,
        chunk_overlap=200
    )
    embeddings = OpenAIEmbeddings(model="text-embedding-3-small")
    
    # Process all XML files in the modules directory
    modules_dir = Path("modules")
    all_documents = []
    
    for xml_file in modules_dir.glob("*.xml"):
        print(f"Processing {xml_file}")
        try:
            documents = parse_xml_file(str(xml_file))
            # Split documents if they're too long
            split_docs = text_splitter.split_documents(documents)
            all_documents.extend(split_docs)
        except Exception as e:
            print(f"Error processing {xml_file}: {e}")
    
    print(f"Total documents processed: {len(all_documents)}")
    
    # Create and save the vector store
    vector_store = FAISS.from_documents(all_documents, embeddings)
    vector_store.save_local("vector_store")
    print("Vector store created and saved.")

if __name__ == "__main__":
    create_vector_store()