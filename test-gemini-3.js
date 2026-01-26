import { GoogleGenerativeAI } from "@google/generative-ai";
import fs from 'fs';

const envContent = fs.readFileSync(".env.local", "utf8");
const apiKeyMatch = envContent.match(/GEMINI_API_KEY=(.*)/);
const apiKey = apiKeyMatch ? apiKeyMatch[1].trim() : null;

if (!apiKey) {
    process.exit(1);
}

const genAI = new GoogleGenerativeAI(apiKey);

async function testModel(modelName) {
    console.log(`Testing model: ${modelName}...`);
    try {
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent("Hello, say 'OK' if you hear me.");
        console.log(`Result for ${modelName}:`, result.response.text());
        return true;
    } catch (error) {
        console.error(`Error for ${modelName}:`, error.message);
        return false;
    }
}

async function runTests() {
    const models = ["gemini-3-flash-preview", "gemini-3-pro-preview", "gemini-3-pro-image-preview", "gemini-2.5-flash-preview"];
    for (const m of models) {
        await testModel(m);
    }
}

runTests();
