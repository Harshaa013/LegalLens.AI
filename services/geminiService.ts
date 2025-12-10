import { GoogleGenAI, Type, Schema } from "@google/genai";
import { ContractAnalysis, RiskLevel, ChatMessage, Contract, ComparisonResult } from "../types";

// Note: In a real production app, this key should be proxied through a backend.
// For this demo, we assume process.env.API_KEY is available or injected.
const API_KEY = process.env.API_KEY || '';

// Schema definition for the expected output
const analysisSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    summary: {
      type: Type.STRING,
      description: "A plain-English summary of the legal contract, suitable for a non-expert.",
    },
    overallRisk: {
      type: Type.STRING,
      enum: ["Low", "Medium", "High"],
      description: "The overall risk level of the contract based on the severity of clauses.",
    },
    riskScore: {
      type: Type.INTEGER,
      description: "A numerical risk score from 0 (completely safe) to 100 (extremely risky). High risk contracts should be >70, Medium 40-70, Low <40. If not a legal document, set to 0.",
    },
    clauses: {
      type: Type.ARRAY,
      description: "A list of significant clauses found in the contract, especially those with potential risks.",
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING, description: "A unique identifier for the clause (e.g., 'clause-1')." },
          text: { type: Type.STRING, description: "The original text of the clause." },
          explanation: { type: Type.STRING, description: "A simple English explanation of what this clause means." },
          riskLevel: {
            type: Type.STRING,
            enum: ["Low", "Medium", "High"],
            description: "The risk level of this specific clause.",
          },
          riskyKeywords: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "Specific words or phrases in the text that trigger the risk.",
          },
          reason: { type: Type.STRING, description: "The type of risk (e.g., 'Payment Risk') and why it is risky." },
        },
        required: ["id", "text", "explanation", "riskLevel", "riskyKeywords", "reason"],
      },
    },
    fullText: {
      type: Type.STRING,
      description: "The full raw text transcribed from the document (OCR).",
    },
  },
  required: ["summary", "overallRisk", "riskScore", "clauses", "fullText"],
};

const comparisonSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    recommendedId: {
      type: Type.STRING,
      description: "The ID of the contract that is safer or more favorable to the user.",
    },
    reasoning: {
      type: Type.STRING,
      description: "A concise explanation of why the recommended contract is better.",
    },
    keyDifferences: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "A list of bullet points highlighting the main differences (e.g., 'Contract A has a non-compete, Contract B does not').",
    },
  },
  required: ["recommendedId", "reasoning", "keyDifferences"],
};

// Helper to handle API errors consistently
const handleGenAIError = (error: any): never => {
  console.error("GenAI Error:", error);
  let errorMessage = "An unexpected error occurred during processing.";

  if (error.message) {
    const msg = error.message.toLowerCase();
    if (msg.includes('429') || msg.includes('quota') || msg.includes('resource exhausted')) {
      errorMessage = "AI usage limit exceeded. Please try again in a few moments.";
    } else if (msg.includes('403') || msg.includes('key') || msg.includes('permission')) {
      errorMessage = "Authentication failed. Please check the system configuration.";
    } else if (msg.includes('413') || msg.includes('too large')) {
      errorMessage = "The document is too large for the AI to process.";
    } else if (msg.includes('503') || msg.includes('overloaded') || msg.includes('unavailable')) {
      errorMessage = "AI service is temporarily unavailable. Please retry.";
    } else if (msg.includes('safety') || msg.includes('blocked')) {
      errorMessage = "The document was flagged by safety settings and could not be analyzed.";
    } else if (msg.includes('json') || msg.includes('parse')) {
      errorMessage = "Received an invalid response format from AI. Please retry.";
    } else {
      errorMessage = `Processing failed: ${error.message}`;
    }
  }
  
  throw new Error(errorMessage);
};

// Helper to clean and parse JSON that might be wrapped in markdown
const parseJSONResponse = <T>(text: string | undefined): T => {
  if (!text) {
    throw new Error("Empty response from AI service.");
  }

  // Remove Markdown code block syntax if present (e.g. ```json ... ```)
  let cleanText = text.trim();
  if (cleanText.startsWith('```')) {
    cleanText = cleanText.replace(/^```(json)?\n?/i, '').replace(/```$/, '');
  }

  try {
    return JSON.parse(cleanText) as T;
  } catch (e) {
    console.error("Failed to parse JSON:", cleanText);
    throw new Error("Failed to parse AI response. The model output was not valid JSON.");
  }
};

