import { GoogleGenerativeAI } from "@google/generative-ai";
import fs from 'fs';

const envContent = fs.readFileSync(".env.local", "utf8");
const apiKeyMatch = envContent.match(/GEMINI_API_KEY=(.*)/);
const apiKey = apiKeyMatch ? apiKeyMatch[1].trim() : null;

if (!apiKey) {
    console.error("API Key not found in .env.local");
    process.exit(1);
}

console.log("Using API Key:", apiKey.substring(0, 10) + "...");

const genAI = new GoogleGenerativeAI(apiKey);

async function testModel(modelName) {
    console.log(`Testing model: ${modelName}...`);
    try {
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent("Hello, say 'OK' if you hear me.");
        const text = result.response.text();
        console.log(`Result for ${modelName}:`, text);
        return true;
    } catch (error) {
        console.error(`Error for ${modelName}:`, error.message);
        return false;
    }
}

async function runTests() {
    const models = ["gemini-1.5-flash", "gemini-1.5-pro", "gemini-pro", "gemini-1.0-pro"];
    for (const m of models) {
        await testModel(m);
    }
}

runTests();
