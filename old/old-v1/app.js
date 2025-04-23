import dotenv from "dotenv";
import { input } from '@inquirer/prompts';
import { connect } from '@existdb/node-exist';
import { OpenAIEmbeddings, ChatOpenAI } from "@langchain/openai";
import { createStuffDocumentsChain } from "langchain/chains/combine_documents";
import { createRetrievalChain } from "langchain/chains/retrieval";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { FaissStore } from "@langchain/community/vectorstores/faiss";

dotenv.config();

// Adjustable global variables
const MAX_ATTEMPTS = 5;
const RETURN_LIMIT = 50;

const FAILED_ATTEMPTS = [];
let FAILED_COUNT = 0;
let USER_QUERY;

const SUCCESSFUL_RESPONSES = [];

const db = connect({
    basic_auth: { user: 'admin', pass: process.env.EXIST_PASS },
    protocol: 'http:',    
    host: 'localhost',
    port: '8080',
    path: '/exist/xmlrpc'

});

// load the vector store (created using /helpers)
const vectorStore = await FaissStore.load("helpers/vector_store", new OpenAIEmbeddings({
    model: "text-embedding-3-small"
}));

// Create a retriever from the vector store
// const retriever = vectorStore.asRetriever({ k: 6, searchType: "similarity" });
const retriever = vectorStore.asRetriever();

async function generateXQuery(input) {

    if( FAILED_COUNT >= MAX_ATTEMPTS) {
        
        console.log(`More than ${MAX_ATTEMPTS} attempts:`)
        console.log("Previous attempts:")
        FAILED_ATTEMPTS.forEach((attempt, index) => {
            console.log(`Attempt: ${index + 1}`)
            console.log(`  Error:\n${attempt.error}`)
            console.log(`  xQuery:\n${attempt.xquery}`)
        })
        return;
    } else {
        let assistantContent = '';

        let previousErrors = ''; 
        if (FAILED_ATTEMPTS.length !== 0) {
            previousErrors = 'Here are previous errors and the xquery that caused them:' 
            FAILED_ATTEMPTS.forEach((attempt) => {
                previousErrors += 
                    `
                    Error: ${attempt.error.toString()},
                    xQuery: ${attempt.xquery.toString()}
                    `
            })
            assistantContent += previousErrors + "\n"
        }
        let previousQueries = '';
        if (SUCCESSFUL_RESPONSES.length !== 0) {
            previousQueries = "Your previous queries and results are: "
            SUCCESSFUL_RESPONSES.forEach((success) => {
                previousQueries += 
                    `
                    Input: ${success.userInput}, 
                    xQuery: ${success.xquery}, 
                    Result: ${success.result}`;
            })
            assistantContent += previousQueries + "\n"
        }

        
        // Create a system prompt
        const systemPrompt = 
        ` You are an expert on eXist-db, xquery and exist-db error handling.
        Please DO NOT use any markdown syntax in your response at all and respond with json only.

        ---

        ${assistantContent}

        ---
        Always use the following output json schema: 
        Key: "reason",
        Value: "The reason for the XQuery expression.",
        Key: "xquery",
        Value: "The XQuery expression, always starting with 'xquery version "3.1";' Use subsequence to limit the search to ${RETURN_LIMIT}. always declare namespaces for the functions you're using and import the namespaces correctly",
        Key: "resultType"
        Value: "A name that clearly defines what was returned, for example if the returned results was a list of collection names, the word could be 'Collections' or if the result would be files names, the 'Files' or if the result would XML, then XML"
        ---

        {context}
        `

        console.log("SYSTEM PROMPT:")
        console.log(systemPrompt)

        // Instantiate the prompt
        const prompt = ChatPromptTemplate.fromMessages([
            ["system", systemPrompt],
            ["human", "{input}"]
        ])

        // Instantiate the language model
        const llm = new ChatOpenAI({ 
            model: "gpt-4o-mini", 
            temperature: 0 
        })
        
        const questionAnswerChain = await createStuffDocumentsChain({
            llm,
            prompt
        })
        
        const ragChain = await createRetrievalChain({
            retriever,
            combineDocsChain: questionAnswerChain
        })
        
        const response = await ragChain.invoke({
            input: input
        })
        
        console.log("AI Response:");
        console.log(response.answer)
        return response.answer;
    }

}

async function executeXQuery(responseObject) {
    const xquery = responseObject.xquery
    
    console.log(`xQuery Attempt: ${FAILED_COUNT + 1 }`)
    try {
                
        console.log(`Query:\n${xquery}`)

        const result = await db.queries.readAll(xquery, {});
        const resultString = result.pages.map(page => page.toString()).join("\n ")
        console.log(`Return Type: ${responseObject.resultType}`)
        console.log(`Query Result:\n${resultString}`);

        const resultBuffer = Buffer.concat(result.pages).toString()
        console.log('Query Result:', resultBuffer);
        FAILED_COUNT = 0;
        return resultString;
    } catch (error) {
        console.log('The above function did not work. Trying again')
        FAILED_ATTEMPTS.push({xquery: xquery, error: error});
        FAILED_COUNT += 1;
        const response = await generateXQuery(USER_QUERY);

        return await executeXQuery(response);
    }
}

async function startCLI() {
    let isRunning = true;

    while (isRunning) {
        USER_QUERY = await input({message: 'Enter your request:'});

        if(USER_QUERY.toLocaleLowerCase() === "exit") {
            console.log("Goodbye!")
            isRunning = false;
        } else {
            console.log("----------------------------")
            const response = await generateXQuery(USER_QUERY);
            const responseJSON = JSON.parse(response);

            if (response !== undefined) {
                const queryResult = await executeXQuery(responseJSON);
                SUCCESSFUL_RESPONSES.push({userInput: USER_QUERY, xquery: responseJSON.xquery, result: queryResult})
            }
            
            console.log("----------------------------")
        }        
    }    
}

startCLI();