export const analyzeContract = async (
  base64Data: string,
  mimeType: string
): Promise<ContractAnalysis> => {
  if (!API_KEY) {
    throw new Error("API Key is missing. Please set process.env.API_KEY.");
  }

  const ai = new GoogleGenAI({ apiKey: API_KEY });

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-lite",
      contents: [
        {
          role: "user",
          parts: [
            {
              inlineData: {
                mimeType: mimeType,
                data: base64Data,
              },
            },
            {
              text: `You are an expert legal aide for non-lawyers. Analyze this document.
              
              Task 1: Optical Character Recognition (OCR)
              Extract and transcribe the full text of the document into the 'fullText' field. Be as accurate as possible.

              Task 2: Document Classification & Risk Analysis
              First, determine if the document contains legal terms, obligations, or contractual language.
              
              IF THE DOCUMENT IS NOT A LEGAL CONTRACT (e.g., a receipt, a random image, a simple letter, or text without legal obligations):
              - Set 'overallRisk' to "Low".
              - Set 'riskScore' to 0.
              - In the 'summary', clearly state: "This document does not appear to contain any legal terms or binding obligations."
              - Return an empty list for 'clauses' or a single clause stating it is safe.
              
              IF IT IS A CONTRACT, strictly evaluate risk levels based on the following criteria:
              
              1. HIGH RISK (Red):
                 - Unlimited liability.
                 - Unilateral termination without cause.
                 - Waiver of rights (jury trial, class action).
                 - Automatic renewal with difficult cancellation.
              
              2. MEDIUM RISK (Amber):
                 - Ambiguous terms.
                 - Unbalanced indemnification.
                 - Long notice periods.
              
              3. LOW RISK (Green):
                 - Standard boilerplate.
                 - Mutual obligations.
                 - Clear pricing.

              Identify key clauses. For each clause:
              1. **Simple English**: Explain the clause in plain, simple English suitable for a 6th grader.
              2. **Risk Type**: In the 'reason' field, START with the type of risk (e.g., "Payment Risk", "Termination Risk", "Data Privacy Risk", "Liability Risk").
              3. **No Statutes**: Do NOT mention specific section numbers of any external law, statute, or act (e.g., do not say "Under UCC 2-207" or "Section 10 of Contract Act"). If you must refer to legal concepts, use "general contract law principles".
              4. **Disclaimer**: Implicitly suggest in the explanation that for specific legal interpretations, one should consult a lawyer.

              Return the result in the specified JSON format.`,
            },
          ],
        },
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: analysisSchema,
        temperature: 0.2,
      },
    });

    return parseJSONResponse<ContractAnalysis>(response.text);

  } catch (error) {
    handleGenAIError(error);
  }
};

export const askClauseQuestion = async (
  clauseText: string,
  question: string
): Promise<string> => {
  if (!API_KEY) return "API Key missing.";

  const ai = new GoogleGenAI({ apiKey: API_KEY });

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-lite",
      contents: `
        Context: The user is asking about a specific legal clause.
        Clause: "${clauseText}"
        
        User Question: "${question}"
        
        Answer the question simply and clearly for a layperson. Do NOT cite specific external law sections. Keep it brief.
      `,
    });

    return response.text || "Could not generate an answer.";
  } catch (error) {
    console.error("Error asking question:", error);
    // Return a soft error for chat interactions instead of throwing
    return "Sorry, I couldn't answer that right now due to a connection issue.";
  }
};

