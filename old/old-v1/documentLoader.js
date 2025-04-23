import { CheerioWebBaseLoader } from "@langchain/community/document_loaders/web/cheerio";
import { ChatOpenAI } from "@langchain/openai";
import { CheerioWebBaseLoader } from "@langchain/community/document_loaders/web/cheerio";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { OpenAIEmbeddings } from "@langchain/openai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { createRetrievalChain } from "langchain/chains/retrieval";
import { createStuffDocumentsChain } from "langchain/chains/combine_documents";



const llm = new ChatOpenAI({
  model: "gpt-4o-mini",
  temperature: 0
});


async function loadPage(url) {
    const loader = new CheerioWebBaseLoader(url)

    try {
        const docs = await loader.load();
    
        console.log(docs.length)
        console.log(docs[0].pageContent.length);

        return docs
    } catch (error) {
        console.error("Error loading page:", error);
    }    
}

const docs = await loadPage("http://localhost:8080/exist/apps/fundocs/view.html?uri=http://exist-db.org/xquery/xmldb&location=java:org.exist.xquery.functions.xmldb.XMLDBModule")

// loadPage("https://dev.to/thecodingcutie/unlocking-web-data-with-langchain-a-deep-dive-into-web-loaders-4e6l")

console.log(docs)