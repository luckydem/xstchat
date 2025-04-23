import { vectorStore } from "../vectorStores/vectorStore.js";
import { FunctionSearchTool } from "../tools/FunctionSearchTool.js"
import dotenv from "dotenv";
dotenv.config();

const functionSearch = "function for finding the names of collections in a collection";

(async () => {
  try {
    const store = await vectorStore();
    const tool = new FunctionSearchTool({ vectorStore: store })
    const result = await tool._call(functionSearch);
    console.log("\n🧠 Critique Prompt:\n", result);
  } catch (err) {
    console.error("❌ Error testing ScriptCritiqueTool:\n", err);
  }
})();