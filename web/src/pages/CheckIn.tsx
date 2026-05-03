import { useState } from "react";
import { formatDistanceToNow, format } from "date-fns";
import { MoodPicker, IntensitySlider } from "../components/MoodPicker";
import { callSubmitCheckIn } from "../lib/firebase";
import { useCheckIns } from "../hooks/useCheckIns";
import type { Mood, CheckIn } from "../lib/firebase";
import clsx from "clsx";

type Step = "pick" | "loading" | "response";

const MOOD_EMOJI: Record<Mood, string> = {
  happy: "😊", calm: "😌", tired: "😴",
  anxious: "😰", stressed: "😤", frustrated: "😔",
};

const MOOD_GRADIENT: Record<Mood, string> = {
  happy: "from-amber-400 to-orange-400",
  calm: "from-sky-400 to-cyan-400",
  tired: "from-slate-400 to-slate-500",
  anxious: "from-violet-400 to-purple-500",
  stressed: "from-rose-400 to-pink-500",
  frustrated: "from-red-400 to-orange-500",
};

const MOOD_GLOW: Record<Mood, string> = {
  happy: "rgba(251,191,36,0.3)",
  calm: "rgba(56,189,248,0.3)",
  tired: "rgba(148,163,184,0.2)",
  anxious: "rgba(167,139,250,0.3)",
  stressed: "rgba(251,113,133,0.3)",
  frustrated: "rgba(248,113,113,0.3)",
};

/* Psychology-based intensity labels */
const INTENSITY_LABELS: Record<number, { label: string; color: string }> = {
  1: { label: "Barely present", color: "var(--color-accent)" },
  2: { label: "Mild undercurrent", color: "var(--color-accent)" },
  3: { label: "Noticeably present", color: "#f59e0b" },
  4: { label: "Significantly felt", color: "#f97316" },
  5: { label: "Overwhelming", color: "#ef4444" },
};

