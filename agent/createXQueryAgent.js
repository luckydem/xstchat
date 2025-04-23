import { initializeAgentExecutorWithOptions } from "langchain/agents";
import { OpenAI } from "@langchain/openai"; // Or any other LLM
import { FunctionSearchTool } from "../tools/FunctionSearchTool.js";
import { ScriptExecutionTool } from "../tools/ScriptExecutionTool.js";
import { ScriptCritiqueTool } from "../tools/ScriptCritiqueTool.js";

export async function createXQueryAgent({ vectorStore, existDbApi }) {
  const tools = [
    new FunctionSearchTool({ vectorStore }),
    new ScriptExecutionTool({ existDbApi }),
    new ScriptCritiqueTool()
  ];

  const llm = new OpenAI({ temperature: 0.2 });

  const executor = await initializeAgentExecutorWithOptions(tools, llm, {
    agentType: "zero-shot-react-description",
    verbose: true,
  });

  return executor;
}
