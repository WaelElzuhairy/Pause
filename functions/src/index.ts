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
import { INCIDENT_SYSTEM, buildIncidentPrompt, normalizeTimeline, HT_INCIDENT_SYSTEM, buildHumanTraffickingPrompt } from "./prompts/incident";
import { buildAssistantSystem, buildAssistantPrompt } from "./prompts/assistant";
import {
  AnalyzeMessageSchema,
  CheckInSchema,
  AnalysisResultSchema,
  CheckInResultSchema,
  InsightItemSchema,
  AnalyzeIncidentSchema,
  IncidentReportSchema,
  ChatAssistantSchema,
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

// ── analyzeIncident ───────────────────────────────────────────────────────────

export const analyzeIncident = onCall(
  { region: REGION },
  async (request: CallableRequest) => {
    const uid = requireAuth(request);
    // Parse core fields via Zod; read new optional fields directly to avoid
    // Zod nullish/nullable enum issues with Firebase's undefined→null serialization
    const { entries, gender } = AnalyzeIncidentSchema.parse(request.data);
    const rawData = request.data as Record<string, unknown>;
    const caseTypeRaw = (rawData.case_type as string | null | undefined) ?? "auto";
    const subtypeStr  = (rawData.trafficking_subtype as string | null | undefined) ?? undefined;

    const ai = getProvider();

    // Determine effective prompt type
    let useHT: boolean;
    if (caseTypeRaw === "human_trafficking") {
      useHT = true;
    } else if (caseTypeRaw === "cyberbullying") {
      useHT = false;
    } else {
      // "auto" or unrecognised — run a fast classification call (~10 tokens)
      const entriesSnippet = entries.map((e) => e.text).join(" ").substring(0, 800);
      const classification = await ai.generate({
        system: "You are a case classifier. Reply with exactly one word only: 'trafficking' or 'cyberbullying'.",
        user: `Classify this case:\n${entriesSnippet}`,
        json: false,
        maxTokens: 10,
      });
      useHT = classification.trim().toLowerCase().includes("trafficking");
    }

    const raw = await ai.generate({
      system: useHT ? HT_INCIDENT_SYSTEM : INCIDENT_SYSTEM,
      user: useHT
        ? buildHumanTraffickingPrompt(entries, gender ?? "unspecified", subtypeStr)
        : buildIncidentPrompt(entries, gender ?? "unspecified"),
      json: true,
      maxTokens: 3000,
    });

    const report = parseJSON(raw, IncidentReportSchema);

    // Post-process: normalize timeline (remove any relative time words)
    report.timeline = normalizeTimeline(report.timeline);

    // Map authority type → real entity name (never trust AI to name these)
    const AUTHORITY_NAME: Record<string, string> = {
      police: "Ministry of Interior Egypt",
      legal: "Public Prosecution Egypt",
      telecom: "National Telecom Regulatory Authority",
      women_support: "National Council for Women Egypt",
      child_protection: "National Council for Childhood and Motherhood",
      mental_health: "General Secretariat of Mental Health",
      none: "No authority escalation needed at this stage",
    };

    const vaultId =
      "MS-" +
      new Date().getFullYear() +
      "-" +
      Math.random().toString(36).substring(2, 6).toUpperCase();

    // Batch write: vault (raw) + public log + user case summary
    const batch = db.batch();

    const vaultRef = db.collection("vaulted_reports").doc();
    batch.set(vaultRef, {
      user_id: uid,
      case_id: vaultId,
      raw_entries: entries,
      formal_report: report.formal_report, // real names — legal document
      createdAt: FieldValue.serverTimestamp(),
    });

    // Public log: keep sanitized (no real names on public collection)
    const publicRef = db.collection("public_incident_logs").doc();
    batch.set(publicRef, {
      case_id: vaultId,
      summary: report.sanitized_text.substring(0, 300), // sanitized for public
      category: report.primary_category,
      severity: report.severity,
      pattern: report.pattern,
      createdAt: FieldValue.serverTimestamp(),
    });

    // User case: store AI-generated paragraph summary (real names) — private to this user
    const userCaseRef = db.collection("user_cases").doc();
    batch.set(userCaseRef, {
      user_id: uid,
      case_id: vaultId,
      summary: report.summary,       // AI paragraph with real names — private evidence record
      primary_category: report.primary_category,
      severity: report.severity,
      pattern: report.pattern,
      status: "completed",
      createdAt: FieldValue.serverTimestamp(),
    });

    await batch.commit();

    return {
      ...report,
      case_id: vaultId,
      authority_name: AUTHORITY_NAME[report.recommended_authority.type],
    };
  }
);

// ── chatAssistant ─────────────────────────────────────────────────────────────

export const chatAssistant = onCall(
  { region: REGION },
  async (request: CallableRequest) => {
    const uid = requireAuth(request);
    const { message, history, userContext } = ChatAssistantSchema.parse(
      request.data
    );

    // Optionally pull latest check-in for context if not provided
    let context = userContext ?? "";
    if (!context) {
      const snap = await db
        .collection("users")
        .doc(uid)
        .collection("checkIns")
        .orderBy("createdAt", "desc")
        .limit(1)
        .get();
      if (!snap.empty) {
        const d = snap.docs[0].data();
        context = `Recent mood: ${d.mood} (${d.intensity}/5). ${d.note ? `Note: "${d.note}"` : ""}`;
      }
    }

    const ai = getProvider();
    const reply = await ai.generate({
      system: buildAssistantSystem(context),
      user: buildAssistantPrompt(history ?? [], message),
      maxTokens: 512,
    });

    return { reply: reply.trim() };
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
