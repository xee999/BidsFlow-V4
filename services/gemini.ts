import { GoogleGenerativeAI, SchemaType, GenerateContentResponse, Part, Content } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.API_KEY!);

// Model configuration
const PRIMARY_MODEL = 'gemini-2.5-pro';
const FALLBACK_MODEL = 'gemini-2.5-flash';

// Event for toast notifications (will be picked up by UI)
export type AINotification = {
  type: 'info' | 'warning' | 'success' | 'error';
  message: string;
};

let notificationCallback: ((notification: AINotification) => void) | null = null;

export const setAINotificationCallback = (callback: (notification: AINotification) => void) => {
  notificationCallback = callback;
};

const notify = (notification: AINotification) => {
  if (notificationCallback) {
    notificationCallback(notification);
  }
};

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
      model: 'gemini-2.5-pro',
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
      model: 'gemini-2.5-pro',
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
      model: 'gemini-2.5-pro',
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
                  description: { type: SchemaType.STRING },
                  type: { type: SchemaType.STRING, description: "narrative, form, table, or annexure" }
                },
                required: ["id", "title", "description", "type"]
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
          {
            text: `ACT AS A SENIOR BID MANAGER. SCAN THIS RFP DOCUMENT.
          
          YOUR TASK:
          1. Extract the full response structure requested by the customer.
          2. Identify Technical Solution and Financial Solution chapters.
          3. MANDATORY: Identify every Annexure, Bid Form, Affidavit, and Certificate mentioned.
          4. For each section, provide a 'type' (narrative, form, table, or annexure) and a detailed 'description' of what needs to be produced.
          
          Output as a JSON object with 'sections' array.` }
        ]
      }]
    }));
    return JSON.parse(result.response.text());
  } catch (error) {
    console.error("Outline extraction failed:", error);
    return { sections: [] };
  }
};

export const draftProposalSection = async (sectionTitle: string, sectionDescription: string, bid: any, documentContext: string) => {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-pro' });

    const bidContext = `
      Project: ${bid.projectName}
      Customer: ${bid.customerName}
      Scope of Work: ${bid.scopeOfWork}
      Solutions: ${bid.requiredSolutions.join(', ')}
      Deliverables: ${(bid.deliverablesSummary || []).map((d: any) => `${d.item} (Qty: ${d.quantity})`).join(', ')}
    `;

    const prompt = `ACT AS A TECHNICAL PROPOSAL WRITER & DOCUMENT ENGINEER.
    
    YOUR OBJECTIVE:
    Draft a high-fidelity technical response for the section: "${sectionTitle}".
    
    INSTRUCTIONS / REQUIREMENTS:
    - ${sectionDescription}
    - UTILIZE CONTEXT: Use the following project data and technical documents to accurately fill in details:
      PROJECT CONTEXT: ${bidContext}
      TECHNICAL SOURCES: ${documentContext}
    
    OUTPUT PROTOCOL:
    1. If the section is a FORM, ANNEXURE, or TABLE:
       - REPRODUCE the exact layout using Markdown tables or structured fields.
       - POPULATE it with data from the sources.
       - Use "N/A" only if no data is available.
    2. If the section is NARRATIVE:
       - Write professional, persuasive technical content.
       - Use Markdown for hierarchy (###, ####), **bolding**, and bullet points.
    3. BRANDING: Maintain a professional, executive tone for "Jazz Business".
    
    GO!`;

    const result = await callAIWithRetry(() => model.generateContent(prompt));
    return result.response.text().trim();
  } catch (error) {
    console.error("Drafting failed:", error);
    return "AI drafting unavailable.";
  }
};

export const analyzeBidDocument = async (fileName: string, fileContentBase64: string) => {
  try {


    const response = await fetch('/api/ai/analyze-bid', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileName, fileContentBase64 })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Server-side AI analysis failed');
    }

    const result = await response.json();
    notify({
      type: 'success',
      message: `AI analysis completed successfully.`
    });
    return result;
  } catch (error: any) {
    console.error("Analysis Error:", error);
    notify({
      type: 'error',
      message: `AI analysis failed: ${error.message || 'Network error'}. Please try again.`
    });
    throw error;
  }
};

export const analyzeComplianceDocuments = async (criteria: string, checklist: any[], documents: any[]) => {
  try {
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-pro',
      generationConfig: {
        responseMimeType: "application/json",
        maxOutputTokens: 16384,
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

    return JSON.parse(text);
  } catch (error) {
    console.error("Compliance Analysis Error (Detailed):", error);
    return null;
  }
};

export const tagTechnicalDocuments = async (documents: any[]) => {
  try {
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-pro',
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
      model: 'gemini-2.5-pro',
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
          3. Extract payment terms and verify contract duration. MANDATORY: Always convert contract duration to and return as Number of YEARS only (e.g. "2.5" instead of "912 days", "2" instead of "730 days").
          
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
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-pro' });
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
      model: 'gemini-2.5-pro',
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
      model: 'gemini-2.5-pro',
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

    const result = await callAIWithRetry(() => model.generateContent({
      contents: [{
        role: 'user',
        parts: [{
          text: `ACT AS A SENIOR STRATEGIC RISK ANALYST.
          
          PROJECT CONTEXT:
          - Project Name: ${bid.projectName}
          - Customer: ${bid.customerName}
          - Summary: ${bid.summaryRequirements}
          - Scope of Work: ${bid.scopeOfWork}
          - Compliance Items: ${(bid.complianceChecklist || []).map((c: any) => c.requirement).join(', ')}
          - Technical Items: ${(bid.technicalQualificationChecklist || []).map((t: any) => t.requirement).join(', ')}
          
          YOUR TASK:
          1. IDENTIFY FRICTION POINTS: Look for high-risk elements in the SOW or Compliance requirements (e.g., tight deadlines, complex SLAs, missing credentials).
          2. ASSESS SEVERITY: Categorize as High (Showstopper) or Medium (Needs Mitigation).
          3. MITIGATION PLAN: Provide 3-5 high-priority, actionable steps to address the identified risks.
          
          Return your findings in JSON format.`
        }]
      }]
    }));
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
      model: 'gemini-2.5-pro',
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
  } catch (error) {
    console.error("Solution Analysis error:", error);
    return JSON.stringify({
      solutionFit: "Error",
      fitExplanation: "AI Alignment analysis encountered an issue. This can happen if the documents are too large or the service is temporarily overloaded.",
      gapAnalysis: [{ component: "General", gap: "Analysis unavailable", impact: "High" }],
      recommendations: ["Check your internet connection.", "Try re-running the check in a few moments.", "Ensure PDFs are not password protected."]
    });
  }
};

export const generateFinalRiskAssessment = async (bid: any, documents: any[]) => {
  try {
    const docParts = documents
      .filter(d => d.fileData)
      .slice(0, 50)
      .map(d => ({ inlineData: { data: d.fileData, mimeType: 'application/pdf' } }));

    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-pro',
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
        parts: [
          ...docParts,
          {
            text: `ACT AS A FINAL BID GOVERNANCE REVIEWER.
          
          PROJECT: ${bid.projectName}
          TCV: ${bid.tcvInclTax || 'TBD'}
          
          YOUR TASK:
          Based on all provided documents (Proposal, Pricing, Compliance docs), evaluate the final readiness of this bid.
          1. Highlight any remaining gaps or missing documents.
          2. Provide an overall readiness assessment (e.g., "Ready for Submission" or "Critical Gaps").
          3. List final 3-5 mitigation steps if any risks remain.` }
        ]
      }]
    }));
    return JSON.parse(result.response.text());
  } catch (error) {
    return null;
  }
};