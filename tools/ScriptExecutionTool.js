import { Tool } from "langchain/tools";
import { EXIST_DB } from "../config/index.js";

export class ScriptExecutionTool extends Tool {
  constructor({ existDb } = {}) {
    super();
    this.name = "ExecuteXQuery";
    this.description = "Executes an XQuery script using the eXist-db REST API.";
    this.existDb = existDb || EXIST_DB;
  }

  async _call(xqueryScript) {
    const preamble = 'xquery version "3.1";\n\n'
    // Add the preamble only if it's not already present
    const script = xqueryScript.trim().startsWith('xquery version "3.1";')
      ? xqueryScript
      : preamble + xqueryScript;

    const result = await this.existDb.queries.readAll(script, {});
    const resultString = result.pages.map(page => page.toString()).join("\n");    
    return `Output:\n${resultString}`;
  }
}
