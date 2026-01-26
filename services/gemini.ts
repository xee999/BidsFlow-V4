import { GoogleGenerativeAI, SchemaType, GenerateContentResponse } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.API_KEY!);

/**
 * Utility to wrap AI calls with retry logic for 503 (Overloaded) and 429 (Rate Limit) errors.
 */
const callAIWithRetry = async <T>(fn: () => Promise<T>, maxRetries = 3, initialDelay = 1500): Promise<T> => {
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
        const delay = initialDelay * Math.pow(2, i);
        console.warn(`Gemini API Busy (Attempt ${i + 1}/${maxRetries}). Retrying in ${delay}ms...`);
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
      model: 'gemini-3-pro-preview',
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
    const model = genAI.getGenerativeModel({ model: 'gemini-3-pro-preview' });
    const result = await callAIWithRetry(() => model.generateContent(`Draft technical proposal for: "${sectionTitle}".`));
    return result.response.text().trim();
  } catch (error) {
    return "AI drafting unavailable.";
  }
};

export const analyzeBidDocument = async (fileName: string, fileContentBase64: string) => {
  try {
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
                }
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
          { inlineData: { data: fileContentBase64, mimeType: 'application/pdf' } },
          {
            text: `Extract critical governance parameters from this RFP/Tender.
          
          MANDATORY SEARCH LIST:
          1. Submission Deadline: Look for 'Closing Date', 'Submission Date', or 'Deadline'. Format as YYYY-MM-DD.
          2. Contract Duration: Look for 'Period', 'Years', 'Months', or 'Duration'.
          3. Bid Security: Look for 'Earnest Money', 'Bid Bond', 'Security', or 'Guarantee'. Extract the amount or %.
          4. Required Solutions: Match terms from this list ONLY: Quantica, GSM Data, M2M (Devices Only), IoT, IT Devices (Laptop/Desktop), Mobile Devices (Phone or Tablet), CPaaS, Cloud Solutions, Fixed Connectivity.
          5. Customer Name and Project Name.` }
        ]
      }]
    }));
    return JSON.parse(result.response.text());
  } catch (error) {
    throw error;
  }
};

export const analyzeComplianceDocuments = async (criteria: string, checklist: any[], fileContentBase64: string) => {
  try {
    const model = genAI.getGenerativeModel({
      model: 'gemini-3-pro-preview',
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: SchemaType.OBJECT,
          properties: {
            updatedChecklist: {
              type: SchemaType.ARRAY,
              items: {
                type: SchemaType.OBJECT,
                properties: {
                  requirement: { type: SchemaType.STRING },
                  status: { type: SchemaType.STRING },
                  aiComment: { type: SchemaType.STRING }
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
          { inlineData: { data: fileContentBase64, mimeType: 'application/pdf' } },
          { text: `Check document against compliance checklist.` }
        ]
      }]
    }));
    return JSON.parse(result.response.text());
  } catch (error) {
    return null;
  }
};

export const analyzePricingDocument = async (fileContentBase64: string, duration: string, formats: any[]) => {
  try {
    const model = genAI.getGenerativeModel({
      model: 'gemini-3-pro-preview',
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
          { inlineData: { data: fileContentBase64, mimeType: 'application/pdf' } },
          { text: `Extract full BOQ and pricing.` }
        ]
      }]
    }));
    return JSON.parse(result.response.text());
  } catch (error) {
    return null;
  }
};

export const chatWithBidAssistant = async (question: string, context: any) => {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-3-flash-preview' });
    const result = await callAIWithRetry(() => model.generateContent(`Context: ${JSON.stringify(context)}. User: ${question}.`));
    return result.response.text();
  } catch (err) {
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
      model: 'gemini-3-pro-preview',
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
      .filter(d => d.fileData)
      .slice(0, 10)
      .map(d => ({ inlineData: { data: d.fileData, mimeType: 'application/pdf' } }));
    if (docParts.length === 0) return "No documents.";

    const model = genAI.getGenerativeModel({ model: 'gemini-3-pro-preview' });
    const result = await callAIWithRetry(() => model.generateContent({
      contents: [{
        role: 'user',
        parts: [...docParts, { text: `Analyze architecture.` }]
      }]
    }));
    return result.response.text();
  } catch (error) {
    return "Analysis unavailable.";
  }
};

export const generateFinalRiskAssessment = async (bid: any, documents: any[]) => {
  try {
    const docParts = documents
      .filter(d => d.fileData)
      .slice(0, 10)
      .map(d => ({ inlineData: { data: d.fileData, mimeType: 'application/pdf' } }));

    const model = genAI.getGenerativeModel({
      model: 'gemini-3-pro-preview',
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