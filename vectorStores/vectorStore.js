import { FaissStore } from "@langchain/community/vectorstores/faiss";
import { OpenAIEmbeddings } from "@langchain/openai";
import { logger } from "../logger.js";
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));

export async function vectorStore(storePath = "../helpers/vector_store") {
    try {
        const embeddings = new OpenAIEmbeddings({
            model: "text-embedding-3-small"
        });
        
        const absolutePath = join(__dirname, storePath);
        
        // Check which files exist
        const hasPythonFiles = existsSync(join(absolutePath, "index.faiss"));
        const hasJSFiles = existsSync(join(absolutePath, "faiss.index"));
        
        if (!hasPythonFiles && !hasJSFiles) {
            throw new Error("No vector store files found. Run initVectorStore.js first.");
        }

        // Load the vector store with appropriate file names
        const vectorStore = await FaissStore.load(
            absolutePath,
            embeddings,
            hasPythonFiles ? {
                docstore: "index.pkl",
                index: "index.faiss"
            } : undefined
        );
        
        logger.info(`Successfully loaded vector store from ${absolutePath}`);
        return vectorStore;
    } catch (error) {
        logger.error(`Error loading vector store: ${error}`);
        throw error;
    }
}