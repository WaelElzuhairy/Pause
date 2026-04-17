import clsx from "clsx";
import type { Mood } from "../lib/firebase";

const MOODS: { value: Mood; emoji: string; label: string; color: string }[] = [
  { value: "happy",      emoji: "😊", label: "Happy",      color: "bg-emerald-50 border-emerald-200 text-emerald-700" },
  { value: "calm",       emoji: "😌", label: "Calm",       color: "bg-blue-50 border-blue-200 text-blue-700" },
  { value: "tired",      emoji: "😴", label: "Tired",      color: "bg-slate-50 border-slate-200 text-slate-600" },
  { value: "anxious",    emoji: "😰", label: "Anxious",    color: "bg-yellow-50 border-yellow-200 text-yellow-700" },
  { value: "stressed",   emoji: "😤", label: "Stressed",   color: "bg-orange-50 border-orange-200 text-orange-700" },
  { value: "frustrated", emoji: "😔", label: "Frustrated", color: "bg-rose-50 border-rose-200 text-rose-700" },
];

interface Props {
  value: Mood | null;
  onChange: (mood: Mood) => void;
}

export function MoodPicker({ value, onChange }: Props) {
  return (
    <div className="grid grid-cols-3 gap-3">
      {MOODS.map((m) => (
        <button
          key={m.value}
          onClick={() => onChange(m.value)}
          className={clsx(
            "flex flex-col items-center gap-1.5 py-4 rounded-xl border-2 transition-all",
            value === m.value
              ? `${m.color} border-current scale-[1.03] shadow-sm`
              : "bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-slate-300)]"
          )}
        >
          <span className="text-2xl leading-none">{m.emoji}</span>
          <span className="text-xs font-medium">{m.label}</span>
        </button>
      ))}
    </div>
  );
}

interface IntensityProps {
  value: number;
  onChange: (v: number) => void;
}

export function IntensitySlider({ value, onChange }: IntensityProps) {
  const labels = ["", "Barely", "A little", "Moderately", "Pretty", "Very"];
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-xs text-[var(--color-text-faint)]">
        <span>Mild</span>
        <span className="font-medium text-[var(--color-text-muted)]">
          {labels[value]} much
        </span>
        <span>Intense</span>
      </div>
      <input
        type="range"
        min={1}
        max={5}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-[var(--color-accent)]"
      />
      <div className="flex justify-between">
        {[1, 2, 3, 4, 5].map((n) => (
          <span
            key={n}
            className={clsx(
              "text-xs w-5 text-center",
              value === n
                ? "text-[var(--color-accent)] font-semibold"
                : "text-[var(--color-text-faint)]"
            )}
          >
            {n}
          </span>
        ))}
      </div>
    </div>
  );
}
