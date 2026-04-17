import { useState } from "react";
import { formatDistanceToNow, format } from "date-fns";
import { MoodPicker, IntensitySlider } from "../components/MoodPicker";
import { callSubmitCheckIn } from "../lib/firebase";
import { useCheckIns } from "../hooks/useCheckIns";
import type { Mood, CheckIn } from "../lib/firebase";
import clsx from "clsx";

type Step = "pick" | "loading" | "response";

const MOOD_EMOJI: Record<Mood, string> = {
  happy: "😊",
  calm: "😌",
  tired: "😴",
  anxious: "😰",
  stressed: "😤",
  frustrated: "😔",
};

export default function CheckInPage() {
  const { checkIns, loading, todayCheckIn } = useCheckIns(14);

  const [step, setStep] = useState<Step>("pick");
  const [mood, setMood] = useState<Mood | null>(null);
  const [intensity, setIntensity] = useState(3);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [result, setResult] = useState<{
    reflection: string;
    suggestion: string;
  } | null>(null);

  const handleSubmit = async () => {
    if (!mood) return;
    setStep("loading");
    setError("");
    try {
      const res = await callSubmitCheckIn({ mood, intensity, note: note || undefined });
      setResult(res.data);
      setStep("response");
    } catch (e) {
      setError(
        "Couldn't reach the AI right now — functions may not be deployed yet. Your mood will still be saved once functions are live."
      );
      setStep("pick");
    }
  };

  const handleReset = () => {
    setStep("pick");
    setMood(null);
    setIntensity(3);
    setNote("");
    setResult(null);
    setError("");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-[var(--color-text)]">
          Daily Check-In
        </h1>
        <p className="text-sm text-[var(--color-text-muted)] mt-1">
          A moment to notice how you're doing.
        </p>
      </div>

      {/* Already checked in today */}
      {todayCheckIn && step === "pick" && (
        <TodayCard checkIn={todayCheckIn} onNewCheckIn={handleReset} />
      )}

      {/* Check-in form */}
      {!todayCheckIn && step === "pick" && (
        <div className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] p-6 space-y-6">
          <div>
            <p className="text-sm font-medium text-[var(--color-text)] mb-3">
              How are you feeling right now?
            </p>
            <MoodPicker value={mood} onChange={setMood} />
          </div>

          {mood && (
            <>
              <div>
                <p className="text-sm font-medium text-[var(--color-text)] mb-3">
                  How intense is that feeling?
                </p>
                <IntensitySlider value={intensity} onChange={setIntensity} />
              </div>

              <div>
                <p className="text-sm font-medium text-[var(--color-text)] mb-2">
                  Anything specific on your mind?{" "}
                  <span className="text-[var(--color-text-faint)] font-normal">
                    (optional)
                  </span>
                </p>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="e.g. exam tomorrow, argument with a friend..."
                  maxLength={300}
                  rows={3}
                  className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-raised)] px-4 py-3 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-faint)] resize-none focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent"
                />
                <p className="text-right text-xs text-[var(--color-text-faint)] mt-1">
                  {note.length}/300
                </p>
              </div>

              {error && (
                <p className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}

              <button
                onClick={handleSubmit}
                className="w-full py-3 rounded-xl bg-[var(--color-accent)] hover:bg-[var(--color-accent-dark)] text-white text-sm font-medium transition-colors"
              >
                Check in
              </button>
            </>
          )}
        </div>
      )}

      {/* Loading */}
      {step === "loading" && (
        <div className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] p-10 flex flex-col items-center gap-4">
          <div className="w-8 h-8 rounded-full border-2 border-[var(--color-accent)] border-t-transparent animate-spin" />
          <p className="text-sm text-[var(--color-text-muted)]">
            Reflecting on your day…
          </p>
        </div>
      )}

      {/* AI Response */}
      {step === "response" && result && mood && (
        <div className="space-y-4">
          <div className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] p-6 space-y-4">
            <div className="flex items-center gap-3">
              <span className="text-3xl">{MOOD_EMOJI[mood]}</span>
              <div>
                <p className="text-sm font-medium text-[var(--color-text)] capitalize">
                  {mood} · {intensity}/5
                </p>
                <p className="text-xs text-[var(--color-text-faint)]">
                  {format(new Date(), "EEEE, MMM d")}
                </p>
              </div>
            </div>

            <div className="h-px bg-[var(--color-border)]" />

            <div>
              <p className="text-xs font-medium text-[var(--color-text-faint)] uppercase tracking-wide mb-2">
                Reflection
              </p>
              <p className="text-sm text-[var(--color-text)] leading-relaxed">
                {result.reflection}
              </p>
            </div>

            <div className="bg-[var(--color-accent-light)] rounded-xl px-4 py-3">
              <p className="text-xs font-medium text-[var(--color-accent-dark)] uppercase tracking-wide mb-1">
                One thing to try
              </p>
              <p className="text-sm text-[var(--color-accent-dark)]">
                {result.suggestion}
              </p>
            </div>
          </div>

          <button
            onClick={handleReset}
            className="w-full py-3 rounded-xl border border-[var(--color-border)] text-sm text-[var(--color-text-muted)] hover:bg-[var(--color-surface-raised)] transition-colors"
          >
            Check in again
          </button>
        </div>
      )}

      {/* History */}
      {!loading && checkIns.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-[var(--color-text-muted)] uppercase tracking-wide">
            Recent check-ins
          </h2>
          <div className="space-y-2">
            {checkIns.map((c) => (
              <HistoryItem key={c.id} checkIn={c} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function TodayCard({
  checkIn,
  onNewCheckIn,
}: {
  checkIn: CheckIn;
  onNewCheckIn: () => void;
}) {
  return (
    <div className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-3xl">{MOOD_EMOJI[checkIn.mood]}</span>
          <div>
            <p className="text-sm font-medium text-[var(--color-text)] capitalize">
              {checkIn.mood} · {checkIn.intensity}/5
            </p>
            <p className="text-xs text-[var(--color-text-faint)]">Today</p>
          </div>
        </div>
        <span className="text-xs text-[var(--color-accent)] bg-[var(--color-accent-light)] px-2 py-1 rounded-full font-medium">
          Done
        </span>
      </div>

      <div className="h-px bg-[var(--color-border)]" />

      <p className="text-sm text-[var(--color-text)] leading-relaxed">
        {checkIn.aiReflection}
      </p>

      <div className="bg-[var(--color-accent-light)] rounded-xl px-4 py-3">
        <p className="text-xs font-medium text-[var(--color-accent-dark)] uppercase tracking-wide mb-1">
          One thing to try
        </p>
        <p className="text-sm text-[var(--color-accent-dark)]">
          {checkIn.aiSuggestion}
        </p>
      </div>

      <button
        onClick={onNewCheckIn}
        className="text-xs text-[var(--color-text-faint)] hover:text-[var(--color-text-muted)] transition-colors"
      >
        Check in again anyway →
      </button>
    </div>
  );
}

function HistoryItem({ checkIn }: { checkIn: CheckIn }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <button
      onClick={() => setExpanded((v) => !v)}
      className={clsx(
        "w-full text-left bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] px-4 py-3 transition-colors",
        expanded ? "border-[var(--color-sage-200)]" : "hover:bg-[var(--color-surface-raised)]"
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">{MOOD_EMOJI[checkIn.mood]}</span>
          <span className="text-sm text-[var(--color-text)] capitalize">
            {checkIn.mood}
          </span>
          <span className="text-xs text-[var(--color-text-faint)]">
            · {checkIn.intensity}/5
          </span>
        </div>
        <span className="text-xs text-[var(--color-text-faint)]">
          {formatDistanceToNow(new Date(checkIn.createdAt), { addSuffix: true })}
        </span>
      </div>

      {expanded && (
        <div className="mt-3 space-y-2 border-t border-[var(--color-border)] pt-3">
          {checkIn.note && (
            <p className="text-xs text-[var(--color-text-muted)] italic">
              "{checkIn.note}"
            </p>
          )}
          <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">
            {checkIn.aiReflection}
          </p>
          <p className="text-xs text-[var(--color-accent-dark)] bg-[var(--color-accent-light)] rounded-lg px-3 py-2">
            {checkIn.aiSuggestion}
          </p>
        </div>
      )}
    </button>
  );
}
