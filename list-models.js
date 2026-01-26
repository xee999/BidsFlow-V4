import { GoogleGenerativeAI } from "@google/generative-ai";
import fs from 'fs';

const envContent = fs.readFileSync(".env.local", "utf8");
const apiKeyMatch = envContent.match(/GEMINI_API_KEY=(.*)/);
const apiKey = apiKeyMatch ? apiKeyMatch[1].trim() : null;

if (!apiKey) {
    process.exit(1);
}

const genAI = new GoogleGenerativeAI(apiKey);

async function listModels() {
    console.log("Listing models...");
    try {
        // Note: The SDK might not have a direct listModels, we might need to hit the endpoint
        // Actually, let's try to fetch from the v1 endpoint directly
        const resp = await fetch(`https://generativelanguage.googleapis.com/v1/models?key=${apiKey}`);
        const data = await resp.json();
        console.log("Available Models (v1):", JSON.stringify(data, null, 2));

        const respBeta = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
        const dataBeta = await respBeta.json();
        console.log("Available Models (v1beta):", JSON.stringify(dataBeta, null, 2));
    } catch (error) {
        console.error("Error listing models:", error.message);
    }
}

listModels();
