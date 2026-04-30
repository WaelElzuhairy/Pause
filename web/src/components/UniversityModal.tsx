import { useState } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "../hooks/useAuth";
import type { UniversityChoice } from "../hooks/useAuth";

const OPTIONS: { value: UniversityChoice; label: string; sub: string }[] = [
  {
    value: "galala",
    label: "Galala University",
    sub: "New Administrative Capital, Suez",
  },
  {
    value: "auc",
    label: "American University in Cairo",
    sub: "New Cairo Campus",
  },
  {
    value: "other",
    label: "Other / Prefer not to say",
    sub: "Continue without a university affiliation",
  },
];

export default function UniversityModal() {
  const { setUniversity } = useAuth();
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState<UniversityChoice | null>(null);

  async function confirm() {
    if (!selected || saving) return;
    setSaving(true);
    await setUniversity(selected);
  }

  // Use a portal so no parent CSS (overflow, stacking context, z-index) can interfere
  return createPortal(
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(0,0,0,0.55)",
        padding: "0 1rem",
      }}
    >
      <div className="w-full max-w-sm bg-[var(--color-surface)] rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-[var(--color-accent)] px-6 py-5">
          <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center mb-3">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <rect x="6" y="4" width="4" height="16" rx="2" fill="white" />
              <rect x="14" y="4" width="4" height="16" rx="2" fill="white" />
            </svg>
          </div>
          <h2 className="text-lg font-bold text-white">Welcome to Pause</h2>
          <p className="text-sm text-white/80 mt-1">
            Which university are you affiliated with?
          </p>
        </div>

        {/* Body */}
        <div className="px-6 py-5 flex flex-col gap-3">
          <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">
            This helps us show the correct wellbeing center contact in your
            incident reports. Your answer is stored privately under your account.
          </p>

          <div className="flex flex-col gap-2 mt-1">
            {OPTIONS.map((opt) => {
              const active = selected === opt.value;
              return (
                <button
                  key={opt.value}
                  onClick={() => setSelected(opt.value)}
                  className={`text-left w-full rounded-xl border px-4 py-3 transition-colors ${
                    active
                      ? "border-[var(--color-accent)] bg-[var(--color-accent)]/10 ring-1 ring-[var(--color-accent)]/40"
                      : "border-[var(--color-border)] hover:border-[var(--color-accent)]/50"
                  }`}
                >
                  <p
                    className={`text-sm font-semibold ${
                      active
                        ? "text-[var(--color-accent)]"
                        : "text-[var(--color-text)]"
                    }`}
                  >
                    {opt.label}
                  </p>
                  <p className="text-[11px] text-[var(--color-text-faint)] mt-0.5">
                    {opt.sub}
                  </p>
                </button>
              );
            })}
          </div>

          <button
            onClick={confirm}
            disabled={!selected || saving}
            className="mt-2 w-full py-3 rounded-xl bg-[var(--color-accent)] text-white text-sm font-semibold disabled:opacity-40 transition-opacity"
          >
            {saving ? "Saving…" : "Continue"}
          </button>

          <p className="text-[10px] text-[var(--color-text-faint)] text-center">
            You can change this later in your profile settings.
          </p>
        </div>
      </div>
    </div>,
    document.body
  );
}
