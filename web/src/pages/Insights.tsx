import { useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import { format, subDays } from "date-fns";
import { useCheckIns } from "../hooks/useCheckIns";
import { useMessages } from "../hooks/useMessages";
import { useInsights } from "../hooks/useInsights";
import { callGenerateInsight } from "../lib/firebase";
import type { Mood, Tone } from "../lib/firebase";

const MOOD_SCORE: Record<Mood, number> = {
  happy: 5, calm: 4, tired: 2, anxious: 2, stressed: 1, frustrated: 1,
};
const MOOD_EMOJI: Record<Mood, string> = {
  happy: "😊", calm: "😌", tired: "😴", anxious: "😰", stressed: "😤", frustrated: "😔",
};

const TONE_CONFIG: Record<Tone, { gradient: string; label: string; icon: string; color: string }> = {
  kind: { gradient: "from-teal-400 to-emerald-400", label: "Kind", icon: "💚", color: "#14c49e" },
  neutral: { gradient: "from-slate-400 to-slate-500", label: "Neutral", icon: "⚬", color: "#64748b" },
  rude: { gradient: "from-amber-400 to-yellow-500", label: "Rude", icon: "⚡", color: "#f59e0b" },
  "passive-aggressive": { gradient: "from-orange-400 to-amber-500", label: "Passive-Aggressive", icon: "🌀", color: "#f97316" },
  aggressive: { gradient: "from-rose-500 to-red-500", label: "Aggressive", icon: "🔥", color: "#ef4444" },
};

const INSIGHT_CONFIG: Record<string, { icon: string; gradient: string }> = {
  mood_pattern: { icon: "🌊", gradient: "from-sky-400 to-cyan-400" },
  tone_trend: { icon: "💬", gradient: "from-violet-400 to-purple-400" },
  connection: { icon: "🔗", gradient: "from-teal-400 to-emerald-400" },
};

/* Score → color mapping for bar chart */
function scoreColor(score: number | null): string {
  if (score === null) return "var(--color-border)";
  if (score >= 4) return "#14c49e";
  if (score >= 3) return "#3aa3e3";
  if (score >= 2) return "#f59e0b";
  return "#ef4444";
}

export default function InsightsPage() {
  const { checkIns } = useCheckIns(30);
  const { messages } = useMessages(30);
  const { latestInsights, loading: insightsLoading } = useInsights();
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState("");

  const moodChart = Array.from({ length: 7 }, (_, i) => {
    const day = subDays(new Date(), 6 - i);
    const dayStr = format(day, "yyyy-MM-dd");
    const dayCheckIns = checkIns.filter(
      (c) => format(new Date(c.createdAt), "yyyy-MM-dd") === dayStr
    );
    const avg = dayCheckIns.length > 0
      ? dayCheckIns.reduce((s, c) => s + MOOD_SCORE[c.mood], 0) / dayCheckIns.length
      : null;
    return {
      day: format(day, "EEE"),
      score: avg,
      emoji: dayCheckIns[0] ? MOOD_EMOJI[dayCheckIns[0].mood] : null,
      count: dayCheckIns.length,
    };
  });

  const toneCounts: Partial<Record<Tone, number>> = {};
  for (const m of messages) toneCounts[m.detectedTone] = (toneCounts[m.detectedTone] ?? 0) + 1;
  const toneData = (Object.entries(toneCounts) as [Tone, number][])
    .sort((a, b) => b[1] - a[1])
    .map(([tone, count]) => ({ tone, count }));

  const totalMessages = messages.length;
  const hasData = checkIns.length > 0 || messages.length > 0;

  const handleGenerate = async () => {
    setGenerating(true); setGenError("");
    try { await callGenerateInsight({}); }
    catch { setGenError("Couldn't generate insights — functions may not be deployed yet."); }
    finally { setGenerating(false); }
  };

  const avgMoodScore = checkIns.length > 0
    ? (checkIns.slice(0, 7).reduce((s, c) => s + MOOD_SCORE[c.mood], 0) / Math.min(checkIns.length, 7)).toFixed(1)
    : null;

  /* Mood trend arrow */
  const lastTwo = moodChart.filter((d) => d.score !== null).slice(-2);
  const moodTrend = lastTwo.length === 2
    ? lastTwo[1].score! > lastTwo[0].score! ? "↑" : lastTwo[1].score! < lastTwo[0].score! ? "↓" : "→"
    : null;

  return (
    <div className="space-y-6 pb-6">
      {/* ── Header ── */}
      <div className="animate-fade-in-up">
        <h1 className="font-display text-[28px] font-bold tracking-tight" style={{ color: "var(--color-text)" }}>
          Insights
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--color-text-muted)" }}>
          Patterns emerging from your emotional data.
        </p>
      </div>

      {/* ── Summary Stats ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 animate-fade-in-up" style={{ animationDelay: "40ms" }}>
        <StatCard value={String(checkIns.length)} label="Check-ins" icon="📅" gradient="from-teal-400 to-emerald-400" />
        <StatCard value={String(messages.length)} label="Analyzed" icon="💬" gradient="from-violet-400 to-indigo-400" />
        <StatCard
          value={avgMoodScore ? `${avgMoodScore}${moodTrend ?? ""}` : "—"}
          label="Avg Mood"
          icon="🌡️"
          gradient="from-amber-400 to-orange-400"
        />
        <StatCard 
          value="3" 
          label="Scenarios" 
          icon="🧭" 
          gradient="from-sky-400 to-blue-500" 
        />
      </div>

      {/* ── AI Observations ── */}
      <div
        className="animate-fade-in-up rounded-2xl p-5 space-y-4 relative overflow-hidden"
        style={{
          animationDelay: "80ms",
          background: "var(--color-surface)",
          border: "1px solid var(--color-border)",
          boxShadow: "var(--shadow-card)",
        }}
      >
        {/* Ambient orb */}
        <div className="absolute top-0 right-0 w-40 h-40 pointer-events-none opacity-20"
          style={{ background: "radial-gradient(circle, var(--color-secondary-glow) 0%, transparent 70%)", transform: "translate(30%,-30%)" }} />

        <div className="flex items-center justify-between relative z-10">
          <div>
            <p className="font-display font-bold" style={{ color: "var(--color-text)" }}>AI Observations</p>
            <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>Generated from your activity</p>
          </div>
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full transition-all disabled:opacity-50"
            style={{
              background: "var(--color-accent-light)",
              color: "var(--color-accent)",
              border: "1px solid var(--color-border)",
            }}
          >
            {generating ? (
              <>
                <span className="w-3 h-3 rounded-full border-2 border-current border-t-transparent animate-spin" />
                Generating…
              </>
            ) : <>↻ Refresh</>}
          </button>
        </div>

        {genError && (
          <div className="flex gap-2 items-start rounded-xl px-3.5 py-3"
            style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)" }}>
            <span>⚠️</span>
            <p className="text-xs" style={{ color: "#92400e" }}>{genError}</p>
          </div>
        )}

        {insightsLoading ? (
          <div className="flex items-center gap-3 py-2">
            <div className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "var(--color-accent)" }} />
            <span className="text-sm" style={{ color: "var(--color-text-faint)" }}>Loading insights…</span>
          </div>
        ) : latestInsights.length > 0 ? (
          <div className="space-y-3">
            {latestInsights.map((ins, i) => {
              const cfg = INSIGHT_CONFIG[ins.type] ?? { icon: "💡", gradient: "from-slate-400 to-slate-300" };
              return (
                <div
                  key={i}
                  className="flex gap-3 items-start rounded-xl p-3.5 animate-fade-in-up hover-lift"
                  style={{
                    background: "var(--color-surface-raised)",
                    border: "1px solid var(--color-border)",
                    animationDelay: `${i * 80}ms`,
                  }}
                >
                  <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${cfg.gradient} flex items-center justify-center text-lg shrink-0`}>
                    {cfg.icon}
                  </div>
                  <p className="text-sm leading-relaxed pt-1" style={{ color: "var(--color-text)" }}>
                    {ins.text}
                  </p>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-6">
            <p className="text-2xl mb-2">🔍</p>
            <p className="text-sm" style={{ color: "var(--color-text-faint)" }}>
              {hasData ? "Tap Refresh to generate your first insights." : "Check in a few times, then come back here."}
            </p>
          </div>
        )}
      </div>

      {/* ── Mood Chart ── */}
      <div
        className="animate-fade-in-up rounded-2xl p-5 space-y-4"
        style={{
          animationDelay: "120ms",
          background: "var(--color-surface)",
          border: "1px solid var(--color-border)",
          boxShadow: "var(--shadow-card)",
        }}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="font-display font-bold" style={{ color: "var(--color-text)" }}>Mood This Week</p>
            <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>Wellbeing score 1–5</p>
          </div>
          {avgMoodScore && (
            <div className="text-right">
              <p className="font-display font-bold text-xl" style={{ color: scoreColor(parseFloat(avgMoodScore)) }}>
                {avgMoodScore}
              </p>
              <p className="text-xs" style={{ color: "var(--color-text-faint)" }}>avg</p>
            </div>
          )}
        </div>

        {checkIns.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-3xl mb-2">📊</p>
            <p className="text-sm" style={{ color: "var(--color-text-faint)" }}>No check-ins yet.</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={moodChart} barSize={28}>
              <XAxis
                dataKey="day"
                tick={{ fontSize: 11, fill: "var(--color-text-faint)", fontFamily: "DM Sans", fontWeight: 600 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis domain={[0, 5]} hide />
              <Tooltip
                cursor={{ fill: "var(--color-surface-raised)", radius: 8 }}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0].payload;
                  return (
                    <div
                      className="rounded-xl px-3 py-2 text-xs"
                      style={{
                        background: "var(--color-surface)",
                        border: "1px solid var(--color-border)",
                        boxShadow: "var(--shadow-elevated)",
                      }}
                    >
                      {d.count > 0 ? (
                        <div className="flex items-center gap-1.5">
                          <span>{d.emoji}</span>
                          <span className="font-bold" style={{ color: "var(--color-text)" }}>
                            {(d.score as number).toFixed(1)}/5
                          </span>
                        </div>
                      ) : (
                        <span style={{ color: "var(--color-text-faint)" }}>No check-in</span>
                      )}
                    </div>
                  );
                }}
              />
              <Bar dataKey="score" radius={[8, 8, 3, 3]}>
                {moodChart.map((entry, i) => (
                  <Cell
                    key={i}
                    fill={scoreColor(entry.score)}
                    opacity={entry.score === null ? 0.3 : 1}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* ── Tone Breakdown ── */}
      <div
        className="animate-fade-in-up rounded-2xl p-5 space-y-4"
        style={{
          animationDelay: "160ms",
          background: "var(--color-surface)",
          border: "1px solid var(--color-border)",
          boxShadow: "var(--shadow-card)",
        }}
      >
        <div>
          <p className="font-display font-bold" style={{ color: "var(--color-text)" }}>Message Tone</p>
          <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>Breakdown of analyzed messages</p>
        </div>

        {toneData.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-3xl mb-2">💬</p>
            <p className="text-sm" style={{ color: "var(--color-text-faint)" }}>No messages analyzed yet.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {toneData.map(({ tone, count }, i) => {
              const pct = Math.round((count / totalMessages) * 100);
              const cfg = TONE_CONFIG[tone];
              return (
                <div key={tone} className="space-y-2 animate-fade-in-up" style={{ animationDelay: `${i * 60}ms` }}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-base">{cfg.icon}</span>
                      <span className="font-semibold text-sm" style={{ color: "var(--color-text)" }}>{cfg.label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm" style={{ color: cfg.color }}>{pct}%</span>
                      <span className="text-xs" style={{ color: "var(--color-text-faint)" }}>{count}/{totalMessages}</span>
                    </div>
                  </div>

                  {/* Animated progress bar */}
                  <div className="data-bar">
                    <div
                      className={`data-bar-fill bg-gradient-to-r ${cfg.gradient}`}
                      style={{ width: `${pct}%`, transitionDelay: `${i * 100}ms` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  value, label, gradient, icon,
}: {
  value: string; label: string;
  gradient: string; icon: string;
}) {
  return (
    <div
      className="rounded-2xl p-4 flex flex-col gap-2 relative overflow-hidden hover-lift"
      style={{
        background: "var(--color-surface)",
        border: "1px solid var(--color-border)",
        boxShadow: "var(--shadow-sm)",
      }}
    >
      <div className={`absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl ${gradient} opacity-10 rounded-bl-full pointer-events-none`} />
      <span className="text-xl relative z-10">{icon}</span>
      <div className="relative z-10">
        <p className="font-display font-bold text-2xl tracking-tight leading-none" style={{ color: "var(--color-text)" }}>
          {value}
        </p>
        <p className="text-xs mt-0.5 font-medium" style={{ color: "var(--color-text-muted)" }}>{label}</p>
      </div>
    </div>
  );
}