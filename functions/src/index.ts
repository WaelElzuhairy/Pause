import { onCall, HttpsError, type CallableRequest } from "firebase-functions/v2/https";
import type { QueryDocumentSnapshot } from "firebase-admin/firestore";
import { db } from "./firebaseAdmin";
import { getProvider } from "./ai/provider";
import {
  buildMoodContext,
  buildCheckInHistory,
  buildInsightData,
} from "./personalization";
import { ANALYZE_SYSTEM, buildAnalyzePrompt } from "./prompts/analyze";
import { CHECKIN_SYSTEM, buildCheckinPrompt } from "./prompts/checkin";
import { INSIGHT_SYSTEM, buildInsightPrompt } from "./prompts/insight";
import {
  AnalyzeMessageSchema,
  CheckInSchema,
  AnalysisResultSchema,
  CheckInResultSchema,
  InsightItemSchema,
} from "./schemas";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { z } from "zod";

const REGION = "us-central1";

// ── Helpers ──────────────────────────────────────────────────────────────────

function requireAuth(request: CallableRequest): string {
  if (!request.auth?.uid) {
    throw new HttpsError("unauthenticated", "Must be signed in.");
  }
  return request.auth.uid;
}

function parseJSON<T>(raw: string, schema: z.ZodType<T>): T {
  try {
    const cleaned = raw
      .replace(/^```(?:json)?\n?/, "")
      .replace(/\n?```$/, "")
      .trim();
    return schema.parse(JSON.parse(cleaned));
  } catch {
    throw new HttpsError(
      "internal",
      "AI returned an unexpected response format. Please try again."
    );
  }
}

// ── analyzeMessage ────────────────────────────────────────────────────────────

export const analyzeMessage = onCall(
  { region: REGION },
  async (request: CallableRequest<{ text: string }>) => {
    const uid = requireAuth(request);
    const { text } = AnalyzeMessageSchema.parse(request.data);

    const moodContext = await buildMoodContext(uid);

    const ai = getProvider();
    const raw = await ai.generate({
      system: ANALYZE_SYSTEM,
      user: buildAnalyzePrompt({ text, moodContext }),
      json: true,
      maxTokens: 512,
    });

    const result = parseJSON(raw, AnalysisResultSchema);

    const docRef = await db
      .collection("users")
      .doc(uid)
      .collection("messages")
      .add({
        originalText: text,
        detectedTone: result.tone,
        perceivedAs: result.perceivedAs,
        emotionalImpact: result.emotionalImpact,
        rewrittenText: result.rewrittenText,
        moodContextNote: result.moodContextNote ?? null,
        acceptedRewrite: false,
        moodContextSnapshot: { moodContext },
        createdAt: FieldValue.serverTimestamp(),
      });

    return { ...result, messageId: docRef.id };
  }
);

// ── submitCheckIn ─────────────────────────────────────────────────────────────

export const submitCheckIn = onCall(
  { region: REGION },
  async (
    request: CallableRequest<{ mood: string; intensity: number; note?: string }>
  ) => {
    const uid = requireAuth(request);
    const { mood, intensity, note } = CheckInSchema.parse(request.data);

    const history = await buildCheckInHistory(uid);

    const ai = getProvider();
    const raw = await ai.generate({
      system: CHECKIN_SYSTEM,
      user: buildCheckinPrompt({ mood, intensity, note: note ?? "", history }),
      json: true,
      maxTokens: 512,
    });

    const result = parseJSON(raw, CheckInResultSchema);

    const docRef = await db
      .collection("users")
      .doc(uid)
      .collection("checkIns")
      .add({
        mood,
        intensity,
        note: note ?? null,
        aiReflection: result.reflection,
        aiSuggestion: result.suggestion,
        createdAt: FieldValue.serverTimestamp(),
      });

    return {
      reflection: result.reflection,
      suggestion: result.suggestion,
      checkInId: docRef.id,
    };
  }
);

// ── generateInsight ───────────────────────────────────────────────────────────

export const generateInsight = onCall(
  { region: REGION },
  async (request: CallableRequest) => {
    const uid = requireAuth(request);

    const { checkIns, messages, hasSufficientData } =
      await buildInsightData(uid);

    if (!hasSufficientData) {
      return {
        insights: [
          {
            type: "mood_pattern",
            text: "Keep checking in — patterns will start appearing after a few days.",
          },
        ],
      };
    }

    const ai = getProvider();
    const raw = await ai.generate({
      system: INSIGHT_SYSTEM,
      user: buildInsightPrompt({ checkIns, messages }),
      json: true,
      maxTokens: 512,
    });

    const InsightArraySchema = z.array(InsightItemSchema).min(1).max(3);
    const insights = parseJSON(raw, InsightArraySchema);

    await db
      .collection("users")
      .doc(uid)
      .collection("insights")
      .add({
        insights,
        periodStart: Timestamp.fromDate(
          new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        ),
        periodEnd: Timestamp.now(),
        createdAt: FieldValue.serverTimestamp(),
      });

    return { insights };
  }
);

// ── getDashboard ──────────────────────────────────────────────────────────────

export const getDashboard = onCall(
  { region: REGION },
  async (request: CallableRequest) => {
    const uid = requireAuth(request);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [checkInsSnap, messagesSnap, insightSnap] = await Promise.all([
      db
        .collection("users")
        .doc(uid)
        .collection("checkIns")
        .orderBy("createdAt", "desc")
        .limit(5)
        .get(),
      db
        .collection("users")
        .doc(uid)
        .collection("messages")
        .orderBy("createdAt", "desc")
        .limit(5)
        .get(),
      db
        .collection("users")
        .doc(uid)
        .collection("insights")
        .orderBy("createdAt", "desc")
        .limit(1)
        .get(),
    ]);

    const recentCheckIns = checkInsSnap.docs.map((d: QueryDocumentSnapshot) => ({
      id: d.id,
      ...d.data(),
      createdAt: (d.data().createdAt as Timestamp).toDate().toISOString(),
    }));

    const recentMessages = messagesSnap.docs.map((d: QueryDocumentSnapshot) => ({
      id: d.id,
      ...d.data(),
      createdAt: (d.data().createdAt as Timestamp).toDate().toISOString(),
    }));

    const todayCheckIn =
      recentCheckIns.find((c: { createdAt: string }) => new Date(c.createdAt) >= today) ??
      null;

    const currentInsight = insightSnap.empty
      ? null
      : (
          insightSnap.docs[0].data().insights as Array<{ text: string }>
        )[0]?.text ?? null;

    let streak = 0;
    const checkDate = new Date();
    checkDate.setHours(0, 0, 0, 0);
    for (const c of recentCheckIns) {
      const d = new Date(c.createdAt as string);
      d.setHours(0, 0, 0, 0);
      if (d.getTime() === checkDate.getTime()) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }

    return {
      recentCheckIns,
      recentMessages,
      currentInsight,
      streak,
      todayCheckIn,
    };
  }
);
