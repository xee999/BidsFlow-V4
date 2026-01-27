import { GoogleGenerativeAI, SchemaType, GenerateContentResponse } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.API_KEY!);

/**
 * Utility to wrap AI calls with retry logic for 503 (Overloaded) and 429 (Rate Limit) errors.
 */
const callAIWithRetry = async <T>(fn: () => Promise<T>, maxRetries = 5, initialDelay = 1500): Promise<T> => {
  let lastError: any;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error: any) {
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

export const analyzeBidSecurityDocument = async (fileContentBase64: string, mimeType: string, requirement: string, customerName: string, tcvInclTax: number) => {
  try {
    const model = genAI.getGenerativeModel({
      model: 'gemini-3-flash-preview',
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: SchemaType.OBJECT,
          properties: {
            amount: { type: SchemaType.NUMBER },
            issuanceDate: { type: SchemaType.STRING },
            beneficiaryName: { type: SchemaType.STRING },
            bankName: { type: SchemaType.STRING },
            isAmountCorrect: { type: SchemaType.BOOLEAN },
            isBeneficiaryCorrect: { type: SchemaType.BOOLEAN },
            aiAssessment: { type: SchemaType.STRING }
          },
          required: ["amount", "issuanceDate", "beneficiaryName", "bankName", "isAmountCorrect", "isBeneficiaryCorrect", "aiAssessment"]
        }
      }
    });

    const result = await callAIWithRetry(() => model.generateContent({
      contents: [{
        role: 'user',
        parts: [
          { inlineData: { data: fileContentBase64, mimeType } },
          { text: `Scan this Bid Security instrument.\nContext: Beneficiary="${customerName}", Req="${requirement}", BidPrice="${tcvInclTax}".\n\nExtract precisely:\n1. Bank Name\n2. Document Date\n3. Amount (numeric)\n4. Beneficiary Name\n5. isAmountCorrect (boolean): compare extracted to ${requirement} and ${tcvInclTax}.\n6. isBeneficiaryCorrect (boolean): compare extracted to ${customerName}.\n7. aiAssessment: One short sentence on compliance.` }
        ]
      }]
    }));

    return JSON.parse(result.response.text());
  } catch (error) {
    console.error("Bid Security Analysis failed:", error);
    return null;
  }
};

export const indexVaultDocument = async (fileName: string, contentBase64: string) => {
  try {
    const model = genAI.getGenerativeModel({
      model: 'gemini-3-flash-preview',
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: SchemaType.OBJECT,
          properties: {
            category: { type: SchemaType.STRING },
            tags: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
            summary: { type: SchemaType.STRING }
          },
          required: ["category", "tags", "summary"]
        }
      }
    });

    const result = await callAIWithRetry(() => model.generateContent({
      contents: [{
        role: 'user',
        parts: [
          { inlineData: { data: contentBase64, mimeType: 'application/pdf' } },
          { text: `Analyze document for category, 6 tags, and 1-sentence summary.` }
        ]
      }]
    }));
    return JSON.parse(result.response.text());
  } catch (error) {
    console.error("Vault Indexing failed:", error);
    return null;
  }
};

export const extractProposalOutline = async (tenderContentBase64: string) => {
  try {
    const model = genAI.getGenerativeModel({
      model: 'gemini-3-flash-preview',
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: SchemaType.OBJECT,
          properties: {
            sections: {
              type: SchemaType.ARRAY,
              items: {
                type: SchemaType.OBJECT,
                properties: {
                  id: { type: SchemaType.STRING },
                  title: { type: SchemaType.STRING },
                  description: { type: SchemaType.STRING }
                },
                required: ["id", "title"]
              }
            }
          },
          required: ["sections"]
        }
      }
    });

    const result = await callAIWithRetry(() => model.generateContent({
      contents: [{
        role: 'user',
        parts: [
          { inlineData: { data: tenderContentBase64, mimeType: 'application/pdf' } },
          { text: `Extract RFP response structure chapters and titles.` }
        ]
      }]
    }));
    return JSON.parse(result.response.text());
  } catch (error) {
    return { sections: [] };
  }
};

export const draftProposalSection = async (sectionTitle: string, sectionDescription: string, bid: any, documentContext: string) => {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-3-flash-preview' });
    const result = await callAIWithRetry(() => model.generateContent(`Draft technical proposal for: "${sectionTitle}".`));
    return result.response.text().trim();
  } catch (error) {
    return "AI drafting unavailable.";
  }
};

