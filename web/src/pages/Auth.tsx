import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

export default function AuthPage() {
  const { user, loading, signInWithGoogle, signInAsGuest } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) navigate("/dashboard", { replace: true });
  }, [user, loading, navigate]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--color-background)] px-4">
      {/* Logo / brand */}
      <div className="mb-10 text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[var(--color-accent)] mb-4">
          <PauseIcon />
        </div>
        <h1 className="text-3xl font-semibold text-[var(--color-text)] tracking-tight">
          Pause
        </h1>
        <p className="mt-2 text-[var(--color-text-muted)] text-sm max-w-xs">
          Reflect before you send. A daily companion for clearer communication.
        </p>
      </div>

      {/* Card */}
      <div className="w-full max-w-sm bg-[var(--color-surface)] rounded-2xl shadow-sm border border-[var(--color-border)] p-8 space-y-4">
        <button
          onClick={signInWithGoogle}
          className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl border border-[var(--color-border)] bg-white hover:bg-[var(--color-slate-50)] transition-colors text-sm font-medium text-[var(--color-text)] shadow-sm"
        >
          <GoogleIcon />
          Continue with Google
        </button>

        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-[var(--color-border)]" />
          <span className="text-xs text-[var(--color-text-faint)]">or</span>
          <div className="flex-1 h-px bg-[var(--color-border)]" />
        </div>

        <button
          onClick={signInAsGuest}
          className="w-full px-4 py-3 rounded-xl bg-[var(--color-accent-light)] hover:bg-[var(--color-sage-200)] transition-colors text-sm font-medium text-[var(--color-accent-dark)]"
        >
          Try as guest
        </button>

        <p className="text-center text-xs text-[var(--color-text-faint)] leading-relaxed">
          Guest sessions are private. You can link your Google account later to
          save your progress permanently.
        </p>
      </div>

      {/* Disclaimer */}
      <p className="mt-8 text-center text-xs text-[var(--color-text-faint)] max-w-xs leading-relaxed">
        Pause is not a substitute for professional mental health support. If
        you're struggling, please reach out to a trusted person or your campus
        counselor.
        {/* TODO_VERIFY: add Egypt-specific crisis resources here before public deploy */}
      </p>
    </div>
  );
}

function PauseIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <rect x="6" y="4" width="4" height="16" rx="2" fill="white" />
      <rect x="14" y="4" width="4" height="16" rx="2" fill="white" />
    </svg>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18">
      <path
        d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"
        fill="#4285F4"
      />
      <path
        d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"
        fill="#34A853"
      />
      <path
        d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332z"
        fill="#FBBC05"
      />
      <path
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.962L3.964 7.294C4.672 5.163 6.656 3.58 9 3.58z"
        fill="#EA4335"
      />
    </svg>
  );
}
