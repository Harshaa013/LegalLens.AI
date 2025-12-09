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
          explanation: { type: Type.STRING, description: "A simplified explanation of what this clause means." },
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
          reason: { type: Type.STRING, description: "Why this clause is considered risky." },
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
                 - Unlimited liability for the user.
                 - Unilateral termination without cause or reasonable notice.
                 - Complete waiver of legal rights (e.g., jury trial, class action).
                 - Automatic renewal with difficult cancellation terms.
                 - Hidden fees or variable pricing without caps.
              
              2. MEDIUM RISK (Amber):
                 - Ambiguous terms that could be interpreted against the user.
                 - Slightly unbalanced indemnification clauses.
                 - Long notice periods for cancellation.
                 - Restrictions on activities that are not standard (e.g., strict non-competes for freelancers).
              
              3. LOW RISK (Green):
                 - Standard boilerplate terms.
                 - Mutual obligations and termination rights.
                 - Clear, fixed pricing.
                 - Reasonable data usage and privacy policies.

              Identify key clauses, assign them a risk level based on the criteria above, and provide a plain English summary. 
              
              Return the result in the specified JSON format.`,
            },
          ],
        },
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: analysisSchema,
        temperature: 0.2, // Low temperature for more deterministic analysis
      },
    });

    const text = response.text;
    if (!text) {
        throw new Error("No response from AI");
    }
    
    // Parse the JSON response
    const analysis = JSON.parse(text) as ContractAnalysis;
    return analysis;

  } catch (error) {
    console.error("Error analyzing contract:", error);
    throw error;
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
        
        Answer the question simply and clearly for a layperson. Keep it brief (under 50 words).
      `,
    });

    return response.text || "Could not generate an answer.";
  } catch (error) {
    console.error("Error asking question:", error);
    return "Sorry, I couldn't answer that right now.";
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
    You are LegalLens AI, a highly precise legal assistant specialized in contract analysis.
    
    ${contractContext ? `
    CURRENT CONTRACT CONTEXT:
    ${contractContext}
    
    CRITICAL INSTRUCTIONS FOR ACCURACY:
    1. **Cite Sections:** When answering, you MUST reference specific section numbers, article headers, or clause titles found in the "Full Text" if available. (e.g., "According to Section 4.2...", "As stated in the Termination Clause...").
    2. **Precise Terminology:** Use correct legal terminology (e.g., "indemnification", "force majeure", "jurisdiction") but immediately explain it in simple terms for the user.
    3. **Grounding:** Do not invent terms. If a specific term (like "Notice Period") is not in the contract, say it is not explicitly stated.
    4. **Scope:** Answer strictly based on the provided text.
    5. **Disclaimer:** While you are precise, you are an AI. Always conclude serious risk assessments with a recommendation to consult a qualified attorney.
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
        temperature: 0.3, // Lower temperature for more factual responses
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
        1. Determine which contract is safest/best for the user (Lower risk score, fewer high-risk clauses).
        2. Provide a short reasoning paragraph explaining the choice.
        3. List key differences in bullet points.
        
        CRITICAL INSTRUCTION: 
        - Refer to contracts strictly by their exact FILE NAMES as provided in the "DOCUMENT NAME" field.
        - DO NOT use generic placeholders like "Contract 1", "Contract 2", "Contract A", or "The first contract".
        - Example: "Employment_Agreement.pdf has a non-compete, while Freelance_Contract.docx does not."
        
        Return JSON matching the schema.
      `,
      config: {
        responseMimeType: "application/json",
        responseSchema: comparisonSchema,
      },
    });

    return JSON.parse(response.text!) as ComparisonResult;
  } catch (error) {
    console.error("Error comparing contracts:", error);
    throw error;
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
    - If the user asks for a brief or explanation, explain strictly how this specific difference manifests in the provided documents.
    - Mention the documents by their exact file names.
    - Explain the practical implication of this difference (e.g., "This means under Contract X you are liable for Y...").
    - Keep answers helpful, concise, and easy to understand for a non-lawyer.
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
    return "Sorry, I'm having trouble connecting right now.";
  }
};