export const analyzeBidDocument = async (fileName: string, fileContentBase64: string) => {
  try {
    console.log(`Analyzing Bid Document: ${fileName} (${Math.round(fileContentBase64.length / 1024)} KB)`);
    const model = genAI.getGenerativeModel({
      model: 'gemini-3-flash-preview',
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
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
            complexity: { type: SchemaType.STRING, description: "Low, Medium, or High" },
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
                  specs: { type: SchemaType.STRING, description: "Technical specs, model numbers, or performance metrics." },
                  category: { type: SchemaType.STRING }
                },
                required: ["item", "quantity", "specs"]
              }
            },
            scopeOfWork: { type: SchemaType.STRING },
            summaryRequirements: { type: SchemaType.STRING },
            technicalQualificationChecklist: {
              type: SchemaType.ARRAY,
              description: "Exhaustive list of all technical requirements, specs, SLAs, and technical evaluation criteria.",
              items: {
                type: SchemaType.OBJECT,
                properties: {
                  requirement: { type: SchemaType.STRING },
                  type: { type: SchemaType.STRING, description: "Mandatory or Optional" },
                  aiComment: { type: SchemaType.STRING, description: "Brief reason why this is a technical requirement." }
                },
                required: ["requirement", "type", "aiComment"]
              }
            },
            complianceList: {
              type: SchemaType.ARRAY,
              description: "Exhaustive list of all general, legal, financial, and administrative compliance requirements.",
              items: {
                type: SchemaType.OBJECT,
                properties: {
                  requirement: { type: SchemaType.STRING },
                  description: { type: SchemaType.STRING, description: "Brief explanation of the requirement." },
                  isMandatory: { type: SchemaType.BOOLEAN }
                },
                required: ["requirement", "description", "isMandatory"]
              }
            },
            financialFormats: {
              type: SchemaType.ARRAY,
              description: "Extracted Bill of Quantities (BOQ) or Schedule of Prices.",
              items: {
                type: SchemaType.OBJECT,
                properties: {
                  item: { type: SchemaType.STRING, description: "Title or Short Name of the item/service." },
                  description: { type: SchemaType.STRING, description: "Full technical description if available." },
                  uom: { type: SchemaType.STRING, description: "Unit of Measurement (e.g., Lot, Unit, Monthly, Year)." },
                  quantity: { type: SchemaType.NUMBER, description: "Quantity required." }
                },
                required: ["item", "uom", "quantity"]
              }
            }
          },
          required: ["customerName", "projectName", "deadline", "estimatedValue", "currency", "contractDuration", "customerPaymentTerms", "bidSecurity", "requiredSolutions", "aiQualificationSummary", "scopeOfWork", "summaryRequirements", "technicalQualificationChecklist", "complianceList", "financialFormats"]
        }
      }
    });

    const result = await callAIWithRetry(() => model.generateContent({
      contents: [{
        role: 'user',
        parts: [
          { inlineData: { data: fileContentBase64, mimeType: 'application/pdf' } },
          {
            text: `ACT AS A SENIOR BID MANAGER. YOUR MISSION: THOROUGHLY EXTRACT EVERY SINGLE COMPLIANCE REQUIREMENT FROM THIS TENDER.

EXTRACT AND CATEGORIZE AS FOLLOWS:

1. TECHNICAL COMPLIANCE (technicalQualificationChecklist): 
   - Extract EVERY technical specification, performance SLA, hardware/software requirement, implementation timeline, and technical qualification.
   - Comb through all sections: SOW, Technical Specs, Annexures.
   - DO NOT MISS ANYTHING TECHNICAL.

2. GENERAL COMPLIANCE (complianceList): 
   - Extract EVERY administrative, legal, financial, and boilerplate requirement.
   - Include: Bid Security details, ISO certifications, company registration documents, tax clearances, health & safety policies, litigation history requirements, insurance needs.
   - DO NOT MISS ANYTHING ADMINISTRATIVE OR LEGAL.

3. BILL OF QUANTITIES / PRICING TABLE (financialFormats):
   - Locate the 'Schedule of Prices', 'Price Schedule', or 'BOQ' sections.
   - Extract EVERY item listed with its Unit of Measurement (UOM) and Quantity.
   - For services, Quantity might be 1 (Lot). For hardware, it's the count.
   - DO NOT extract unit prices or total prices from the RFP yet, just the structure (items, descriptions, UOM, and qty).

MANDATORY DATA FIELDS:
- Submission Deadline: Look for 'Closing Date', 'Submission Date', or 'Deadline'. Format as YYYY-MM-DD.
- Contract Duration: Look for 'Period', 'Years', 'Months', or 'Duration'. PREFERRED: Number of DAYS. Alternately: Use max 3-4 words (e.g. "24 Months").
- Customer Payment Terms: Look for 'Payment Terms', 'Net', or 'Days'. PREFERRED: Number of DAYS. Alternately: Use max 3-4 words (e.g. "Net 45 Days").
- Bid Security: Look for 'Earnest Money', 'Bid Bond', 'Security', or 'Guarantee'. Extract the amount or %.
- Pre-Bid Meeting: MANDATORY. Extract Date, Time, Location, and if it's Mandatory. Search exhaustively for the meeting date.
- Deliverables Summary: Identify physical hardware, connectivity links, or distinct services. Extract Name, Quantity, AND Key Technical Specifications/Specs for each.
- Required Solutions: Match terms from: Quantica, GSM Data, M2M (Devices Only), IoT, IT Devices (Laptop/Desktop), Mobile Devices (Phone or Tablet), CPaaS, Cloud Solutions, Fixed Connectivity, System Integration.
- Publish Date: The date the tender was released.
- Complexity: Assess based on scale and requirements (Low/Medium/High).
- Scope of Work & Project Brief: Provide comprehensive summaries.
- BOQ: Exhaustive list of all line items required in the financial response.

THOROUGHNESS IS CRITICAL. IF A REQUIREMENT OR PRICING ITEM IS MENTIONED IN ANY SECTION OR ANNEXURE, IT MUST BE EXTRACTED.` }
        ]
      }]
    }));
    return JSON.parse(result.response.text());
  } catch (error) {
    throw error;
  }
};

