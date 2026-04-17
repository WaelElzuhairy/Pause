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
const TONE_COLOR: Record<Tone, string> = {
  kind: "#5a7f5a",
  neutral: "#94a3b8",
  rude: "#f59e0b",
  "passive-aggressive": "#fb923c",
  aggressive: "#f43f5e",
};
const INSIGHT_ICON: Record<string, string> = {
  mood_pattern: "🌊", tone_trend: "💬", connection: "🔗",
};

export default function InsightsPage() {
  const { checkIns } = useCheckIns(30);
  const { messages } = useMessages(30);
  const { latestInsights, loading: insightsLoading } = useInsights();
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState("");

  // Build last-7-days mood chart data
  const moodChart = Array.from({ length: 7 }, (_, i) => {
    const day = subDays(new Date(), 6 - i);
    const dayStr = format(day, "yyyy-MM-dd");
    const dayCheckIns = checkIns.filter(
      (c) => format(new Date(c.createdAt), "yyyy-MM-dd") === dayStr
    );
    const avg =
      dayCheckIns.length > 0
        ? dayCheckIns.reduce((s, c) => s + MOOD_SCORE[c.mood], 0) / dayCheckIns.length
        : null;
    return {
      day: format(day, "EEE"),
      score: avg,
      emoji: dayCheckIns[0] ? MOOD_EMOJI[dayCheckIns[0].mood] : null,
      count: dayCheckIns.length,
    };
  });

  // Tone distribution
  const toneCounts: Partial<Record<Tone, number>> = {};
  for (const m of messages) {
    toneCounts[m.detectedTone] = (toneCounts[m.detectedTone] ?? 0) + 1;
  }
  const toneData = (Object.entries(toneCounts) as [Tone, number][])
    .sort((a, b) => b[1] - a[1])
    .map(([tone, count]) => ({ tone, count }));

  const totalMessages = messages.length;

  const handleGenerate = async () => {
    setGenerating(true);
    setGenError("");
    try {
      await callGenerateInsight({});
    } catch {
      setGenError("Couldn't generate insights — functions may not be deployed yet.");
    } finally {
      setGenerating(false);
    }
  };

  const hasData = checkIns.length > 0 || messages.length > 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-[var(--color-text)]">Insights</h1>
        <p className="text-sm text-[var(--color-text-muted)] mt-1">
          Patterns from your check-ins and messages.
        </p>
      </div>

      {/* AI Insights */}
      <div className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] p-5 space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-[var(--color-text)]">AI Observations</p>
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="text-xs text-[var(--color-accent)] font-medium hover:underline disabled:opacity-50"
          >
            {generating ? "Generating…" : "Refresh"}
          </button>
        </div>

        {genError && (
          <p className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2">
            {genError}
          </p>
        )}

        {insightsLoading ? (
          <div className="flex items-center gap-2 text-[var(--color-text-faint)]">
            <div className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
            <span className="text-xs">Loading…</span>
          </div>
        ) : latestInsights.length > 0 ? (
          <div className="space-y-3">
            {latestInsights.map((ins, i) => (
              <div key={i} className="flex gap-3 items-start">
                <span className="text-lg shrink-0 mt-0.5">{INSIGHT_ICON[ins.type]}</span>
                <p className="text-sm text-[var(--color-text)] leading-relaxed">
                  {ins.text}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-[var(--color-text-faint)]">
            {hasData
              ? "Tap Refresh to generate your first insights."
              : "Check in a few times and analyze some messages — then come back here."}
          </p>
        )}
      </div>

      {/* Mood chart */}
      <div className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] p-5 space-y-4">
        <p className="text-sm font-medium text-[var(--color-text)]">Mood this week</p>
        {checkIns.length === 0 ? (
          <p className="text-sm text-[var(--color-text-faint)] py-4 text-center">
            No check-ins yet.
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={moodChart} barSize={28}>
              <XAxis
                dataKey="day"
                tick={{ fontSize: 11, fill: "var(--color-text-faint)" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis domain={[0, 5]} hide />
              <Tooltip
                cursor={{ fill: "var(--color-surface-raised)" }}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0].payload;
                  return (
                    <div className="bg-white border border-[var(--color-border)] rounded-xl px-3 py-2 shadow-sm text-xs">
                      {d.count > 0 ? (
                        <>
                          <span>{d.emoji} </span>
                          <span className="text-[var(--color-text)]">
                            Score {(d.score as number).toFixed(1)}/5
                          </span>
                        </>
                      ) : (
                        <span className="text-[var(--color-text-faint)]">No check-in</span>
                      )}
                    </div>
                  );
                }}
              />
              <Bar dataKey="score" radius={[6, 6, 0, 0]}>
                {moodChart.map((entry, i) => (
                  <Cell
                    key={i}
                    fill={
                      entry.score === null
                        ? "var(--color-slate-100)"
                        : entry.score >= 4
                        ? "var(--color-sage-400)"
                        : entry.score >= 3
                        ? "var(--color-sage-300)"
                        : "var(--color-amber-400)"
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Tone breakdown */}
      <div className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] p-5 space-y-4">
        <p className="text-sm font-medium text-[var(--color-text)]">
          Message tone breakdown
        </p>
        {toneData.length === 0 ? (
          <p className="text-sm text-[var(--color-text-faint)] py-4 text-center">
            No messages analyzed yet.
          </p>
        ) : (
          <div className="space-y-3">
            {toneData.map(({ tone, count }) => (
              <div key={tone} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-[var(--color-text)] capitalize">{tone}</span>
                  <span className="text-[var(--color-text-faint)]">
                    {count} / {totalMessages}
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-[var(--color-slate-100)]">
                  <div
                    className="h-2 rounded-full transition-all"
                    style={{
                      width: `${(count / totalMessages) * 100}%`,
                      backgroundColor: TONE_COLOR[tone],
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] p-4 text-center">
          <p className="text-3xl font-semibold text-[var(--color-text)]">
            {checkIns.length}
          </p>
          <p className="text-xs text-[var(--color-text-muted)] mt-1">Check-ins</p>
        </div>
        <div className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] p-4 text-center">
          <p className="text-3xl font-semibold text-[var(--color-text)]">
            {messages.length}
          </p>
          <p className="text-xs text-[var(--color-text-muted)] mt-1">Messages analyzed</p>
        </div>
      </div>
    </div>
  );
}
