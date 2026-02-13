
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import dotenv from 'dotenv';
dotenv.config({ path: '.env.production' });

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.API_KEY;
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

const PRIMARY_MODEL = 'gemini-2.5-pro';
const FALLBACK_MODEL = 'gemini-2.5-pro'; // Both same for test

const schema = {
    type: SchemaType.OBJECT,
    properties: {
        customerName: { type: SchemaType.STRING },
        projectName: { type: SchemaType.STRING },
        deadline: { type: SchemaType.STRING },
        estimatedValue: { type: SchemaType.NUMBER },
        currency: { type: SchemaType.STRING },
        contractDuration: { type: SchemaType.STRING },
        customerPaymentTerms: { type: SchemaType.STRING },
        bidSecurity: { type: SchemaType.STRING },
        requiredSolutions: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
        aiQualificationSummary: { type: SchemaType.STRING },
        publishDate: { type: SchemaType.STRING },
        complexity: { type: SchemaType.STRING },
        jvAllowed: { type: SchemaType.BOOLEAN },
        preBidMeeting: {
            type: SchemaType.OBJECT,
            properties: {
                date: { type: SchemaType.STRING },
                time: { type: SchemaType.STRING },
                location: { type: SchemaType.STRING },
                isMandatory: { type: SchemaType.BOOLEAN },
                notes: { type: SchemaType.STRING }
            },
            required: ["date", "time", "location", "isMandatory"]
        },
        deliverablesSummary: {
            type: SchemaType.ARRAY,
            items: {
                type: SchemaType.OBJECT,
                properties: {
                    item: { type: SchemaType.STRING },
                    quantity: { type: SchemaType.STRING },
                    specs: { type: SchemaType.STRING },
                    category: { type: SchemaType.STRING }
                },
                required: ["item", "quantity", "specs"]
            }
        },
        scopeOfWork: { type: SchemaType.STRING },
        summaryRequirements: { type: SchemaType.STRING },
        technicalQualificationChecklist: {
            type: SchemaType.ARRAY,
            items: {
                type: SchemaType.OBJECT,
                properties: {
                    requirement: { type: SchemaType.STRING },
                    type: { type: SchemaType.STRING },
                    aiComment: { type: SchemaType.STRING }
                },
                required: ["requirement", "type", "aiComment"]
            }
        },
        complianceList: {
            type: SchemaType.ARRAY,
            items: {
                type: SchemaType.OBJECT,
                properties: {
                    requirement: { type: SchemaType.STRING },
                    description: { type: SchemaType.STRING },
                    isMandatory: { type: SchemaType.BOOLEAN }
                },
                required: ["requirement", "description", "isMandatory"]
            }
        },
        financialFormats: {
            type: SchemaType.ARRAY,
            items: {
                type: SchemaType.OBJECT,
                properties: {
                    item: { type: SchemaType.STRING },
                    description: { type: SchemaType.STRING },
                    uom: { type: SchemaType.STRING },
                    quantity: { type: SchemaType.NUMBER }
                },
                required: ["item", "uom", "quantity"]
            }
        }
    },
    required: ["customerName", "projectName", "deadline", "estimatedValue", "currency", "contractDuration", "customerPaymentTerms", "bidSecurity", "requiredSolutions", "aiQualificationSummary", "scopeOfWork", "summaryRequirements", "technicalQualificationChecklist", "complianceList", "financialFormats", "jvAllowed"]
};

const promptText = `MANDATORY COMPLIANCE & QUALIFICATION EXTRACTION PROTOCOL:
... (trimmed for script) ...
- Scope of Work: Provide a comprehensive summary of the project scope.
- Strategic Brief (summaryRequirements): Provide a concise strategic summary of the project. MANDATORY: The summary MUST be between 50 to 70 words. Do not exceed 70 words.`;

async function testAI() {
    console.log(`Testing with model: ${PRIMARY_MODEL}`);
    try {
        const model = genAI.getGenerativeModel({
            model: PRIMARY_MODEL,
            generationConfig: {
                responseMimeType: "application/json",
                maxOutputTokens: 32768,
                responseSchema: schema
            }
        });

        const result = await model.generateContent("Analyze this dummy text: Project X for Customer Y. Deadline 2026-12-31. Value 100M PKR. Duration 2 years. Payment 30 days. Security 2%. Solutions: IoT. JV allowed: Yes. Meeting 2026-11-30 at 10 AM, Mandatory. Deliverables: 10 Laptops. SOW: Install stuff. Summary: Strategic brief.");
        console.log("Response Received:");
        console.log(result.response.text());
    } catch (e) {
        console.error("AI Error:", e.message);
    }
}

testAI();
