export interface User {
  id: string;
  email: string;
  name: string;
}

export enum RiskLevel {
  LOW = 'Low',
  MEDIUM = 'Medium',
  HIGH = 'High',
}

export interface QAPair {
  question: string;
  answer: string;
  timestamp: number;
}

export interface Clause {
  id: string;
  text: string;
  explanation: string;
  riskLevel: RiskLevel;
  riskyKeywords: string[];
  reason: string;
  conversationHistory?: QAPair[];
}

export interface ContractAnalysis {
  summary: string;
  overallRisk: RiskLevel;
  riskScore?: number; // 0-100 score
  clauses: Clause[];
  fullText?: string; // OCR extracted text
}

export interface Contract {
  id: string;
  userId: string;
  fileName: string;
  uploadDate: number;
  status: 'pending' | 'analyzed' | 'error';
  analysis?: ContractAnalysis;
  fileData?: string; // Base64 representation for demo purposes
  mimeType?: string;
}

export interface RecentAnalysis {
  id: string;
  name: string;
  createdAt: string; // ISO timestamp
  sourceType: 'file' | 'text';
  fileName?: string;
  rawText: string;
  riskScore: number;
  riskSummary: string;
  summary: string[];
  clauses: Clause[];
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}

export interface ComparisonResult {
  recommendedId: string;
  reasoning: string;
  keyDifferences: string[];
}