export const sendChatMessage = async (
  history: ChatMessage[],
  newMessage: string,
  contractContext: string = ''
): Promise<string> => {
  if (!API_KEY) return "API Key missing.";

  const ai = new GoogleGenAI({ apiKey: API_KEY });

  // Format history for the API
  const contents = history.map(msg => ({
    role: msg.role,
    parts: [{ text: msg.text }]
  }));

  // Add the new message
  contents.push({
    role: 'user',
    parts: [{ text: newMessage }]
  });

  const systemInstruction = `
    You are LegalLens AI, a helpful legal assistant specialized in contract analysis.
    
    ${contractContext ? `
    CURRENT CONTRACT CONTEXT:
    ${contractContext}
    
    INSTRUCTIONS:
    1. **Cite Contract Sections:** You MAY reference specific section numbers found within the document itself (e.g., "Clause 4.1 of this agreement").
    2. **NO External Statutes:** Do NOT cite specific section numbers of external laws, acts, or codes (e.g., do NOT say "Section 23 of the Contract Act"). Use "general contract law principles" instead.
    3. **Simple English:** Explain concepts simply.
    4. **Disclaimer:** Always conclude serious risk assessments with a recommendation to consult a qualified attorney.
    ` : `
    INSTRUCTIONS:
    - You are currently not viewing a specific contract.
    - Answer general legal questions or guide the user on how to use the app.
    - Remind the user they can upload a contract for specific analysis.
    `}
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash", 
      contents: contents,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.3,
      },
    });

    return response.text || "I couldn't generate a response.";
  } catch (error) {
    console.error("Error in chat:", error);
    return "Sorry, I'm having trouble connecting right now. Please try again.";
  }
};

export const compareContracts = async (
  contracts: Contract[]
): Promise<ComparisonResult> => {
  if (!API_KEY) throw new Error("API Key missing");

  const ai = new GoogleGenAI({ apiKey: API_KEY });

  // Dynamically build context for all contracts
  const contractsContext = contracts.map((c) => {
      const summary = JSON.stringify({
          id: c.id,
          name: c.fileName,
          riskScore: c.analysis?.riskScore,
          overallRisk: c.analysis?.overallRisk,
          summary: c.analysis?.summary,
          keyClauses: c.analysis?.clauses.map(clause => ({ risk: clause.riskLevel, explanation: clause.explanation }))
      });
      return `DOCUMENT NAME: "${c.fileName}"\nDATA: ${summary}`;
  }).join('\n\n----------------\n\n');

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-lite",
      contents: `
        Compare these ${contracts.length} contracts based on the provided analysis data.
        
        ${contractsContext}
        
        Task:
        1. Determine which contract is safest/best for the user.
        2. Provide a short reasoning paragraph.
        3. List key differences.
        
        Return JSON matching the schema.
      `,
      config: {
        responseMimeType: "application/json",
        responseSchema: comparisonSchema,
      },
    });

    return parseJSONResponse<ComparisonResult>(response.text);
  } catch (error) {
    handleGenAIError(error);
  }
};

export const queryComparisonDifference = async (
  history: ChatMessage[],
  newMessage: string,
  contracts: Contract[],
  focusedDifference: string
): Promise<string> => {
  if (!API_KEY) return "API Key missing.";

  const ai = new GoogleGenAI({ apiKey: API_KEY });

  // Construct a condensed context of all involved contracts
  const contractsContext = contracts.map((c) => {
      return `DOCUMENT: "${c.fileName}"
      SUMMARY: ${c.analysis?.summary}
      RISK: ${c.analysis?.overallRisk} (Score: ${c.analysis?.riskScore})
      CLAUSES: ${c.analysis?.clauses.map(cl => `${cl.explanation} (${cl.riskLevel})`).join('; ')}`;
  }).join('\n\n');

  // Format history for the API
  const contents = history.map(msg => ({
    role: msg.role,
    parts: [{ text: msg.text }]
  }));

  // Add the new message
  contents.push({
    role: 'user',
    parts: [{ text: newMessage }]
  });

  const systemInstruction = `
    You are an expert legal aide assisting a user who is comparing multiple contracts.
    
    CONTEXT OF CONTRACTS:
    ${contractsContext}
    
    FOCUS TOPIC:
    The user is specifically asking about this identified difference: "${focusedDifference}"
    
    INSTRUCTIONS:
    - Explain simply how this difference manifests.
    - Do NOT cite external law sections.
    `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: contents,
      config: {
        systemInstruction: systemInstruction,
      },
    });

    return response.text || "I couldn't generate a response.";
  } catch (error) {
    console.error("Error in comparison chat:", error);
    return "Sorry, I'm having trouble connecting right now. Please try again.";
  }
};