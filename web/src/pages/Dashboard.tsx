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
  tired: "rgba(148,163,184,0.3)",
  anxious: "rgba(167,139,250,0.3)",
  stressed: "rgba(251,113,133,0.3)",
  frustrated: "rgba(248,113,113,0.3)",
};

const INSIGHT_CONFIG: Record<string, { icon: string; gradient: string }> = {
  mood_pattern: { icon: "🌊", gradient: "from-sky-400 to-cyan-300" },
  tone_trend: { icon: "💬", gradient: "from-violet-400 to-purple-300" },
  connection: { icon: "🔗", gradient: "from-teal-400 to-emerald-300" },
};

/* ── Floating neural particles ── */
function NeuralParticles() {
  const particles = Array.from({ length: 8 });
  return (
    <div className="particle-field pointer-events-none">
      {particles.map((_, i) => (
        <div
          key={i}
          className="particle"
          style={{
            width: `${3 + (i % 3)}px`,
            height: `${3 + (i % 3)}px`,
            left: `${10 + i * 11}%`,
            top: `${15 + (i % 5) * 15}%`,
            "--duration": `${5 + i * 0.8}s`,
            "--delay": `${i * 0.5}s`,
            background: i % 3 === 0
              ? "var(--color-accent)"
              : i % 3 === 1
                ? "var(--color-secondary)"
                : "var(--color-tertiary)",
          } as React.CSSProperties}
        />
      ))}
    </div>
  );
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { checkIns, todayCheckIn } = useCheckIns(5);
  const { messages } = useMessages(5);
  const { latestInsights } = useInsights();

  const firstName = user?.displayName?.split(" ")[0] ?? "there";
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const greetingEmoji = hour < 12 ? "☀️" : hour < 17 ? "🌤️" : "🌙";

  const activity = [
    ...checkIns.map((c) => ({ type: "checkin" as const, date: c.createdAt, data: c })),
    ...messages.map((m) => ({ type: "message" as const, date: m.createdAt, data: m })),
  ]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 6);

  let streak = 0;
  const seen = new Set<string>();
  for (const c of checkIns) seen.add(format(new Date(c.createdAt), "yyyy-MM-dd"));
  const today = new Date();
  for (let i = 0; i < 30; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    if (seen.has(format(d, "yyyy-MM-dd"))) streak++;
    else break;
  }

  return (
    <div className="space-y-6 pb-6 relative">
      <NeuralParticles />

      {/* ── Header ── */}
      <div className="animate-fade-in-up relative z-10" style={{ animationDelay: "0ms" }}>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-base">{greetingEmoji}</span>
          <p className="section-label">{format(new Date(), "EEEE, MMMM d")}</p>
        </div>
        <h1 className="font-display text-[32px] font-bold tracking-tight leading-none" style={{ color: "var(--color-text)" }}>
          {greeting},{" "}
          <span className="text-gradient-blue">{firstName}</span>
        </h1>
        <p className="text-sm mt-1.5" style={{ color: "var(--color-text-muted)" }}>
          Your mindful space — reflect before you send.
        </p>
      </div>

      {/* ── AI Insight Banner ── */}
      {latestInsights.length > 0 && (
        <div
          className="animate-fade-in-up relative overflow-hidden rounded-2xl p-5"
          style={{
            animationDelay: "60ms",
            background: "var(--color-surface)",
            border: "1px solid var(--color-border)",
            boxShadow: "var(--shadow-card)",
          }}
        >
          {/* Ambient glow */}
          <div className="absolute top-0 right-0 w-40 h-40 rounded-full pointer-events-none opacity-30"
            style={{ background: "radial-gradient(circle, var(--color-accent-glow) 0%, transparent 70%)", transform: "translate(30%, -30%)" }} />

          <div className="flex items-center gap-2 mb-3 relative z-10">
            <div className="w-1.5 h-1.5 rounded-full animate-glow-pulse" style={{ background: "var(--color-accent)" }} />
            <span className="section-label" style={{ color: "var(--color-accent)" }}>Neural Insight</span>
          </div>

          <div className="space-y-3 relative z-10">
            {latestInsights.slice(0, 2).map((ins, i) => {
              const cfg = INSIGHT_CONFIG[ins.type] ?? { icon: "💡", gradient: "from-slate-400 to-slate-300" };
              return (
                <div key={i} className="flex gap-3 items-start animate-fade-in-up" style={{ animationDelay: `${i * 80}ms` }}>
                  <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${cfg.gradient} flex items-center justify-center text-base shrink-0 shadow-sm`}>
                    {cfg.icon}
                  </div>
                  <p className="text-sm leading-relaxed font-medium" style={{ color: "var(--color-text)" }}>
                    {ins.text}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Today's Check-in ── */}
      <div className="animate-fade-in-up" style={{ animationDelay: "100ms" }}>
        {todayCheckIn ? (
          <div
            className="rounded-2xl overflow-hidden relative"
            style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", boxShadow: "var(--shadow-card)" }}
          >
            {/* Animated mood strip */}
            <div
              className={`h-1 bg-gradient-to-r ${MOOD_GRADIENT[todayCheckIn.mood]}`}
              style={{ boxShadow: `0 0 12px ${MOOD_GLOW[todayCheckIn.mood]}` }}
            />
            <div className="p-5">
              <div className="flex items-center justify-between mb-4">
                <span className="section-label">Today's Check-in</span>
                <span className="status-pill status-pill-teal">✓ Complete</span>
              </div>
              <div className="flex items-center gap-4">
                <div
                  className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${MOOD_GRADIENT[todayCheckIn.mood]} flex items-center justify-center text-2xl shrink-0`}
                  style={{ boxShadow: `0 4px 16px ${MOOD_GLOW[todayCheckIn.mood]}` }}
                >
                  {MOOD_EMOJI[todayCheckIn.mood]}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-display font-semibold capitalize" style={{ color: "var(--color-text)" }}>
                    {todayCheckIn.mood}
                    <span className="font-normal text-sm" style={{ color: "var(--color-text-muted)" }}> · {todayCheckIn.intensity}/5</span>
                  </p>
                  <p className="text-xs leading-relaxed mt-0.5 line-clamp-2" style={{ color: "var(--color-text-muted)" }}>
                    {todayCheckIn.aiSuggestion}
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <button
            onClick={() => navigate("/checkin")}
            className="w-full rounded-2xl p-7 flex flex-col items-center gap-4 transition-all duration-300 group relative overflow-hidden card-interactive"
            style={{
              background: "var(--color-surface)",
              border: "1.5px dashed var(--color-border)",
              boxShadow: "var(--shadow-sm)",
            }}
          >
            {/* Hover glow */}
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-400 rounded-2xl"
              style={{ background: "radial-gradient(ellipse at center, var(--color-accent-glow) 0%, transparent 70%)" }} />

            <div className="relative animate-float">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl"
                style={{ background: "var(--color-accent-light)", border: "1px solid var(--color-border)" }}>
                💭
              </div>
              {/* Pulse ring */}
              <div className="absolute inset-0 rounded-2xl animate-glow-pulse opacity-50"
                style={{ border: "1.5px solid var(--color-accent)" }} />
            </div>

            <div className="relative text-center">
              <p className="font-display font-semibold text-base transition-colors group-hover:text-[var(--color-accent)]"
                style={{ color: "var(--color-text-muted)" }}>
                How are you feeling today?
              </p>
              <p className="text-xs mt-1" style={{ color: "var(--color-text-faint)" }}>
                Tap to begin your daily reflection →
              </p>
            </div>
          </button>
        )}
      </div>

      {/* ── Quick Actions Grid ── */}
      <div className="grid grid-cols-2 gap-3 animate-fade-in-up" style={{ animationDelay: "140ms" }}>
        <QuickAction
          emoji="💬"
          label="Improve Message"
          sub="Before you send"
          accentColor="var(--color-secondary)"
          glowColor="var(--color-secondary-glow)"
          gradientFrom="#8b5cf6"
          gradientTo="#6366f1"
          onClick={() => navigate("/improve")}
        />
        <QuickAction
          emoji="🛡️"
          label="AI Assistant"
          sub="Talk it through"
          accentColor="var(--color-tertiary)"
          glowColor="var(--color-tertiary-glow)"
          gradientFrom="#14c49e"
          gradientTo="#0ea882"
          onClick={() => navigate("/assistant")}
        />
        <QuickAction
          emoji="📊"
          label="Insights"
          sub="Your patterns"
          accentColor="var(--color-accent)"
          glowColor="var(--color-accent-glow)"
          gradientFrom="#3aa3e3"
          gradientTo="#1a85cc"
          onClick={() => navigate("/insights")}
        />
        <QuickAction
          emoji="🛡️"
          label="Safe Scenarios"
          sub="Interactive stories"
          accentColor="#8b5cf6"
          glowColor="rgba(139,92,246,0.25)"
          gradientFrom="#8b5cf6"
          gradientTo="#6d28d9"
          onClick={() => navigate("/scenarios")}
        />
      </div>

      {/* ── Streak ── */}
      {streak > 0 && (
        <div
          className="animate-fade-in-up flex items-center gap-4 rounded-2xl px-5 py-4 relative overflow-hidden"
          style={{
            animationDelay: "180ms",
            background: "var(--color-surface)",
            border: "1px solid var(--color-border)",
            boxShadow: "var(--shadow-card)",
          }}
        >
          <div className="absolute right-0 top-0 h-full w-1/3 pointer-events-none"
            style={{ background: "linear-gradient(270deg, rgba(245,158,11,0.06) 0%, transparent 100%)" }} />

          <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl shrink-0"
            style={{ background: "linear-gradient(135deg, #f59e0b, #f97316)", boxShadow: "0 4px 16px rgba(245,158,11,0.3)" }}>
            🔥
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-display font-bold" style={{ color: "var(--color-text)" }}>
              {streak}-day streak
            </p>
            <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>
              Keep checking in daily
            </p>
          </div>
          {/* Streak bars visualization */}
          <div className="flex gap-1 items-end">
            {Array.from({ length: Math.min(streak, 7) }).map((_, i) => (
              <div
                key={i}
                className="w-2 rounded-full transition-all"
                style={{
                  height: `${12 + i * 3}px`,
                  background: `hsl(${35 + i * 5}, 85%, ${55 - i * 3}%)`,
                  boxShadow: `0 0 6px hsl(${35 + i * 5}, 85%, 55%, 0.4)`,
                  animationDelay: `${i * 80}ms`,
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── Recent Activity ── */}
      {activity.length > 0 && (
        <div className="space-y-3 animate-fade-in-up" style={{ animationDelay: "220ms" }}>
          <h2 className="section-label px-0.5">Recent Activity</h2>
          <div className="space-y-2">
            {activity.map((item, idx) =>
              item.type === "checkin" ? (
                <div
                  key={`ci-${item.data.id}`}
                  className="flex items-center gap-3 rounded-xl px-4 py-3.5 hover-lift"
                  style={{
                    background: "var(--color-surface)",
                    border: "1px solid var(--color-border)",
                    animationDelay: `${idx * 40}ms`,
                  }}
                >
                  <div
                    className={`w-10 h-10 rounded-xl bg-gradient-to-br ${MOOD_GRADIENT[(item.data as typeof checkIns[0]).mood]} flex items-center justify-center text-lg shrink-0`}
                    style={{ boxShadow: `0 2px 8px ${MOOD_GLOW[(item.data as typeof checkIns[0]).mood]}` }}
                  >
                    {MOOD_EMOJI[(item.data as typeof checkIns[0]).mood]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium capitalize" style={{ color: "var(--color-text)" }}>
                      Checked in as{" "}
                      <span className="font-semibold">{(item.data as typeof checkIns[0]).mood}</span>
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: "var(--color-text-faint)" }}>
                      {formatDistanceToNow(new Date(item.date), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              ) : (
                <div
                  key={`msg-${item.data.id}`}
                  className="flex items-center gap-3 rounded-xl px-4 py-3.5 hover-lift"
                  style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0"
                    style={{
                      background: "linear-gradient(135deg, var(--color-secondary), #6366f1)",
                      boxShadow: "0 2px 8px var(--color-secondary-glow)",
                    }}
                  >
                    💬
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate font-medium" style={{ color: "var(--color-text)" }}>
                      "{(item.data as typeof messages[0]).originalText}"
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <ToneChip tone={(item.data as typeof messages[0]).detectedTone} />
                      <span className="text-xs" style={{ color: "var(--color-text-faint)" }}>
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

      {/* ── Empty State ── */}
      {activity.length === 0 && (
        <div className="text-center py-16 space-y-5 animate-fade-in">
          <div className="relative inline-block">
            <span className="text-5xl block animate-float">🌱</span>
            <div className="absolute inset-0 rounded-full blur-xl opacity-30"
              style={{ background: "var(--color-tertiary)", transform: "scale(1.5)" }} />
          </div>
          <div>
            <p className="font-display font-semibold text-base" style={{ color: "var(--color-text-muted)" }}>
              Your journey starts here
            </p>
            <p className="text-xs mt-1" style={{ color: "var(--color-text-faint)" }}>
              Begin with a daily check-in to unlock insights.
            </p>
          </div>
          <button
            onClick={() => navigate("/checkin")}
            className="btn-primary inline-flex items-center gap-2 px-6 py-3 text-sm ripple-wrapper"
          >
            Begin Check-in →
          </button>
        </div>
      )}
    </div>
  );
}

function QuickAction({
  emoji, label, sub, accentColor, glowColor, gradientFrom, gradientTo, onClick,
}: {
  emoji: string;
  label: string;
  sub: string;
  accentColor: string;
  glowColor: string;
  gradientFrom: string;
  gradientTo: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="group relative rounded-2xl p-4 text-left overflow-hidden card-interactive"
      style={{
        background: "var(--color-surface)",
        border: "1px solid var(--color-border)",
        boxShadow: "var(--shadow-sm)",
      }}
    >
      {/* Ambient hover glow */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl"
        style={{ background: `radial-gradient(ellipse at 20% 80%, ${glowColor} 0%, transparent 60%)` }}
      />

      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center text-lg mb-3 shrink-0 transition-transform duration-300 group-hover:scale-110"
        style={{
          background: `linear-gradient(135deg, ${gradientFrom}, ${gradientTo})`,
          boxShadow: `0 4px 12px ${glowColor}`,
        }}
      >
        {emoji}
      </div>
      <p className="font-display font-bold text-sm leading-tight relative z-10" style={{ color: "var(--color-text)" }}>
        {label}
      </p>
      <p className="text-xs mt-0.5 relative z-10" style={{ color: "var(--color-text-muted)" }}>
        {sub}
      </p>

      {/* Corner accent dot */}
      <div
        className="absolute top-3 right-3 w-1.5 h-1.5 rounded-full opacity-40 group-hover:opacity-100 transition-opacity"
        style={{ background: accentColor }}
      />
    </button>
  );
}