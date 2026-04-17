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

export type Mood = z.infer<typeof MoodSchema>;
export type Tone = z.infer<typeof ToneSchema>;
export type AnalysisResult = z.infer<typeof AnalysisResultSchema>;
export type CheckInResult = z.infer<typeof CheckInResultSchema>;
