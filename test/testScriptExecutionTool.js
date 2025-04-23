import { ScriptExecutionTool } from "../tools/ScriptExecutionTool.js";

const tool = new ScriptExecutionTool();

const sampleQuery = `
xquery version "3.1";

let $child_collections := xmldb:get-child-collections("/db")
return count($child_collections)
`;

(async () => {
  try {
    const result = await tool._call(sampleQuery);
    console.log("XQuery Output:\n", result);
  } catch (err) {
    console.error("Error executing XQuery:\n", err);
  }
})();
