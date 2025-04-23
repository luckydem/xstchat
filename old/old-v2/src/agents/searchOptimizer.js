import { ChatOpenAI } from "@langchain/openai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { logger } from "../../logger.js";
import dotenv from 'dotenv';

dotenv.config();

const searchOptimizerLLM = new ChatOpenAI({
    model: "gpt-4-turbo-preview",
    temperature: 0.2
});

const searchPromptTemplate = ChatPromptTemplate.fromMessages([
    ["system", `You are an expert at optimizing search queries for XQuery function discovery. 
    Your task is to analyze the user's query and previous attempts to generate the most effective search terms.
    
    Consider:
    - The core functionality being requested
    - Specific XQuery technical terms that might match relevant functions
    - Previous failed attempts to avoid similar paths
    - Successful patterns from previous working queries
    
    Return a focused, technical search query that will help find the most relevant XQuery functions.`],
    ["human", `User Query: {userQuery}
    
    Previous Successful Attempts:
    {successfulAttempts}
    
    Previous Failed Attempts:
    {failedAttempts}
    
    Generate an optimized search query to find the most relevant XQuery function.`]
]);

export async function optimizeSearchQuery(userQuery, previousAttempts) {
    try {
        const response = await searchPromptTemplate
            .pipe(searchOptimizerLLM)
            .invoke({
                userQuery,
                successfulAttempts: JSON.stringify(previousAttempts.successful),
                failedAttempts: JSON.stringify(previousAttempts.failed)
            });
            
        return response.content;
    } catch (error) {
        logger.error(`Error optimizing search query: ${error}`);
        throw error;
    }
}