import { ChatOpenAI } from "@langchain/openai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { logger } from "../../logger.js";
import dotenv from 'dotenv';

dotenv.config();

// Define the expected response structure
const responseSchema = {
    type: "object",
    properties: {
        isAcceptable: { type: "boolean" },
        confidence: { type: "number" },
        reasoning: { type: "string" },
        suggestedAlternativeSearch: { type: "string" }
    },
    required: ["isAcceptable", "confidence", "reasoning"]
};

const validatorLLM = new ChatOpenAI({
    model: "gpt-4-turbo-preview",
    temperature: 0.1
});

const validatorPromptTemplate = ChatPromptTemplate.fromMessages([
    ["system", `You are an expert XQuery function validator. Analyze the provided function and return a structured assessment.
    Your response must be valid JSON matching this format:
    {
        "isAcceptable": boolean,
        "confidence": number between 0-100,
        "reasoning": string explanation,
        "suggestedAlternativeSearch": optional string if not acceptable
    }`],
    ["human", `Please evaluate this XQuery function:

Function Documentation: {functionDoc}
Similarity Score: {similarityScore}
Previous Failed Attempts: {failedAttempts}

Consider:
1. The similarity score (>90% excellent, 70-90% acceptable)
2. Function signature and return type
3. Implementation complexity
4. Previous failed attempts with similar functions`]
]);

export async function validateFunction(functionDoc, similarityScore, failedAttempts) {
    try {
        const chain = validatorPromptTemplate.pipe(validatorLLM);
        const response = await chain.invoke({
            functionDoc,
            similarityScore: `${(similarityScore * 100).toFixed(2)}%`,
            failedAttempts: JSON.stringify(failedAttempts || [])
        });

        try {
            const result = JSON.parse(response);
            // Validate required fields
            if (typeof result.isAcceptable !== 'boolean' ||
                typeof result.confidence !== 'number' ||
                typeof result.reasoning !== 'string') {
                throw new Error('Invalid response format');
            }
            return result;
        } catch (parseError) {
            logger.error(`Error parsing validator response: ${parseError}`);
            // Return a default response if parsing fails
            return {
                isAcceptable: false,
                confidence: 0,
                reasoning: "Failed to parse validator response",
                suggestedAlternativeSearch: "Try a more specific search term"
            };
        }
    } catch (error) {
        logger.error(`Error validating function: ${error}`);
        throw error;
    }
}