export const analyzeComplianceDocuments = async (criteria: string, checklist: any[], documents: any[]) => {
  try {
    const model = genAI.getGenerativeModel({
      model: 'gemini-3-flash-preview',
      generationConfig: {
        responseMimeType: "application/json",
        maxOutputTokens: 8192,
        responseSchema: {
          type: SchemaType.OBJECT,
          properties: {
            updatedChecklist: {
              type: SchemaType.ARRAY,
              items: {
                type: SchemaType.OBJECT,
                properties: {
                  id: { type: SchemaType.STRING },
                  status: { type: SchemaType.STRING },
                  aiComment: { type: SchemaType.STRING }
                }
              }
            }
          }
        }
      }
    });

    const docParts = documents
      .filter(d => d.fileData && d.fileData.length > 100)
      .slice(0, 50)
      .map(d => ({ inlineData: { data: d.fileData, mimeType: 'application/pdf' } }));

    if (documents.length > docParts.length) {
      console.warn(`Filtered out ${documents.length - docParts.length} invalid/empty PDF(s) from analysis.`);
    }

    if (docParts.length === 0) {
      console.warn("Compliance Analysis skipped: No valid documents found.");
      return null;
    }

    const result = await callAIWithRetry(() => model.generateContent({
      contents: [{
        role: 'user',
        parts: [
          ...docParts,
          {
            text: `ACT AS A SENIOR COMPLIANCE AUDITOR. 
          
          I have provided documents from a technical proposal folder (some may be 300+ pages).
          YOUR TASK: Perform a DEEP SCAN across every page and document to find evidence for each item in the provided checklist.
          
          CHECKLIST TO EVALUATE (Strictly map your response to the provided 'id'):
          ${JSON.stringify(checklist)}
          
          CONTEXT (RFP Summary): ${criteria}
          
          GUIDELINES:
          1. SEARCH: Check every page for evidence of fulfillment for each checklist item.
          2. MARK COMPLETE: If explicit evidence is found, set status to 'Complete'.
          3. ID MATCHING: Your response MUST return the 'id' of the checklist item. DO NOT return the requirement text.
          4. CITATIONS: In 'aiComment', you MUST specify: [Document Name] - Page [Number]. Keep comment VERY BRIEF (max 15 words).
          5. EXHAUSTIVE: Scan the entire 300+ pages.
          6. FORMAT: Return ONLY the JSON matching the provided schema (id, status, aiComment). Only include items you have marked as 'Complete'.` }
        ]
      }]
    }));
    const text = result.response.text();
    console.log("AI Compliance Response Received:", text.substring(0, 500) + "...");
    return JSON.parse(text);
  } catch (error) {
    console.error("Compliance Analysis Error (Detailed):", error);
    return null;
  }
};

