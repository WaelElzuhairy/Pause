import { useEffect, useState } from "react";
import {
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "./useAuth";
import type { CheckIn } from "../lib/firebase";

export function useCheckIns(count = 10) {
  const { user } = useAuth();
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, "users", user.uid, "checkIns"),
      orderBy("createdAt", "desc"),
      limit(count)
    );

    const unsub = onSnapshot(q, (snap) => {
      setCheckIns(
        snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            mood: data.mood,
            intensity: data.intensity,
            note: data.note,
            aiReflection: data.aiReflection,
            aiSuggestion: data.aiSuggestion,
            createdAt: data.createdAt?.toDate?.()?.toISOString() ?? new Date().toISOString(),
          } as CheckIn;
        })
      );
      setLoading(false);
    });

    return unsub;
  }, [user, count]);

  const todayCheckIn = checkIns.find((c) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return new Date(c.createdAt) >= today;
  });

  return { checkIns, loading, todayCheckIn };
}
