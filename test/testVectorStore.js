import { vectorStore } from "../vectorStores/vectorStore.js";
import dotenv from "dotenv";
dotenv.config();

const testQuery = "How do I list collections in eXist-db?";

(async () => {
  try {
    const store = await vectorStore()
    const results = await store.similaritySearch(testQuery, 5, {
                minScore: 0.7
            });

    console.log("Top Similar Results:");
    results.forEach((res, i) => {
      console.log(`\n[${i + 1}] Score: ${res.score || 'N/A'}`);
      console.log("Text:", res.pageContent);
      console.log("Metadata:", res.metadata);
    });
  } catch (err) {
    console.error("Error querying vector store:\n", err);
  }
})();