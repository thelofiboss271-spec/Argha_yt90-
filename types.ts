
export type StudentClass = string;

export enum Language {
  BENGALI = 'Bengali',
  ENGLISH = 'English',
  BANGLISH = 'Banglish'
}

export enum ExplanationMode {
  NORMAL = 'Normal',
  ELI10 = 'Explain like I’m 10',
  EXAM = 'Exam Mode'
}

export interface UserProfile {
  name: string;
  profilePic: string | null;
}

export interface HistoryItem {
  id: string;
  query: string;
  result: string;
  timestamp: number;
  studentClass: string;
  imageUrl?: string | null;
}

export interface SolverState {
  isAnalyzing: boolean;
  result: string | null;
  error: string | null;
  imageUrl: string | null;
  diagramUrl: string | null;
  videoUrl: string | null;
  groundingUrls: string[];
  isGeneratingMedia: 'none' | 'image' | 'video';
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}
