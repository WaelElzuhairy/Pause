import { z } from "zod";

export const MoodSchema = z.enum([
  "stressed",
  "anxious",
  "calm",
  "happy",
  "tired",
  "frustrated",
]);

export const ToneSchema = z.enum([
  "aggressive",
  "passive-aggressive",
  "rude",
  "neutral",
  "kind",
]);

export const CheckInSchema = z.object({
  mood: MoodSchema,
  intensity: z.number().int().min(1).max(5),
  note: z.string().max(500).optional(),
});

export const AnalyzeMessageSchema = z.object({
  text: z.string().min(1).max(2000),
});

// AI response shapes
export const AnalysisResultSchema = z.object({
  tone: ToneSchema,
  perceivedAs: z.string(),
  emotionalImpact: z.string(),
  rewrittenText: z.string(),
  moodContextNote: z.string().optional(),
});

export const CheckInResultSchema = z.object({
  reflection: z.string(),
  suggestion: z.string(),
});

export const InsightItemSchema = z.object({
  type: z.enum(["mood_pattern", "tone_trend", "connection"]),
  text: z.string(),
});

// ── Incident Reporter ────────────────────────────────────────────────────────

export const IncidentEntrySchema = z.object({
  entry_id: z.string(),
  text: z.string(),
  timestamp: z.string(),
  source: z.string(),
});

export const AnalyzeIncidentSchema = z.object({
  entries: z.array(IncidentEntrySchema).min(1).max(20),
  gender: z.string().optional(),
});

export const IncidentReportSchema = z.object({
  summary: z.string(),
  primary_category: z.string(),
  secondary_categories: z.array(z.string()),
  severity: z.enum(["low", "medium", "high", "critical"]),
  risk_level: z.string(),
  timeline: z.array(z.string()),
  pattern: z.enum(["stable", "repeated", "escalating"]),
  recommended_actions: z.array(
    z.object({
      action: z.string(),
      priority: z.enum(["low", "medium", "high", "critical"]),
    })
  ),
  sanitized_text: z.string(),
  recommended_authority: z.object({
    type: z.enum(["police", "legal", "telecom", "none"]),
    reason: z.string(),
    action: z.string(),
  }),
  formal_report: z.string(),
  confidence: z.number().min(0).max(1),
});

// ── AI Assistant ─────────────────────────────────────────────────────────────

export const ChatHistoryItemSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string(),
});

export const ChatAssistantSchema = z.object({
  message: z.string().min(1).max(2000),
  history: z.array(ChatHistoryItemSchema).max(20).optional(),
  userContext: z.string().max(500).optional(),
});

// ── Types ────────────────────────────────────────────────────────────────────

export type Mood = z.infer<typeof MoodSchema>;
export type Tone = z.infer<typeof ToneSchema>;
export type AnalysisResult = z.infer<typeof AnalysisResultSchema>;
export type CheckInResult = z.infer<typeof CheckInResultSchema>;
export type IncidentEntry = z.infer<typeof IncidentEntrySchema>;
export type IncidentReport = z.infer<typeof IncidentReportSchema>;
