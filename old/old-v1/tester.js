// Import necessary modules from LangChain
import dotenv from 'dotenv'
import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { ChatPromptTemplate } from "@langchain/core/prompts";

dotenv.config();

// Instantiate the language model
const model = new ChatOpenAI({ model: "gpt-4o-mini", apiKey: process.env.OPENAI_API_KEY });

// Create a simple output parser
const parser = new StringOutputParser();

// Create a prompt template for translation
const systemTemplate = "Translate the following into {language}:";
const promptTemplate = ChatPromptTemplate.fromMessages([
  ["system", systemTemplate],
  ["user", "{text}"],
]);

// Combine the prompt template, model, and parser into a single chain
const llmChain = promptTemplate.pipe(model).pipe(parser);

// Function to perform translation
async function translateText(language, text) {
  const result = await llmChain.invoke({ language, text });
  console.log(`Translation: ${result}`);
}

// Example usage
translateText("italian", "hi");
