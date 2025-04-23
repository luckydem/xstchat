import { FaissStore } from "@langchain/community/vectorstores/faiss";
import { OpenAIEmbeddings } from "@langchain/openai";
import { DirectoryLoader } from "langchain/document_loaders/fs/directory";
import { TextLoader } from "langchain/document_loaders/fs/text";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync, mkdirSync, readFileSync } from 'fs';
import { logger } from "./logger.js";
import { DOMParser } from 'xmldom';

import dotenv from "dotenv";
dotenv.config();

const __dirname = dirname(fileURLToPath(import.meta.url));
const VECTOR_STORE_PATH = join(__dirname, "../../helpers", "vector_store");
const MODULES_PATH = join(__dirname, "../../helpers", "modules");

class XMLDocumentProcessor {
    constructor() {
        this.parser = new DOMParser();
    }

    extractTextContent(element, selector) {
        const node = element.getElementsByTagName(selector)[0];
        return node ? node.textContent.trim() : '';
    }

    processXMLContent(xmlContent) {
        const doc = this.parser.parseFromString(xmlContent, 'text/xml');
        const moduleInfo = this.extractModuleInfo(doc);
        const functionsInfo = this.extractFunctionsInfo(doc);
        
        return this.formatDocument(moduleInfo, functionsInfo);
    }

    extractModuleInfo(doc) {
        const moduleNode = doc.getElementsByTagName('xqdoc:module')[0];
        return {
            uri: this.extractTextContent(moduleNode, 'xqdoc:uri'),
            name: this.extractTextContent(moduleNode, 'xqdoc:name'),
            description: this.extractTextContent(moduleNode, 'xqdoc:description')
        };
    }

    extractFunctionsInfo(doc) {
        const functions = doc.getElementsByTagName('xqdoc:function');
        return Array.from(functions).map(func => ({
            name: this.extractTextContent(func, 'xqdoc:name'),
            signature: this.extractTextContent(func, 'xqdoc:signature'),
            description: this.extractTextContent(func, 'xqdoc:description'),
            returns: this.extractTextContent(func, 'xqdoc:return')
        }));
    }

    formatDocument(moduleInfo, functionsInfo) {
        let content = [];
        
        functionsInfo.forEach(func => {
            // Create separate documents for each function
            content.push(
                `FUNCTION: ${func.name}\n` +
                `SIGNATURE: ${func.signature}\n` +
                `DESCRIPTION: ${func.description}\n` +
                `RETURNS: ${func.returns}\n` +
                `MODULE: ${moduleInfo.name}\n` +
                `MODULE_URI: ${moduleInfo.uri}`
            );
        });

        return content.join('\n\n');
    }
}

class XMLPreprocessingLoader extends TextLoader {
    constructor(filePath) {
        if (!filePath) {
            throw new Error('File path is required for XMLPreprocessingLoader');
        }
        super(filePath);
        this.processor = new XMLDocumentProcessor();
        this.filePath = filePath; // Ensure filePath is explicitly stored
    }

    async load() {
        try {
            logger.info(`Processing XML file: ${this.filePath}`);
            const content = readFileSync(this.filePath, 'utf8');
            const processedContent = this.processor.processXMLContent(content);
            return processedContent.split('\n\n').map(functionDoc => ({
                pageContent: functionDoc,
                metadata: {
                    source: this.filePath,
                    type: 'xml',
                    functionName: functionDoc.match(/FUNCTION: (.*?)\n/)?.[1] || '',
                    moduleName: functionDoc.match(/MODULE: (.*?)\n/)?.[1] || ''
                }
            }));
        } catch (error) {
            logger.error(`Error processing XML file ${this.filePath}: ${error}`);
            throw error;
        }
    }
}

async function initializeVectorStore() {
    try {
        // Ensure directories exist
        if (!existsSync(VECTOR_STORE_PATH)) {
            mkdirSync(VECTOR_STORE_PATH, { recursive: true });
        }
        if (!existsSync(MODULES_PATH)) {
            mkdirSync(MODULES_PATH, { recursive: true });
        }

        // Initialize embeddings
        const embeddings = new OpenAIEmbeddings({
            model: "text-embedding-3-small",
            maxConcurrency: 5
        });

        // Configure text splitter
        const textSplitter = new RecursiveCharacterTextSplitter({
            chunkSize: 2000,
            chunkOverlap: 200,
            separators: ["\n\n", "\n", " ", ""]
        });

        // Set up document loader
        logger.info(`Loading documents from: ${MODULES_PATH}`);
        const loader = new DirectoryLoader(
            MODULES_PATH,
            {
                ".xml": (path) => {
                    logger.info(`Creating loader for: ${path}`);
                    return new XMLPreprocessingLoader(path);
                }
            }
        );
        
        // Load and process documents
        logger.info("Loading and processing XML documents...");
        const rawDocs = await loader.load();
        logger.info(`Loaded ${rawDocs.length} documents`);

        // Split documents into chunks
        const docs = await textSplitter.splitDocuments(rawDocs);
        logger.info(`Split into ${docs.length} chunks for vectorization`);

        // Create and save vector store
        logger.info("Creating vector store...");
        const vectorStore = await FaissStore.fromDocuments(docs, embeddings);
        await vectorStore.save(VECTOR_STORE_PATH);
        logger.info(`Vector store successfully saved to ${VECTOR_STORE_PATH}`);

        return vectorStore;
    } catch (error) {
        logger.error(`Failed to initialize vector store: ${error}`);
        throw error;
    }
}

// Execute initialization
initializeVectorStore()
    .then(() => logger.info("Vector store initialization completed successfully"))
    .catch(error => {
        logger.error("Vector store initialization failed");
        process.exit(1);
    });