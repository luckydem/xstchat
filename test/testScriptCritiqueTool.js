import { ScriptCritiqueTool } from "../tools/ScriptCritiqueTool.js";

const tool = new ScriptCritiqueTool();

const lastScript = `
xquery version "3.1";

let $orders := collection('/db/orders')/order
return count($orders)
`;

const feedback = `Error: collection '/db/orders' not found.`;

(async () => {
  try {
    const result = await tool._call(JSON.stringify({ lastScript, feedback }));
    console.log("\n🧠 Critique Prompt:\n", result);
  } catch (err) {
    console.error("❌ Error testing ScriptCritiqueTool:\n", err);
  }
})();
