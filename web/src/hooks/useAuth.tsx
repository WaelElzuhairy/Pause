import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  GoogleAuthProvider,
  signInWithPopup,
  signInAnonymously,
  linkWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  type User,
} from "firebase/auth";
import { doc, setDoc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../lib/firebase";

export type UniversityChoice = "galala" | "auc" | "other";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  isAnonymous: boolean;
  university: UniversityChoice | null;
  universityLoaded: boolean;
  signInWithGoogle: () => Promise<void>;
  signInAsGuest: () => Promise<void>;
  linkGuestToGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  setUniversity: (val: UniversityChoice) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [university, setUniversityState] = useState<UniversityChoice | null>(null);
  const [universityLoaded, setUniversityLoaded] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      setUniversityLoaded(false); // reset on each auth state change

      if (u) {
        try {
          const ref = doc(db, "users", u.uid);
          const snap = await getDoc(ref);
          if (!snap.exists()) {
            await setDoc(ref, {
              email: u.email ?? null,
              displayName: u.displayName ?? null,
              isAnonymous: u.isAnonymous,
              createdAt: serverTimestamp(),
              preferences: { theme: "light" },
              university: null,
            });
            setUniversityState(null);
          } else {
            const raw = snap.data().university;
            setUniversityState(raw != null ? (raw as UniversityChoice) : null);
          }
        } catch (err) {
          console.error("useAuth: Firestore error", err);
          setUniversityState(null);
        }
        setUniversityLoaded(true);
      } else {
        setUniversityState(null);
        setUniversityLoaded(true);
      }

      setLoading(false);
    });
    return unsub;
  }, []);

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  };

  const signInAsGuest = async () => {
    await signInAnonymously(auth);
  };

  // Upgrades anonymous session → Google without losing data
  // Firebase keeps the same UID when linking, so Firestore data is preserved
  const linkGuestToGoogle = async () => {
    if (!user || !user.isAnonymous) return;
    const provider = new GoogleAuthProvider();
    const result = await linkWithPopup(user, provider);

    // Update user doc with real name/email now that we have it
    await setDoc(
      doc(db, "users", result.user.uid),
      {
        email: result.user.email,
        displayName: result.user.displayName,
        isAnonymous: false,
      },
      { merge: true }
    );
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
  };

  const setUniversity = async (val: UniversityChoice) => {
    if (!user) return;
    await updateDoc(doc(db, "users", user.uid), { university: val });
    setUniversityState(val);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAnonymous: user?.isAnonymous ?? false,
        university,
        universityLoaded,
        signInWithGoogle,
        signInAsGuest,
        linkGuestToGoogle,
        signOut,
        setUniversity,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
