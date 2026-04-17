import clsx from "clsx";
import type { Tone } from "../lib/firebase";

const TONE_CONFIG: Record<Tone, { label: string; color: string; bg: string }> = {
  aggressive:         { label: "May feel sharp",          color: "text-rose-700",   bg: "bg-rose-50 border-rose-200" },
  "passive-aggressive": { label: "May feel indirect",     color: "text-orange-700", bg: "bg-orange-50 border-orange-200" },
  rude:               { label: "May feel blunt",          color: "text-amber-700",  bg: "bg-amber-50 border-amber-200" },
  neutral:            { label: "Neutral tone",            color: "text-slate-600",  bg: "bg-slate-50 border-slate-200" },
  kind:               { label: "Kind tone",               color: "text-emerald-700",bg: "bg-emerald-50 border-emerald-200" },
};

export default function ToneChip({ tone }: { tone: Tone }) {
  const cfg = TONE_CONFIG[tone];
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-medium",
        cfg.bg,
        cfg.color
      )}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
      {cfg.label}
    </span>
  );
}
