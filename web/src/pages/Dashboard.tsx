import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useCheckIns } from "../hooks/useCheckIns";
import { useMessages } from "../hooks/useMessages";
import { useInsights } from "../hooks/useInsights";
import { formatDistanceToNow, format } from "date-fns";
import ToneChip from "../components/ToneChip";
import type { Mood } from "../lib/firebase";

const MOOD_EMOJI: Record<Mood, string> = {
  happy: "😊", calm: "😌", tired: "😴",
  anxious: "😰", stressed: "😤", frustrated: "😔",
};

const INSIGHT_ICON: Record<string, string> = {
  mood_pattern: "🌊",
  tone_trend: "💬",
  connection: "🔗",
};

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { checkIns, todayCheckIn } = useCheckIns(5);
  const { messages } = useMessages(5);
  const { latestInsights } = useInsights();

  const firstName = user?.displayName?.split(" ")[0] ?? "there";
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  // Merge + sort recent activity
  const activity = [
    ...checkIns.map((c) => ({ type: "checkin" as const, date: c.createdAt, data: c })),
    ...messages.map((m) => ({ type: "message" as const, date: m.createdAt, data: m })),
  ]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 6);

  // Streak: consecutive days with a check-in
  let streak = 0;
  const seen = new Set<string>();
  for (const c of checkIns) {
    const day = format(new Date(c.createdAt), "yyyy-MM-dd");
    seen.add(day);
  }
  const today = new Date();
  for (let i = 0; i < 30; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    if (seen.has(format(d, "yyyy-MM-dd"))) streak++;
    else break;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-[var(--color-text)]">
          {greeting}, {firstName}
        </h1>
        <p className="text-sm text-[var(--color-text-muted)] mt-0.5">
          {format(new Date(), "EEEE, MMMM d")}
        </p>
      </div>

      {/* Insight banner */}
      {latestInsights.length > 0 && (
        <div className="bg-[var(--color-accent-light)] border border-[var(--color-sage-200)] rounded-2xl p-4 space-y-2">
          <p className="text-xs font-medium text-[var(--color-accent)] uppercase tracking-wide">
            Your insight
          </p>
          {latestInsights.slice(0, 2).map((ins, i) => (
            <div key={i} className="flex gap-2 items-start">
              <span className="text-base shrink-0">{INSIGHT_ICON[ins.type]}</span>
              <p className="text-sm text-[var(--color-accent-dark)] leading-relaxed">
                {ins.text}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Today's check-in card */}
      {todayCheckIn ? (
        <div className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-[var(--color-text)]">Today's check-in</p>
            <span className="text-xs bg-[var(--color-accent-light)] text-[var(--color-accent)] px-2 py-0.5 rounded-full font-medium">
              Done ✓
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-3xl">{MOOD_EMOJI[todayCheckIn.mood]}</span>
            <div>
              <p className="text-sm font-medium text-[var(--color-text)] capitalize">
                {todayCheckIn.mood} · {todayCheckIn.intensity}/5
              </p>
              <p className="text-xs text-[var(--color-text-muted)] leading-relaxed mt-0.5">
                {todayCheckIn.aiSuggestion}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <button
          onClick={() => navigate("/checkin")}
          className="w-full bg-[var(--color-surface)] rounded-2xl border-2 border-dashed border-[var(--color-sage-300)] p-6 flex flex-col items-center gap-2 hover:border-[var(--color-accent)] hover:bg-[var(--color-accent-light)] transition-colors group"
        >
          <span className="text-3xl">💭</span>
          <p className="text-sm font-medium text-[var(--color-text-muted)] group-hover:text-[var(--color-accent-dark)]">
            How are you feeling today?
          </p>
          <p className="text-xs text-[var(--color-text-faint)]">Tap to check in</p>
        </button>
      )}

      {/* Quick analyze */}
      <button
        onClick={() => navigate("/improve")}
        className="w-full bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] p-4 flex items-center gap-3 hover:bg-[var(--color-surface-raised)] transition-colors text-left"
      >
        <div className="w-10 h-10 rounded-xl bg-[var(--color-accent-light)] flex items-center justify-center text-xl shrink-0">
          💬
        </div>
        <div>
          <p className="text-sm font-medium text-[var(--color-text)]">
            Improve a message
          </p>
          <p className="text-xs text-[var(--color-text-muted)]">
            See how it sounds before you send
          </p>
        </div>
        <span className="ml-auto text-[var(--color-text-faint)]">→</span>
      </button>

      {/* Streak */}
      {streak > 0 && (
        <div className="flex items-center gap-3 bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] px-5 py-4">
          <span className="text-2xl">🔥</span>
          <div>
            <p className="text-sm font-semibold text-[var(--color-text)]">
              {streak}-day streak
            </p>
            <p className="text-xs text-[var(--color-text-muted)]">
              Keep checking in daily
            </p>
          </div>
        </div>
      )}

      {/* Recent activity */}
      {activity.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-[var(--color-text-muted)] uppercase tracking-wide">
            Recent activity
          </h2>
          <div className="space-y-2">
            {activity.map((item) =>
              item.type === "checkin" ? (
                <div
                  key={`ci-${item.data.id}`}
                  className="flex items-center gap-3 bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] px-4 py-3"
                >
                  <span className="text-xl">{MOOD_EMOJI[(item.data as typeof checkIns[0]).mood]}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-[var(--color-text)] capitalize">
                      Checked in as{" "}
                      <span className="font-medium">
                        {(item.data as typeof checkIns[0]).mood}
                      </span>
                    </p>
                    <p className="text-xs text-[var(--color-text-faint)]">
                      {formatDistanceToNow(new Date(item.date), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              ) : (
                <div
                  key={`msg-${item.data.id}`}
                  className="flex items-center gap-3 bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] px-4 py-3"
                >
                  <span className="text-xl shrink-0">💬</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-[var(--color-text)] truncate">
                      "{(item.data as typeof messages[0]).originalText}"
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <ToneChip tone={(item.data as typeof messages[0]).detectedTone} />
                      <span className="text-xs text-[var(--color-text-faint)]">
                        {formatDistanceToNow(new Date(item.date), { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                </div>
              )
            )}
          </div>
        </div>
      )}

      {/* Empty state */}
      {activity.length === 0 && (
        <div className="text-center py-10 space-y-2">
          <p className="text-3xl">🌱</p>
          <p className="text-sm text-[var(--color-text-muted)]">
            Your activity will appear here.
          </p>
          <p className="text-xs text-[var(--color-text-faint)]">
            Start with a daily check-in.
          </p>
        </div>
      )}
    </div>
  );
}
