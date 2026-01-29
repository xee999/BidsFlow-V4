import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import dotenv from 'dotenv';
dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.API_KEY || process.env.GEMINI_API_KEY);

const PRIMARY_MODEL = 'gemini-2.5-pro';
const FALLBACK_MODEL = 'gemini-2.5-flash';

const callAIWithRetry = async (fn, maxRetries = 5, initialDelay = 1500) => {
    let lastError;
    for (let i = 0; i < maxRetries; i++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error;
            const errorMsg = error?.message || "";
            const isRetryable =
                error?.status === 503 ||
                error?.status === 429 ||
                errorMsg.includes('503') ||
                errorMsg.includes('429') ||
                errorMsg.toLowerCase().includes('overloaded') ||
                errorMsg.toLowerCase().includes('unavailable');

            if (isRetryable && i < maxRetries - 1) {
                const delay = (initialDelay * Math.pow(2, i)) + (Math.random() * 1000);
                console.warn(`Gemini API Busy (Attempt ${i + 1}/${maxRetries}). Retrying in ${Math.round(delay)}ms...`);
                await new Promise(resolve => setTimeout(resolve, delay));
                continue;
            }
            throw error;
        }
    }
    throw lastError;
};

export const analyzeBidDocumentServer = async (fileName, fileContentBase64) => {
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
        required: ["customerName", "projectName", "deadline", "estimatedValue", "currency", "contractDuration", "customerPaymentTerms", "bidSecurity", "requiredSolutions", "aiQualificationSummary", "scopeOfWork", "summaryRequirements", "technicalQualificationChecklist", "complianceList", "financialFormats"]
    };

    const promptText = `MANDATORY COMPLIANCE & QUALIFICATION EXTRACTION PROTOCOL:
- EXHAUSTIVE MODE: You MUST extract EVERY SINGLE requirement. If the RFP has 50 compliance items, you extract 50. DO NOT summarize or group them.
- ZERO OMISSIONS: Failure to extract a requirement mentioned in the document is a critical failure.
- SCAN ALL SECTIONS: Check Instructions to Bidders, SOW, Terms & Conditions, Annexures, and Evaluation Criteria.

EXTRACT AND CATEGORIZE AS FOLLOWS:

1. TECHNICAL COMPLIANCE (technicalQualificationChecklist): 
   - Extract EVERY technical specification, performance SLA, hardware/software requirement, implementation timeline, and technical qualification.
   - DO NOT MISS ANYTHING TECHNICAL.

2. GENERAL COMPLIANCE (complianceList): 
   - Extract EVERY administrative, legal, financial, and boilerplate requirement.
   - Include: Bid Security details, ISO certifications, company registration documents, tax clearances, health & safety policies, litigation history requirements, insurance needs.

3. BILL OF QUANTITIES / PRICING TABLE (financialFormats):
   - Extract EVERY item listed with its Unit of Measurement (UOM) and Quantity.
   - DO NOT extract unit prices yet, just the structure (items, descriptions, UOM, and qty).

MANDATORY DATA FIELDS:
- Submission Deadline: Format as YYYY-MM-DD.
- Contract Duration: MANDATORY: Always convert to and return as Number of DAYS only (e.g. "912" instead of "2.5 Years").
- Customer Payment Terms: PREFERRED: Number of DAYS.
- Bid Security: Extract amount or %.
- Pre-Bid Meeting: MANDATORY. Extract Date, Time, Location, and if it's Mandatory.
- Deliverables Summary: Extract Name, Quantity, AND Key Technical Specifications for each.
- Required Solutions: Match from: Quantica, GSM Data, M2M (Devices Only), IoT, IT Devices (Laptop/Desktop), Mobile Devices (Phone or Tablet), CPaaS, Cloud Solutions, Fixed Connectivity, System Integration.
- Publish Date: Tender release date.
- Complexity: Assessment based on (>50M PKR = High, 25-50M = Medium, <25M = Low), also consider: multi-vendor coordination, physical surveys needed, complex document sourcing, higher approval authority.
- Scope of Work & Project Brief: Provide comprehensive summaries.`;

    const prompt = [{
        role: 'user',
        parts: [
            { inlineData: { data: fileContentBase64, mimeType: 'application/pdf' } },
            { text: promptText }
        ]
    }];

    try {
        const model = genAI.getGenerativeModel({
            model: PRIMARY_MODEL,
            generationConfig: {
                responseMimeType: "application/json",
                maxOutputTokens: 32768,
                responseSchema: schema
            }
        });

        const result = await callAIWithRetry(() => model.generateContent({ contents: prompt }), 3, 2000);
        const responseText = result.response.text();
        return JSON.parse(responseText);
    } catch (error) {
        console.error("Server-side AI analysis failed, trying fallback:", error.message);
        try {
            const fallbackModel = genAI.getGenerativeModel({
                model: FALLBACK_MODEL,
                generationConfig: {
                    responseMimeType: "application/json",
                    maxOutputTokens: 32768,
                    responseSchema: schema
                }
            });
            const result = await callAIWithRetry(() => fallbackModel.generateContent({ contents: prompt }), 3, 1000);
            const responseText = result.response.text();
            return JSON.parse(responseText);
        } catch (fallbackError) {
            console.error("Fallback AI failed too:", fallbackError.message);
            throw new Error(`AI Analysis failed: ${fallbackError.message}`);
        }
    }
};
