import { optimizeSearchQuery } from './src/agents/searchOptimizer.js';
import { validateFunction } from './src/agents/functionValidator.js';
import { FaissStore } from "@langchain/community/vectorstores/faiss";
import { OpenAIEmbeddings, ChatOpenAI } from "@langchain/openai";
import { logger } from "./logger.js";
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';
import { ChatPromptTemplate } from "@langchain/core/prompts";

const __dirname = dirname(fileURLToPath(import.meta.url));

export async function loadVectorStore(storePath = "./helpers/vector_store") {
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

export async function searchFunctions(userQuery, vectorStore, previousAttempts = { successful: [], failed: [] }) {
    try {
        // Generate optimized search query
        const optimizedQuery = await optimizeSearchQuery(userQuery, previousAttempts);

        // Perform initial search
        const searchResults = await vectorStore.similaritySearchWithScore(optimizedQuery, 5, {
            minScore: 0.7
        });

        // Validate each function
        const validatedResults = await Promise.all(
            searchResults.map(async ([doc, score]) => {
                const validation = await validateFunction(
                    doc.pageContent,
                    score,
                    previousAttempts.failed
                );

                return {
                    ...doc,
                    similarityScore: (score * 100).toFixed(2) + '%',
                    validation
                };
            })
        );

        return validatedResults
            .filter(result => result.validation.isAcceptable)
            .sort((a, b) => b.validation.confidence - a.validation.confidence);

    } catch (error) {
        logger.error(`Error in enhanced search: ${error}`);
        throw error;
    }
}