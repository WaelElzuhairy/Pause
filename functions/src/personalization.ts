import { db } from "./firebaseAdmin";
import type { Mood, Tone } from "./schemas";
import { Timestamp, type QueryDocumentSnapshot } from "firebase-admin/firestore";

interface CheckInDoc {
  mood: Mood;
  intensity: number;
  note?: string;
  createdAt: Timestamp;
}

interface MessageDoc {
  detectedTone: Tone;
  createdAt: Timestamp;
}

const HIGH_STRESS_MOODS: Mood[] = ["stressed", "frustrated", "anxious"];
const ELEVATED_INTENSITY = 4;

export async function buildMoodContext(uid: string): Promise<string> {
  const snapshot = await db
    .collection("users")
    .doc(uid)
    .collection("checkIns")
    .orderBy("createdAt", "desc")
    .limit(3)
    .get();

  if (snapshot.empty) return "";

  const checkIns = snapshot.docs.map((d: QueryDocumentSnapshot) => d.data() as CheckInDoc);
  const recent = checkIns[0];

  const avgIntensity =
    checkIns.reduce((sum: number, c: CheckInDoc) => sum + c.intensity, 0) /
    checkIns.length;

  const isElevated =
    HIGH_STRESS_MOODS.includes(recent.mood) ||
    avgIntensity >= ELEVATED_INTENSITY;

  if (!isElevated) return "";

  const streakMoods = checkIns.filter((c: CheckInDoc) =>
    HIGH_STRESS_MOODS.includes(c.mood)
  );

  let context = `The user checked in as "${recent.mood}" (intensity ${recent.intensity}/5) recently.`;
  if (streakMoods.length >= 2) {
    context += ` They've been feeling this way for ${streakMoods.length} check-ins in a row.`;
  }
  return context;
}

export async function buildCheckInHistory(uid: string): Promise<string> {
  const snapshot = await db
    .collection("users")
    .doc(uid)
    .collection("checkIns")
    .orderBy("createdAt", "desc")
    .limit(7)
    .get();

  if (snapshot.empty) return "";

  return snapshot.docs
    .map((d: QueryDocumentSnapshot) => {
      const c = d.data() as CheckInDoc;
      const date = c.createdAt.toDate().toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      });
      return `- ${date}: ${c.mood} (${c.intensity}/5)${c.note ? ` — "${c.note}"` : ""}`;
    })
    .join("\n");
}

export async function buildInsightData(uid: string): Promise<{
  checkIns: string;
  messages: string;
  hasSufficientData: boolean;
}> {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const cutoff = Timestamp.fromDate(sevenDaysAgo);

  const [checkInSnap, messageSnap] = await Promise.all([
    db
      .collection("users")
      .doc(uid)
      .collection("checkIns")
      .where("createdAt", ">=", cutoff)
      .orderBy("createdAt", "desc")
      .get(),
    db
      .collection("users")
      .doc(uid)
      .collection("messages")
      .where("createdAt", ">=", cutoff)
      .orderBy("createdAt", "desc")
      .get(),
  ]);

  const checkInsText = checkInSnap.docs
    .map((d: QueryDocumentSnapshot) => {
      const c = d.data() as CheckInDoc;
      const date = c.createdAt.toDate().toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      });
      return `- ${date}: ${c.mood} (${c.intensity}/5)`;
    })
    .join("\n");

  const messagesText = messageSnap.docs
    .map((d: QueryDocumentSnapshot) => {
      const m = d.data() as MessageDoc;
      const date = m.createdAt.toDate().toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      });
      return `- ${date}: tone = ${m.detectedTone}`;
    })
    .join("\n");

  return {
    checkIns: checkInsText,
    messages: messagesText,
    hasSufficientData: checkInSnap.size >= 3 || messageSnap.size >= 3,
  };
}
