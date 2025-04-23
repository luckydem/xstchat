// Import necessary modules
import dotenv from 'dotenv';
import { OpenAIEmbeddings, ChatOpenAI } from "@langchain/openai";
import { createStuffDocumentsChain } from "langchain/chains/combine_documents";
import { createRetrievalChain } from "langchain/chains/retrieval";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { FaissStore } from "@langchain/community/vectorstores/faiss";

// Load environment variables
dotenv.config();

const RETURN_LIMIT = 50;


// load the vector store (created using /helpers)
const vectorStore = await FaissStore.load("./helpers/vector_store", new OpenAIEmbeddings({
  model: "text-embedding-3-small"
}));

// Create a retriever from the vector store
// const retriever = vectorStore.asRetriever({ k: 6, searchType: "similarity" });
const retriever = vectorStore.asRetriever();

// Create a system prompt
const systemPrompt = 
  ` You are an expert on eXist-db, xquery and exist-db error handling.
    Please DO NOT use any markdown syntax in your response at all and respond with json only.

    ---
    Always use the following output json schema: 
    Key: "reason",
    Value: "The reason for the XQuery expression.",
    Key: "xquery",
    Value: "The XQuery expression, always starting with 'xquery version "3.1";' Use subsequence to limit the search to ${RETURN_LIMIT}.",
    Key: "resultType"
    Value: "A name that clearly defines what was returned, for example if the returned results was a list of collection names, the word could be 'Collections' or if the result would be files names, the 'Files' or if the result would XML, then XML"
    ---

    {context}
    `.trim()

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
  input: "what function would I use to get the collection names from /db/apps/fimsData?"
})

console.log(response.answer);
