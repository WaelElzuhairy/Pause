import { useEffect, useState } from "react";
import { collection, query, orderBy, limit, onSnapshot } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "./useAuth";

export interface InsightItem {
  type: "mood_pattern" | "tone_trend" | "connection";
  text: string;
}

export interface InsightDoc {
  id: string;
  insights: InsightItem[];
  createdAt: string;
}

export function useInsights() {
  const { user } = useAuth();
  const [insights, setInsights] = useState<InsightDoc[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, "users", user.uid, "insights"),
      orderBy("createdAt", "desc"),
      limit(5)
    );

    const unsub = onSnapshot(q, (snap) => {
      setInsights(
        snap.docs.map((d) => ({
          id: d.id,
          insights: d.data().insights ?? [],
          createdAt: d.data().createdAt?.toDate?.()?.toISOString() ?? new Date().toISOString(),
        }))
      );
      setLoading(false);
    });

    return unsub;
  }, [user]);

  const latestInsights: InsightItem[] = insights[0]?.insights ?? [];
  return { insights, latestInsights, loading };
}
