import { Tool } from "langchain/tools";

export class ScriptCritiqueTool extends Tool {
  constructor() {
    super();
    this.name = "CritiqueScript";
    this.description = "Refines an XQuery script based on output or error message.";
  }

  async _call(input) {
    const { lastScript, feedback } = JSON.parse(input);
    return `Refine this XQuery based on the feedback:\n\n${lastScript}\n\nFeedback:\n${feedback}`;
  }
}
