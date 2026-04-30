import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const functions = getFunctions(app);

// Typed callable function helpers
export const callAnalyzeMessage = httpsCallable<
  { text: string },
  {
    tone: string;
    perceivedAs: string;
    emotionalImpact: string;
    rewrittenText: string;
    moodContextNote?: string;
  }
>(functions, "analyzeMessage");

export const callSubmitCheckIn = httpsCallable<
  { mood: string; intensity: number; note?: string },
  { reflection: string; suggestion: string; checkInId: string }
>(functions, "submitCheckIn");

export const callGenerateInsight = httpsCallable<
  Record<string, never>,
  { insights: Array<{ type: string; text: string }> }
>(functions, "generateInsight");

export const callGetDashboard = httpsCallable<
  Record<string, never>,
  {
    recentCheckIns: CheckIn[];
    recentMessages: Message[];
    currentInsight: string | null;
    streak: number;
    todayCheckIn: CheckIn | null;
  }
>(functions, "getDashboard");

// Shared types (mirrored in functions/src/schemas.ts)
export type Mood =
  | "stressed"
  | "anxious"
  | "calm"
  | "happy"
  | "tired"
  | "frustrated";

export type Tone =
  | "aggressive"
  | "passive-aggressive"
  | "rude"
  | "neutral"
  | "kind";

export interface CheckIn {
  id: string;
  mood: Mood;
  intensity: number;
  note?: string;
  aiReflection: string;
  aiSuggestion: string;
  createdAt: string; // ISO string from Firestore
}

export const callAnalyzeIncident = httpsCallable<
  {
    entries: IncidentEntry[];
    gender?: string;
    case_type?: "cyberbullying" | "human_trafficking" | "auto";
    trafficking_subtype?: string;
  },
  IncidentReport & { case_id: string; authority_name: string }
>(functions, "analyzeIncident");

export const callChatAssistant = httpsCallable<
  {
    message: string;
    history?: { role: "user" | "assistant"; content: string }[];
    userContext?: string;
  },
  { reply: string }
>(functions, "chatAssistant");

// Incident types
export interface IncidentEntry {
  entry_id: string;
  text: string;
  timestamp: string;
  source: string;
}

export interface IncidentReport {
  summary: string;
  primary_category: string;
  secondary_categories: string[];
  severity: "low" | "medium" | "high" | "critical";
  risk_level: string;
  timeline: string[];
  pattern: "stable" | "repeated" | "escalating";
  recommended_actions: { action: string; priority: string }[];
  sanitized_text: string;
  recommended_authority: {
    type: "police" | "legal" | "telecom" | "women_support" | "child_protection" | "mental_health" | "none";
    reason: string;
    action: string;
  };
  formal_report: string;
  confidence: number;
}

export interface Message {
  id: string;
  originalText: string;
  detectedTone: Tone;
  perceivedAs: string;
  emotionalImpact: string;
  rewrittenText: string;
  acceptedRewrite: boolean;
  moodContextNote?: string;
  createdAt: string;
}