/* Animated scan loader */
function AIThinking({ label }: { label: string }) {
  return (
    <div
      className="animate-fade-in-scale rounded-2xl p-12 flex flex-col items-center gap-6 scan-container"
      style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
    >
      <div className="scan-line" />

      {/* Neural orb loader */}
      <div className="relative w-16 h-16">
        <div className="neural-orb w-16 h-16 animate-orb-pulse" />
        <div className="absolute inset-[-4px] rounded-full border border-dashed opacity-40 animate-spin"
          style={{ borderColor: "var(--color-accent)", animationDuration: "3s" }} />
        <div className="absolute inset-[-10px] rounded-full border opacity-20"
          style={{ borderColor: "var(--color-secondary)", animation: "spin 5s linear infinite reverse" }} />
      </div>

      <div className="text-center">
        <p className="font-display font-semibold" style={{ color: "var(--color-text)" }}>{label}</p>
        <div className="flex items-center justify-center gap-1 mt-2">
          {[0, 150, 300].map((d) => (
            <span
              key={d}
              className="w-1.5 h-1.5 rounded-full animate-bounce"
              style={{ background: "var(--color-accent)", animationDelay: `${d}ms` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function CheckInPage() {
  const { checkIns, loading, todayCheckIn } = useCheckIns(14);

  const [step, setStep] = useState<Step>("pick");
  const [mood, setMood] = useState<Mood | null>(null);
  const [intensity, setIntensity] = useState(3);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ reflection: string; suggestion: string } | null>(null);

  const handleSubmit = async () => {
    if (!mood) return;
    setStep("loading");
    setError("");
    try {
      const res = await callSubmitCheckIn({ mood, intensity, note: note || undefined });
      setResult(res.data);
      setStep("response");
    } catch {
      setError("Couldn't reach the AI right now — functions may not be deployed yet. Your mood is noted.");
      setStep("pick");
    }
  };

  const handleReset = () => {
    setStep("pick"); setMood(null); setIntensity(3);
    setNote(""); setResult(null); setError("");
  };

  const intensityInfo = INTENSITY_LABELS[intensity];

  return (
    <div className="space-y-6 pb-6">
      {/* ── Header ── */}
      <div className="animate-fade-in-up">
        <h1 className="font-display text-[28px] font-bold tracking-tight" style={{ color: "var(--color-text)" }}>
          Daily Check-In
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--color-text-muted)" }}>
          A moment of honest self-reflection.
        </p>
      </div>

      {/* ── Already checked in ── */}
      {todayCheckIn && step === "pick" && (
        <TodayCard checkIn={todayCheckIn} onNewCheckIn={handleReset} />
      )}

      {/* ── Check-in form ── */}
      {!todayCheckIn && step === "pick" && (
        <div
          className="animate-fade-in-up rounded-2xl p-6 space-y-7 relative overflow-hidden"
          style={{
            background: "var(--color-surface)",
            border: "1px solid var(--color-border)",
            boxShadow: "var(--shadow-card)",
          }}
        >
          {/* Ambient bg glow when mood selected */}
          {mood && (
            <div
              className="absolute inset-0 opacity-20 pointer-events-none transition-all duration-700 rounded-2xl"
              style={{ background: `radial-gradient(ellipse at 50% 0%, ${MOOD_GLOW[mood]} 0%, transparent 70%)` }}
            />
          )}

          <div className="relative z-10">
            <p className="font-display font-semibold text-sm mb-4" style={{ color: "var(--color-text)" }}>
              How are you feeling right now?
            </p>
            <MoodPicker value={mood} onChange={setMood} />
          </div>

          {mood && (
            <div className="space-y-6 relative z-10 animate-fade-in-up">
              {/* Mood confirmation */}
              <div
                className="flex items-center gap-3 rounded-xl px-4 py-3"
                style={{ background: "var(--color-surface-raised)", border: "1px solid var(--color-border)" }}
              >
                <div
                  className={`w-11 h-11 rounded-xl bg-gradient-to-br ${MOOD_GRADIENT[mood]} flex items-center justify-center text-xl shadow-sm`}
                  style={{ boxShadow: `0 4px 12px ${MOOD_GLOW[mood]}` }}
                >
                  {MOOD_EMOJI[mood]}
                </div>
                <div>
                  <p className="font-display font-semibold capitalize text-sm" style={{ color: "var(--color-text)" }}>
                    {mood}
                  </p>
                  <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                    Feeling acknowledged
                  </p>
                </div>
                <div className="ml-auto flex gap-1">
                  <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "var(--color-tertiary)" }} />
                </div>
              </div>

              {/* Intensity — psycho-scientific slider */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <p className="font-display font-semibold text-sm" style={{ color: "var(--color-text)" }}>
                    Emotional intensity
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold" style={{ color: intensityInfo.color }}>
                      {intensityInfo.label}
                    </span>
                    <span
                      className="font-display font-bold text-base"
                      style={{ color: intensityInfo.color }}
                    >
                      {intensity}/5
                    </span>
                  </div>
                </div>
                <IntensitySlider value={intensity} onChange={setIntensity} />
                {/* Visual intensity indicators */}
                <div className="flex justify-between mt-2">
                  {[1, 2, 3, 4, 5].map((v) => (
                    <div
                      key={v}
                      className="h-1 rounded-full flex-1 mx-0.5 transition-all duration-300"
                      style={{
                        background: v <= intensity ? intensityInfo.color : "var(--color-border)",
                        opacity: v <= intensity ? 1 : 0.4,
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* Note */}
              <div>
                <p className="font-display font-semibold text-sm mb-2" style={{ color: "var(--color-text)" }}>
                  Anything on your mind?{" "}
                  <span className="font-normal text-xs" style={{ color: "var(--color-text-faint)" }}>(optional)</span>
                </p>
                <div className="relative">
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="e.g. exam tomorrow, argument with a friend..."
                    maxLength={300}
                    rows={3}
                    className="input-field w-full px-4 py-3 text-sm resize-none"
                  />
                  <p className="absolute bottom-2.5 right-3 text-xs" style={{ color: "var(--color-text-faint)" }}>
                    {note.length}/300
                  </p>
                </div>
              </div>

              {error && (
                <div
                  className="flex gap-2.5 rounded-xl px-4 py-3 text-xs leading-relaxed"
                  style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)", color: "#92400e" }}
                >
                  <span>⚠️</span>
                  <span>{error}</span>
                </div>
              )}

              <button
                onClick={handleSubmit}
                className="btn-primary w-full py-3.5 text-sm font-semibold ripple-wrapper"
              >
                Reflect with AI →
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Loading ── */}
      {step === "loading" && <AIThinking label="Reflecting on your day…" />}

      {/* ── AI Response ── */}
      {step === "response" && result && mood && (
        <div className="space-y-4 animate-fade-in-scale">
          <div
            className="rounded-2xl overflow-hidden"
            style={{
              background: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              boxShadow: "var(--shadow-elevated)",
            }}
          >
            {/* Mood header */}
            <div
              className={`bg-gradient-to-r ${MOOD_GRADIENT[mood]} p-6 flex items-center gap-4`}
              style={{ boxShadow: `inset 0 -1px 0 rgba(0,0,0,0.1)` }}
            >
              <span className="text-4xl">{MOOD_EMOJI[mood]}</span>
              <div>
                <p className="font-display font-bold text-lg text-white capitalize">{mood}</p>
                <p className="text-white/80 text-sm">Intensity {intensity}/5 · {format(new Date(), "EEEE, MMM d")}</p>
              </div>
            </div>

            <div className="p-6 space-y-5">
              <div>
                <p className="section-label mb-2">Reflection</p>
                <p className="text-sm leading-relaxed" style={{ color: "var(--color-text)" }}>
                  {result.reflection}
                </p>
              </div>

              <div
                className="rounded-xl px-4 py-4"
                style={{
                  background: "var(--color-accent-light)",
                  border: "1px solid var(--color-border)",
                }}
              >
                <p className="section-label mb-2" style={{ color: "var(--color-accent)" }}>
                  ✨ One thing to try
                </p>
                <p className="text-sm leading-relaxed font-medium" style={{ color: "var(--color-accent-dark)" }}>
                  {result.suggestion}
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={handleReset}
            className="w-full py-3 rounded-xl text-sm font-medium transition-all hover:bg-[var(--color-surface-raised)]"
            style={{
              border: "1px solid var(--color-border)",
              color: "var(--color-text-muted)",
            }}
          >
            Check in again
          </button>
        </div>
      )}

      {/* ── History ── */}
      {!loading && checkIns.length > 0 && (
        <div className="space-y-3 animate-fade-in-up">
          <h2 className="section-label px-0.5">Recent Check-Ins</h2>
          <div className="space-y-2">
            {checkIns.map((c, i) => (
              <HistoryItem key={c.id} checkIn={c} index={i} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function TodayCard({ checkIn, onNewCheckIn }: { checkIn: CheckIn; onNewCheckIn: () => void }) {
  return (
    <div
      className="animate-fade-in-scale rounded-2xl overflow-hidden"
      style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", boxShadow: "var(--shadow-card)" }}
    >
      <div className={`bg-gradient-to-r ${MOOD_GRADIENT[checkIn.mood]} h-1`} />
      <div className="p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${MOOD_GRADIENT[checkIn.mood]} flex items-center justify-center text-2xl`}
              style={{ boxShadow: `0 4px 12px ${MOOD_GLOW[checkIn.mood]}` }}>
              {MOOD_EMOJI[checkIn.mood]}
            </div>
            <div>
              <p className="font-display font-bold capitalize" style={{ color: "var(--color-text)" }}>
                {checkIn.mood} · {checkIn.intensity}/5
              </p>
              <p className="text-xs" style={{ color: "var(--color-text-faint)" }}>Today</p>
            </div>
          </div>
          <span className="status-pill status-pill-teal">✓ Done</span>
        </div>

        <div className="h-px" style={{ background: "var(--color-border)" }} />

        <p className="text-sm leading-relaxed" style={{ color: "var(--color-text)" }}>
          {checkIn.aiReflection}
        </p>

        <div className="rounded-xl px-4 py-3" style={{ background: "var(--color-accent-light)", border: "1px solid var(--color-border)" }}>
          <p className="section-label mb-1.5" style={{ color: "var(--color-accent)" }}>✨ One thing to try</p>
          <p className="text-sm font-medium" style={{ color: "var(--color-accent-dark)" }}>{checkIn.aiSuggestion}</p>
        </div>

        <button
          onClick={onNewCheckIn}
          className="text-xs font-medium transition-colors hover:text-[var(--color-accent)]"
          style={{ color: "var(--color-text-faint)" }}
        >
          Check in again anyway →
        </button>
      </div>
    </div>
  );
}

function HistoryItem({ checkIn, index }: { checkIn: CheckIn; index: number }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <button
      onClick={() => setExpanded((v) => !v)}
      className={clsx("w-full text-left rounded-xl px-4 py-3.5 transition-all duration-250 animate-fade-in-up")}
      style={{
        background: "var(--color-surface)",
        border: `1px solid ${expanded ? "var(--color-accent)" : "var(--color-border)"}`,
        boxShadow: expanded ? "var(--shadow-card)" : "none",
        animationDelay: `${index * 40}ms`,
      }}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${MOOD_GRADIENT[checkIn.mood]} flex items-center justify-center text-sm`}>
            {MOOD_EMOJI[checkIn.mood]}
          </div>
          <div className="text-left">
            <span className="font-display font-semibold text-sm capitalize block leading-tight" style={{ color: "var(--color-text)" }}>
              {checkIn.mood}
            </span>
            <span className="text-xs" style={{ color: "var(--color-text-faint)" }}>
              {checkIn.intensity}/5 intensity
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs" style={{ color: "var(--color-text-faint)" }}>
            {formatDistanceToNow(new Date(checkIn.createdAt), { addSuffix: true })}
          </span>
          <span
            className="text-xs transition-transform duration-200"
            style={{
              color: "var(--color-text-faint)",
              transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
            }}
          >↓</span>
        </div>
      </div>

      {expanded && (
        <div className="mt-3.5 space-y-2.5 pt-3.5 animate-fade-in" style={{ borderTop: "1px solid var(--color-border)" }}>
          {checkIn.note && (
            <p className="text-xs italic leading-relaxed" style={{ color: "var(--color-text-muted)" }}>
              "{checkIn.note}"
            </p>
          )}
          <p className="text-xs leading-relaxed" style={{ color: "var(--color-text-muted)" }}>
            {checkIn.aiReflection}
          </p>
          <div
            className="text-xs rounded-lg px-3 py-2.5 leading-relaxed font-medium"
            style={{ background: "var(--color-accent-light)", color: "var(--color-accent-dark)" }}
          >
            {checkIn.aiSuggestion}
          </div>
        </div>
      )}
    </button>
  );
}