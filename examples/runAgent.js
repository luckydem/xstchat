import { createXQueryAgent } from "../agent/createXQueryAgent.js";
import { vectorStore } from "../vectorStores/vectorStore.js";
import { EXIST_DB } from "../config/index.js";

const store = await vectorStore();

const agent = await createXQueryAgent({
  vectorStore: store,
  existDbApi: EXIST_DB,
});

const result = await agent.call({
  input: "util:binary-to-string the content of xquery resource in the exist-db database? for example the controller.xq resource in /db/apps/FIMS",
});

console.log("Agent Output:\n", result.output);