export const tagTechnicalDocuments = async (documents: any[]) => {
  try {
    const model = genAI.getGenerativeModel({
      model: 'gemini-3-flash-preview',
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: SchemaType.OBJECT,
          properties: {
            taggedFiles: {
              type: SchemaType.ARRAY,
              items: {
                type: SchemaType.OBJECT,
                properties: {
                  fileName: { type: SchemaType.STRING },
                  tags: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
                  summary: { type: SchemaType.STRING }
                }
              }
            }
          }
        }
      }
    });

    const fileList = documents.map(d => d.name).join(', ');
    const result = await callAIWithRetry(() => model.generateContent(`Analyze these filenames from a technical bid and provide 2-3 smart tags and 1-sentence summary for each: ${fileList}`));
    return JSON.parse(result.response.text());
  } catch (error) {
    return null;
  }
};

export const analyzePricingDocument = async (fileContentBase64: string, duration: string, formats: any[], mimeType: string = 'application/pdf') => {
  try {
    const model = genAI.getGenerativeModel({
      model: 'gemini-3-flash-preview',
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: SchemaType.OBJECT,
          properties: {
            tcvExclTax: { type: SchemaType.NUMBER },
            tcvInclTax: { type: SchemaType.NUMBER },
            vendorPaymentTerms: { type: SchemaType.STRING },
            contractDuration: { type: SchemaType.STRING },
            customerPaymentTerms: { type: SchemaType.STRING },
            populatedFinancialFormat: {
              type: SchemaType.ARRAY,
              items: {
                type: SchemaType.OBJECT,
                properties: {
                  item: { type: SchemaType.STRING },
                  description: { type: SchemaType.STRING },
                  uom: { type: SchemaType.STRING },
                  quantity: { type: SchemaType.NUMBER },
                  unitPrice: { type: SchemaType.NUMBER }
                }
              }
            }
          }
        }
      }
    });

    const result = await callAIWithRetry(() => model.generateContent({
      contents: [{
        role: 'user',
        parts: [
          { inlineData: { data: fileContentBase64, mimeType } },
          {
            text: `ACT AS A FINANCIAL ANALYST. EXTRACT BID PRICING DATA.
          
          CONTEXT:
          - Pre-extracted BOQ structure: ${JSON.stringify(formats)}
          - Contract Duration: ${duration}
          
          YOUR TASK:
          1. Map the unit prices from the uploaded document to the items in the pre-extracted BOQ structure.
          2. Calculate TCV (Total Contract Value) Excl. Tax and Incl. Tax (assume 17% tax if not specified).
          3. Extract payment terms and verify contract duration.
          
          If an item in the uploaded document doesn't match the pre-extracted BOQ, include it as a new item in populatedFinancialFormat.` }
        ]
      }]
    }));
    return JSON.parse(result.response.text());
  } catch (error) {
    return null;
  }
};

/**
 * Sanitizes the context object by removing large strings (like base64 data) 
 * to prevent overwhelming the AI context window or hitting size limits.
 */
const sanitizeContext = (obj: any): any => {
  if (Array.isArray(obj)) {
    return obj.map(sanitizeContext);
  } else if (obj !== null && typeof obj === 'object') {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      // Remove fileData or any strings longer than 2000 characters
      if (key === 'fileData' && typeof value === 'string') {
        sanitized[key] = `[REMOVED: ${value.length} chars]`;
      } else if (typeof value === 'string' && value.length > 2000) {
        sanitized[key] = value.substring(0, 500) + `... [TRUNCATED: ${value.length} total chars]`;
      } else {
        sanitized[key] = sanitizeContext(value);
      }
    }
    return sanitized;
  }
  return obj;
};

export const chatWithBidAssistant = async (question: string, context: any) => {
  try {
    const sanitizedContext = sanitizeContext(context);
    const model = genAI.getGenerativeModel({ model: 'gemini-3-flash-preview' });
    const result = await callAIWithRetry(() => model.generateContent(`Context: ${JSON.stringify(sanitizedContext)}. User: ${question}.`));
    return result.response.text();
  } catch (err: any) {
    console.error("AI Assistant Error:", err);
    return "Unavailable.";
  }
};

