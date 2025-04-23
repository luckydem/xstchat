import fetch from "node-fetch"; // Ensure you have node-fetch installed
import { load } from "cheerio"; // Assuming you want to parse the HTML
// import { CheerioWebBaseLoader } from "@langchain/community/document_loaders/web/cheerio";

async function loadPage(url) {
    const controller = new AbortController();
    
    const timeoutId = setTimeout(() => controller.abort(), 20000); // Set timeout to 20 seconds

    try {
        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const body = await response.text();
        const $ = load(body);
        // Process the loaded HTML with Cheerio as needed
        console.log("Page loaded successfully");

        console.log($)
    } catch (error) {
        clearTimeout(timeoutId);
        console.error("Error loading page:", error);
    }
}

loadPage("http://localhost:8080/exist/apps/fundocs/view.html?uri=http://exist-db.org/xquery/xmldb&location=java:org.exist.xquery.functions.xmldb.XMLDBModule");

