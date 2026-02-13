import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import dotenv from 'dotenv';
dotenv.config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.API_KEY;

if (!GEMINI_API_KEY) {
    if (process.env.NODE_ENV === 'production') {
        console.error("FATAL: GEMINI_API_KEY is missing.");
    } else {
        console.warn("WARNING: GEMINI_API_KEY is missing. AI features will fail.");
    }
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

const PRIMARY_MODEL = 'gemini-2.5-pro';
const FALLBACK_MODEL = 'gemini-2.5-pro';

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
            estimatedValue: { type: SchemaType.STRING }, // Changed from NUMBER to STRING
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
                        quantity: { type: SchemaType.STRING } // Changed from NUMBER to STRING
                    },
                    required: ["item", "uom", "quantity"]
                }
            }
        },
        required: ["customerName", "projectName", "deadline", "estimatedValue", "currency", "contractDuration", "customerPaymentTerms", "bidSecurity", "requiredSolutions", "aiQualificationSummary", "scopeOfWork", "summaryRequirements", "technicalQualificationChecklist", "complianceList", "financialFormats", "jvAllowed"]
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
- Required Solutions: Match from: Quantica, GSM Data, M2M (Devices Only), IoT, IT Devices (Laptop/Desktop), Mobile Devices (Phone or Tablet), CPaaS, Cloud & IT, Managed Services, Fixed Connectivity, System Integration.
- SOLUTION CLASSIFICATION MAPPING (Strictly Categorize into "Required Solutions"):
  1. Cloud & IT: Use for Productivity Suite (ITSM, M365, Dynamics, Azure, AWS), Hardware Reselling (Servers, NGFW, Storage, Network), Colocation Datacenters, IaaS/BC, DevOps (Kubernetes, CI/CD, Monitoring).
  2. Managed Services: Use for Network Security (DNS, NGFW as Service, DDoS, WAF), Endpoint Security (EDR/XDR, Patch Mgmt), IAM (PAM, MFA), MSSP (Monitoring, SIEM/SOAR, VAPT, Compromised Assessment), DBaaS.
  3. System Integration (SI): Use for Business Applications (RPA/Agentic, ESM, App Managed Services, Big Data, ERP/CRM), Communication Solutions (Contact Center), Network Solutions (SDWAN, Firewall Mgmt), Infrastructure Solutions (Private Cloud, HCI).
  4. Other: Map others based on name (e.g., IoT to IoT).
- Publish Date: Tender release date.
- JV Allowed: MANDATORY. Determine if Joint Venture or Consortium is allowed by the customer based on eligibility clauses. Return true if allowed, false otherwise.
- Complexity: Assessment based on (>50M PKR = High, 25-50M = Medium, <25M = Low), also consider: multi-vendor coordination, physical surveys needed, complex document sourcing, higher approval authority.
- Scope of Work: Provide a comprehensive summary of the project scope.
- Strategic Brief (summaryRequirements): Provide a concise strategic summary of the project. MANDATORY: The summary MUST be between 50 to 70 words. Do not exceed 70 words.`;

    const prompt = [{
        role: 'user',
        parts: [
            { inlineData: { data: fileContentBase64, mimeType: 'application/pdf' } },
            { text: promptText }
        ]
    }];

    // Helper to run generation. returns { result, isFallback: boolean }
    const runGeneration = async (modelName, useSchema = true) => {
         const model = genAI.getGenerativeModel({
            model: modelName,
            generationConfig: {
                responseMimeType: "application/json",
                maxOutputTokens: 32768,
                ...(useSchema ? { responseSchema: schema } : {})
            }
        });
        return await callAIWithRetry(() => model.generateContent({ contents: prompt }), 3, 2000);
    };

    try {
        console.log(`[AI] Starting primary analysis with ${PRIMARY_MODEL} for ${fileName}...`);
        const result = await runGeneration(PRIMARY_MODEL, true);
        console.log(`[AI] Primary analysis complete for ${fileName}.`);
        return JSON.parse(result.response.text());
    } catch (error) {
        console.error("Server-side AI analysis failed (" + error.message + "), trying fallback strategy...");
        
        try {
            console.log("Attempting fallback with " + FALLBACK_MODEL + "...");
            // Use Schema again in fallback first? Or relax it immediately?
            // If the error was "string did not match pattern", the schema is the problem.
            // But if it was a timeout, schema might be fine.
            // Let's assume pattern error means we should drop schema.
            // But we can't easily detect error type from message reliably across versions.
            // Safe bet: Try with schema first on fallback model (if it was just a glitch).
            // Actually, since PRIMARY and FALLBACK are same model, just retrying with same schema is redundant if it's a deterministic validation error.
            // So, let's try WITHOUT schema in fallback.
            
            console.log("Fallback: Retrying WITHOUT strict schema enforcement...");
            const result = await runGeneration(FALLBACK_MODEL, false);
            
             // Clean output
             let text = result.response.text();
             text = text.replace(/```json/g, '').replace(/```/g, '').trim();
             return JSON.parse(text);

        } catch (fallbackError) {
             console.error("Fallback AI failed too:", fallbackError.message);
             // Final desperate attempt if needed? No, 2 attempts is enough.
             throw new Error(`AI Analysis failed: ${fallbackError.message}`);
        }
    }
};
