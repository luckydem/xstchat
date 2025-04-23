import { Tool } from "langchain/tools";

export class FunctionSearchTool extends Tool {
    constructor({ vectorStore }) {
        super();
        this.name = "FunctionSearch";
        this.description = "Searches the function documentation for relevant XQuery functions.";
        this.vectorStore = vectorStore;
    }

    async _call(query) {
        // Use more advanced search with metadata filtering
        const results = await this.vectorStore.similaritySearch(query, 5);
        
        // Format results in a more structured way
        return results.map(doc => {
            const content = doc.pageContent;
            const sections = content.split('\n')
                .reduce((acc, line) => {
                    const [key, ...value] = line.split(': ');
                    acc[key] = value.join(': ');
                    return acc;
                }, {});
            
            return `Function: ${sections.FUNCTION}\n` +
                   `Signature: ${sections.SIGNATURE}\n` +
                   `Description: ${sections.DESCRIPTION}`;
        }).join('\n\n---\n\n');
    }
}