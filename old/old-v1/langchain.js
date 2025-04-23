require('dotenv').config();
require('cheerio');
const { CheerioWebBaseLoader } = require("@langchain/community/document_loaders/web/cheerio");
const { RecursiveCharacterTextSplitter } = require("langchain/text_splitter");
const { MemoryVectorStore } = require("langchain/vectorstores/memory");
const { OpenAIEmbeddings, ChatOpenAI } = require('@langchain/openai');
const { pull } = require("langchain/hub");
const { ChatPromptTemplate } = require("@langchain/core/prompts");
const { StringOutputParser } = require("@langchain/core/output_parsers");
const { createStuffDocumentsChain, CreateStuffDocumentsChain } = require("langchain/chains/combine_documents");

const loader = new CheerioWebBaseLoader(
    // "https://exist-db.org/exist/apps/fundocs/view.html?uri=http://exist-db.org/xquery/xmldb&location=java:org.exist.xquery.functions.xmldb.XMLDBModule"
    "https://google.com"
)

async function runthis() {
    const docs = await loader.load();

    const textSplitter = new RecursiveCharacterTextSplitter({
        chunkSize: 1000,
        chunkOverlap: 200
    })

    const splits = await textSplitter.splitDocuments(docs);
    const vectorStore = await MemoryVectorStore.fromDocuments(
        splits, 
        new OpenAIEmbeddings()
    )

    const retriever = vectorStore.asRetriever();
    const prompt = new ChatPromptTemplate({
        template: "Given the following documents, answer the question: {question}",
        inputVariables: ["documents", "question"],
    });

    console.log(prompt)

    const llm = new ChatOpenAI({
        apiKey: process.env.OPENAI_API_KEY,
        model: "gpt-4o-mini",
        temperature: 0
    })

    const ragChain = await createStuffDocumentsChain({
        llm,
        prompt,
        outputParser: new StringOutputParser(),
    })

    const retrievedDocs = await retriever.invoke("What is the best function to get the names of collections in a folder in the database")

    console.log(retrievedDocs)
}

runthis()