export const analyzeNoBidReasons = async (noBidData: any[]) => {
  try {
    const model = genAI.getGenerativeModel({
      model: 'gemini-3-flash-preview',
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: SchemaType.OBJECT,
          properties: {
            categories: {
              type: SchemaType.ARRAY,
              items: {
                type: SchemaType.OBJECT,
                properties: {
                  header: { type: SchemaType.STRING },
                  description: { type: SchemaType.STRING },
                  projects: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } }
                }
              }
            }
          }
        }
      }
    });

    const result = await callAIWithRetry(() => model.generateContent(`Analyze rejection data.`));
    return JSON.parse(result.response.text());
  } catch (error) {
    return null;
  }
};

export const generateStrategicRiskAssessment = async (bid: any) => {
  try {
    const model = genAI.getGenerativeModel({
      model: 'gemini-3-flash-preview',
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: SchemaType.OBJECT,
          properties: {
            risks: {
              type: SchemaType.ARRAY,
              items: {
                type: SchemaType.OBJECT,
                properties: {
                  category: { type: SchemaType.STRING },
                  description: { type: SchemaType.STRING },
                  severity: { type: SchemaType.STRING }
                }
              }
            },
            mitigations: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } }
          }
        }
      }
    });

    const result = await callAIWithRetry(() => model.generateContent(`Assess risks for ${bid.projectName}.`));
    return JSON.parse(result.response.text());
  } catch (error) {
    return null;
  }
};

export const analyzeSolutioningDocuments = async (bid: any, documents: any[]) => {
  try {
    const docParts = documents
      .filter(d => d.fileData && d.fileData.length > 100)
      .slice(0, 50)
      .map(d => ({ inlineData: { data: d.fileData, mimeType: 'application/pdf' } }));

    if (docParts.length === 0) {
      console.warn("Solution Analysis skipped: No valid documents found.");
      return JSON.stringify({ solutionFit: "No Data", gapAnalysis: [], recommendations: ["Please upload valid technical documents."] });
    }

    const model = genAI.getGenerativeModel({
      model: 'gemini-3-flash-preview',
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: SchemaType.OBJECT,
          properties: {
            solutionFit: { type: SchemaType.STRING, description: "Yes, Partial, or No" },
            fitExplanation: { type: SchemaType.STRING },
            gapAnalysis: {
              type: SchemaType.ARRAY,
              items: {
                type: SchemaType.OBJECT,
                properties: {
                  component: { type: SchemaType.STRING },
                  gap: { type: SchemaType.STRING },
                  impact: { type: SchemaType.STRING }
                }
              }
            },
            recommendations: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } }
          },
          required: ["solutionFit", "fitExplanation", "gapAnalysis", "recommendations"]
        }
      }
    });

    const result = await callAIWithRetry(() => model.generateContent({
      contents: [{
        role: 'user',
        parts: [
          ...docParts,
          {
            text: `ACT AS A SOLUTION ARCHITECT.
          
          CONTEXT:
          Project: ${bid.projectName}
          Customer: ${bid.customerName}
          Scope of Work: ${bid.scopeOfWork}
          
          YOUR TASK:
          Review the provided technical solution documents and compare them against the Project Scope.
          
          OUTPUT IN JSON:
          1. solutionFit: Yes/Partial/No.
          2. fitExplanation: Brief executive summary of the fit.
          3. gapAnalysis: List specific missing components or risks.
          4. recommendations: Actionable improvements.` }
        ]
      }]
    }));
    return result.response.text();
  } catch (error) {
    return JSON.stringify({ solutionFit: "Error", gapAnalysis: [], recommendations: ["AI Analysis Failed."] });
  }
};

export const generateFinalRiskAssessment = async (bid: any, documents: any[]) => {
  try {
    const docParts = documents
      .filter(d => d.fileData)
      .slice(0, 50)
      .map(d => ({ inlineData: { data: d.fileData, mimeType: 'application/pdf' } }));

    const model = genAI.getGenerativeModel({
      model: 'gemini-3-flash-preview',
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: SchemaType.OBJECT,
          properties: {
            risks: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
            mitigations: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
            overallAssessment: { type: SchemaType.STRING }
          }
        }
      }
    });

    const result = await callAIWithRetry(() => model.generateContent({
      contents: [{
        role: 'user',
        parts: [...docParts, { text: `Evaluate readiness.` }]
      }]
    }));
    return JSON.parse(result.response.text());
  } catch (error) {
    return null;
  }
};