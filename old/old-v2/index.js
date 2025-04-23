import dotenv from 'dotenv';
import { input } from '@inquirer/prompts';
import { connect } from '@existdb/node-exist';
import { ChatOpenAI } from "@langchain/openai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { loadVectorStore, searchFunctions } from './vectorStore.js';
import { logger } from './logger.js';
import { XQueryResponseSchema } from './schemas.js';
import { StructuredOutputParser } from "langchain/output_parsers"


dotenv.config();

const MAX_ATTEMPTS = 5;
const RETURN_LIMIT = 50;

const FAILED_ATTEMPTS = [];
let FAILED_COUNT = 0;
let USER_QUERY;
let SUCCESSFUL_RESPONSES = [];
let SUCCESSFUL_COUNT = 0;

const db = connect({
    basic_auth: { user: 'admin', pass: process.env.EXIST_PASS },
    protocol: 'http:',    
    host: 'localhost',
    port: '8080',
    path: '/exist/xmlrpc'
});

// Initialize LangChain components
const llm = new ChatOpenAI({ 
    model: "gpt-4o-mini",
    temperature: 0,
    
});

const outputParser = StructuredOutputParser.fromZodSchema(XQueryResponseSchema);
const formatInstructions = outputParser.getFormatInstructions();

const promptTemplate = ChatPromptTemplate.fromMessages([
    ["system", `You are an expert on eXist-db and XQuery. You have access to a comprehensive vector store containing documentation for all available XQuery functions in eXist-db, including:
                - Core XQuery functions
                - eXist-db specific extension functions
                - xmldb module functions
                - Full-text search functions
                - Collection management functions
                - Index functions
                
                The documentation entries are provided with similarity scores indicating their relevance to the query.
                Scores above 90% indicate highly relevant functions.
                Scores between 70-90% indicate moderately relevant functions.
                
                Generate XQuery expressions that:
                - Prioritize functions with higher similarity scores
                - Use eXist-db friendly functions
                - Must start with 'xquery version "3.1";'
                - Limit results to ${RETURN_LIMIT} using subsequence() unless specified otherwise
                - Use xmldb module functions where possible
                - If the function has been used in the "PREVIOUS FAILED ATTEMPTS" as per below, always try a different function
                - In your description, include your reasoning for using the chosen function and reference the similarity score

                Context from eXist-db documentation (with relevance scores): {context}`],
    ["human", "{query}"]
]);

async function generateXQuery(userQuery) {
    if (FAILED_COUNT > MAX_ATTEMPTS) {
        logger.error("Exceeded maximum attempts");
        return null;
    }

    try {
        const vectorStore = await loadVectorStore();
        const similarDocs = await searchFunctions(userQuery, vectorStore, {
            successful: SUCCESSFUL_RESPONSES,
            failed: FAILED_ATTEMPTS
        });
        
        // If no acceptable functions were found
        if (similarDocs.length === 0) {
            logger.info("No suitable functions found, retrying with alternative search...");
            // Use the suggested alternative search from the last validation
            const lastValidation = similarDocs[0]?.validation;
            if (lastValidation?.suggestedAlternativeSearch) {
                return generateXQuery(lastValidation.suggestedAlternativeSearch);
            }
        }

        let successfulAttemptString = "";
        if(SUCCESSFUL_COUNT > 0) {
            successfulAttemptString = "##PREVIOUS SUCCESSFUL ATTEMPTS:\n\n" + SUCCESSFUL_RESPONSES.map(attempt => `Userinput:\n${attempt.userInput} xQuery:\n${attempt.xquery}\n error:\n${attempt.result}`) + "\n\n"
        }

        let failedAttemptString = "";
        if(FAILED_COUNT > 0) {
            failedAttemptString = "##PREVIOUS FAILED ATTEMPTS:\n\n" + FAILED_ATTEMPTS.map(attempt => `xQuery:\n${attempt.xquery}. error:\n${attempt.error}`) + "\n\n"
        }
        const context = `${successfulAttemptString}${failedAttemptString}
        xquery Documentation (sorted by relevance):
        ${similarDocs.map(doc => 
            `[Similarity: ${doc.similarityScore}]
            ${doc.pageContent}
            -------------------`).join('\n\n')}`;

        console.debug(`*********************** \nCONTEXT:\n ${context}\n\n***********************`)

        const structuredLlm = llm.withStructuredOutput(XQueryResponseSchema)        

        const response = await promptTemplate
            .pipe(structuredLlm)
            .invoke({
                query: userQuery,
                context: context
            });

        // The response will now be a clean object matching our schema
        logger.info(`Generated XQuery: ${response.description}`);
        
        return response.xquery;

    } catch (error) {
        logger.error(`Error generating XQuery: ${error}`);
        FAILED_COUNT++;
        if (FAILED_COUNT <= MAX_ATTEMPTS) {
            logger.info("Retrying query generation...");
            return generateXQuery(userQuery);
        }
        throw error;
    }
}

async function executeXQuery(xquery) {
    try {
        logger.info(`Executing query attempt ${FAILED_COUNT + 1}`);
        logger.info(`\n*************\n${xquery}\n*************`)
        
        const result = await db.queries.readAll(xquery, {});
        const resultString = result.pages.map(page => page.toString()).join("\n");
        
        logger.info(`result: ${resultString}`)
        return resultString;
    } catch (error) {
        FAILED_ATTEMPTS.push({ xquery, error });
        FAILED_COUNT++;
        if (FAILED_COUNT <= MAX_ATTEMPTS) {
            logger.info("Retrying with new query generation...");
            const newQuery = await generateXQuery(USER_QUERY);
            return executeXQuery(newQuery);
        }
        throw error;
    }
}

async function startCLI() {
    const vectorStore = await loadVectorStore();
    logger.info("Vector store loaded successfully");

    let isRunning = true;
    while (isRunning) {
        USER_QUERY = await input({message: 'Enter your request (or "exit" to quit):'});

        if (USER_QUERY.toLowerCase() === "exit") {
            logger.info("Shutting down");
            isRunning = false;
            continue;
        }

        if (USER_QUERY.trim() === "") {
            logger.info("Query cannot be empty. Please try again.");
            continue;
        }

        try {
            const xquery = await generateXQuery(USER_QUERY);
            const result = await executeXQuery(xquery);
            SUCCESSFUL_RESPONSES.push({ 
                userInput: USER_QUERY, 
                xquery: xquery,
                result: result 
            });
            SUCCESSFUL_COUNT++
        } catch (error) {
            logger.error(`Error processing query: ${error}`);
        }
    }
}

startCLI();