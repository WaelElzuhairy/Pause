import { useEffect, useState } from "react";
import { collection, query, orderBy, limit, onSnapshot } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "./useAuth";
import type { Message } from "../lib/firebase";

export function useMessages(count = 10) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, "users", user.uid, "messages"),
      orderBy("createdAt", "desc"),
      limit(count)
    );

    const unsub = onSnapshot(q, (snap) => {
      setMessages(
        snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            originalText: data.originalText,
            detectedTone: data.detectedTone,
            perceivedAs: data.perceivedAs,
            emotionalImpact: data.emotionalImpact,
            rewrittenText: data.rewrittenText,
            acceptedRewrite: data.acceptedRewrite,
            moodContextNote: data.moodContextNote,
            createdAt: data.createdAt?.toDate?.()?.toISOString() ?? new Date().toISOString(),
          } as Message;
        })
      );
      setLoading(false);
    });

    return unsub;
  }, [user, count]);

  return { messages, loading };
}
