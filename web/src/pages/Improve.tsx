import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { callAnalyzeMessage } from "../lib/firebase";
import { useMessages } from "../hooks/useMessages";
import ToneChip from "../components/ToneChip";
import type { Tone, Message } from "../lib/firebase";
import clsx from "clsx";

type Step = "input" | "loading" | "result";

interface AnalysisResult {
  tone: Tone;
  perceivedAs: string;
  emotionalImpact: string;
  rewrittenText: string;
  moodContextNote?: string;
}

const TONE_META: Record<Tone, {
  icon: string; label: string;
  gradient: string; glow: string;
  textColor: string; bgColor: string;
}> = {
  kind: { icon: "💚", label: "Kind", gradient: "from-teal-400 to-emerald-400", glow: "rgba(20,196,158,0.25)", textColor: "#0d9488", bgColor: "rgba(20,196,158,0.08)" },
  neutral: { icon: "⚬", label: "Neutral", gradient: "from-slate-400 to-slate-500", glow: "rgba(100,116,139,0.2)", textColor: "#64748b", bgColor: "rgba(100,116,139,0.08)" },
  rude: { icon: "⚡", label: "Rude", gradient: "from-amber-400 to-yellow-400", glow: "rgba(245,158,11,0.25)", textColor: "#b45309", bgColor: "rgba(245,158,11,0.08)" },
  "passive-aggressive": { icon: "🌀", label: "Passive-Aggressive", gradient: "from-orange-400 to-amber-500", glow: "rgba(249,115,22,0.25)", textColor: "#c2410c", bgColor: "rgba(249,115,22,0.08)" },
  aggressive: { icon: "🔥", label: "Aggressive", gradient: "from-rose-500 to-red-500", glow: "rgba(239,68,68,0.25)", textColor: "#dc2626", bgColor: "rgba(239,68,68,0.08)" },
};

function AIScanning() {
  return (
    <div
      className="animate-fade-in-scale rounded-2xl p-12 flex flex-col items-center gap-6 scan-container"
      style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
    >
      <div className="scan-line" />

      {/* Double-ring neural loader */}
      <div className="relative w-16 h-16">
        <div className="neural-orb w-16 h-16 animate-orb-pulse" />
        <div className="absolute inset-[-6px] rounded-full border-2 border-dashed opacity-30 animate-spin"
          style={{ borderColor: "var(--color-secondary)", animationDuration: "4s" }} />
        <div className="absolute inset-[-14px] rounded-full border opacity-15"
          style={{ borderColor: "var(--color-accent)", animation: "spin 7s linear infinite reverse" }} />
      </div>

      <div className="text-center max-w-xs">
        <p className="font-display font-semibold" style={{ color: "var(--color-text)" }}>
          Seeing it from the other side…
        </p>
        <p className="text-xs mt-1.5" style={{ color: "var(--color-text-muted)" }}>
          Analyzing tone, emotional impact & intent
        </p>
        <div className="flex items-center justify-center gap-1 mt-3">
          {["Parsing", "Analyzing", "Composing"].map((label, i) => (
            <span
              key={label}
              className="text-xs px-2 py-0.5 rounded-full animate-fade-in"
              style={{
                background: "var(--color-surface-raised)",
                color: "var(--color-text-faint)",
                border: "1px solid var(--color-border)",
                animationDelay: `${i * 400}ms`,
              }}
            >
              {label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function ImprovePage() {
  const { messages, loading } = useMessages(10);

  const [step, setStep] = useState<Step>("input");
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [copied, setCopied] = useState<"rewrite" | "original" | null>(null);

  const handleAnalyze = async () => {
    if (!text.trim()) return;
    setStep("loading");
    setError("");
    try {
      const res = await callAnalyzeMessage({ text: text.trim() });
      setResult(res.data as AnalysisResult);
      setStep("result");
    } catch {
      setError("Couldn't reach the AI right now — functions may not be deployed yet.");
      setStep("input");
    }
  };

  const handleCopy = async (content: string, type: "rewrite" | "original") => {
    await navigator.clipboard.writeText(content);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleReset = () => {
    setStep("input"); setText(""); setResult(null); setError("");
  };

  return (
    <div className="space-y-6 pb-6">
      {/* ── Header ── */}
      <div className="animate-fade-in-up">
        <h1 className="font-display text-[28px] font-bold tracking-tight" style={{ color: "var(--color-text)" }}>
          Perspective Switch
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--color-text-muted)" }}>
          See how your message lands before you send it.
        </p>
      </div>

      {/* ── Input ── */}
      {step === "input" && (
        <div
          className="animate-fade-in-up rounded-2xl p-6 space-y-5 relative overflow-hidden"
          style={{
            background: "var(--color-surface)",
            border: "1px solid var(--color-border)",
            boxShadow: "var(--shadow-card)",
          }}
        >
          {/* Ambient accent */}
          <div className="absolute top-0 right-0 w-32 h-32 rounded-full pointer-events-none"
            style={{ background: "radial-gradient(circle, var(--color-secondary-glow) 0%, transparent 70%)", transform: "translate(40%, -40%)", opacity: 0.5 }} />

          <div className="relative z-10">
            <label className="font-display font-semibold text-sm block mb-3" style={{ color: "var(--color-text)" }}>
              Paste the message you want to send
            </label>
            <div className="relative">
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Type or paste a message here..."
                rows={5}
                maxLength={2000}
                className="input-field w-full px-4 py-3 text-sm resize-none"
              />
              <span className="absolute bottom-2.5 right-3 text-xs" style={{ color: "var(--color-text-faint)" }}>
                {text.length}/2000
              </span>
            </div>
          </div>

          {/* Tone preview hint */}
          {text.length > 20 && (
            <div
              className="flex items-center gap-2 rounded-lg px-3 py-2 animate-fade-in"
              style={{ background: "var(--color-surface-raised)", border: "1px solid var(--color-border)" }}
            >
              <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "var(--color-accent)" }} />
              <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                AI will analyze tone, emotional impact, and suggest a kinder alternative
              </p>
            </div>
          )}

          {error && (
            <div
              className="flex gap-2.5 rounded-xl px-4 py-3 text-xs"
              style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)", color: "#92400e" }}
            >
              <span>⚠️</span><span>{error}</span>
            </div>
          )}

          <button
            onClick={handleAnalyze}
            disabled={!text.trim()}
            className="btn-primary w-full py-3.5 text-sm font-semibold ripple-wrapper disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none"
          >
            Analyze message →
          </button>

          <p className="text-center text-xs" style={{ color: "var(--color-text-faint)" }}>
            🔒 Private — only used to generate a reflection
          </p>
        </div>
      )}

      {/* ── Loading ── */}
      {step === "loading" && <AIScanning />}

      {/* ── Result ── */}
      {step === "result" && result && (
        <div className="space-y-4 animate-fade-in-scale">
          {/* Mood context note */}
          {result.moodContextNote && (
            <div
              className="flex gap-2.5 rounded-xl px-4 py-3"
              style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.15)" }}
            >
              <span>💡</span>
              <p className="text-xs leading-relaxed" style={{ color: "#92400e" }}>{result.moodContextNote}</p>
            </div>
          )}

          {/* Tone detection card */}
          {result.tone && TONE_META[result.tone] && (() => {
            const tone = TONE_META[result.tone];
            return (
              <div
                className="rounded-2xl overflow-hidden"
                style={{
                  background: "var(--color-surface)",
                  border: "1px solid var(--color-border)",
                  boxShadow: "var(--shadow-card)",
                }}
              >
                {/* Tone header */}
                <div
                  className="px-5 py-4 flex items-center gap-3"
                  style={{ background: tone.bgColor, borderBottom: "1px solid var(--color-border)" }}
                >
                  <div
                    className={`w-10 h-10 rounded-xl bg-gradient-to-br ${tone.gradient} flex items-center justify-center text-xl`}
                    style={{ boxShadow: `0 4px 12px ${tone.glow}` }}
                  >
                    {tone.icon}
                  </div>
                  <div>
                    <p className="section-label" style={{ color: tone.textColor }}>Detected Tone</p>
                    <p className="font-display font-bold text-base" style={{ color: "var(--color-text)" }}>
                      {tone.label}
                    </p>
                  </div>
                  <div className="ml-auto">
                    <ToneChip tone={result.tone} />
                  </div>
                </div>

                <div className="p-5 space-y-4">
                  {/* Original message */}
                  <div
                    className="rounded-xl px-4 py-3"
                    style={{ background: "var(--color-surface-raised)", border: "1px solid var(--color-border)" }}
                  >
                    <p className="section-label mb-1.5">Your message</p>
                    <p className="text-sm italic leading-relaxed" style={{ color: "var(--color-text-muted)" }}>
                      "{text}"
                    </p>
                  </div>

                  {/* Analysis rows */}
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <p className="section-label mb-1">How it may come across</p>
                      <p className="text-sm leading-relaxed" style={{ color: "var(--color-text)" }}>
                        {result.perceivedAs}
                      </p>
                    </div>
                    <div className="h-px" style={{ background: "var(--color-border)" }} />
                    <div>
                      <p className="section-label mb-1">Likely emotional impact</p>
                      <p className="text-sm leading-relaxed" style={{ color: "var(--color-text)" }}>
                        {result.emotionalImpact}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Rewrite card */}
          <div
            className="rounded-2xl p-5 space-y-4 relative overflow-hidden"
            style={{
              background: "var(--color-surface)",
              border: "1.5px solid var(--color-accent)",
              boxShadow: "var(--shadow-glow-blue)",
            }}
          >
            {/* Glow accent */}
            <div className="absolute top-0 left-0 w-full h-1 opacity-70"
              style={{ background: "linear-gradient(90deg, var(--color-accent), var(--color-secondary))" }} />

            <div>
              <p className="section-label mb-2" style={{ color: "var(--color-accent)" }}>
                ✨ Suggested Alternative
              </p>
              <div
                className="rounded-xl px-4 py-4"
                style={{ background: "var(--color-accent-light)", border: "1px solid var(--color-border)" }}
              >
                <p className="text-sm leading-relaxed font-medium" style={{ color: "var(--color-accent-dark)" }}>
                  {result.rewrittenText}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <ActionButton
                icon={copied === "rewrite" ? "✓" : "📋"}
                label={copied === "rewrite" ? "Copied!" : "Use rewrite"}
                variant="primary"
                onClick={() => handleCopy(result.rewrittenText, "rewrite")}
              />
              <ActionButton
                icon="✏️"
                label="Edit first"
                variant="secondary"
                onClick={() => { setText(result.rewrittenText); setStep("input"); setResult(null); }}
              />
              <ActionButton
                icon={copied === "original" ? "✓" : "➡️"}
                label="Send as-is"
                variant="secondary"
                onClick={() => handleCopy(text, "original")}
              />
            </div>
          </div>

          <button
            onClick={handleReset}
            className="w-full py-3 rounded-xl text-sm font-medium transition-all"
            style={{
              border: "1px solid var(--color-border)",
              color: "var(--color-text-muted)",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--color-surface-raised)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            Analyze another message
          </button>
        </div>
      )}

      {/* ── History ── */}
      {!loading && messages.length > 0 && step === "input" && (
        <div className="space-y-3 animate-fade-in-up">
          <h2 className="section-label px-0.5">Recent Messages</h2>
          <div className="space-y-2">
            {messages.map((m, i) => (
              <MessageHistoryItem key={m.id} message={m} index={i} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ActionButton({
  icon, label, variant, onClick,
}: {
  icon: string; label: string;
  variant: "primary" | "secondary";
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl transition-all duration-150 hover:scale-[1.02] active:scale-[0.97] ${variant === "primary" ? "btn-primary" : ""
        }`}
      style={
        variant === "secondary"
          ? {
            background: "var(--color-surface-raised)",
            border: "1px solid var(--color-border)",
            color: "var(--color-text-muted)",
          }
          : {}
      }
    >
      <span className="text-lg leading-none">{icon}</span>
      <span className="text-[11px] font-semibold leading-tight text-center">{label}</span>
    </button>
  );
}

function MessageHistoryItem({ message, index }: { message: Message; index: number }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <button
      onClick={() => setExpanded((v) => !v)}
      className={clsx("w-full text-left rounded-xl px-4 py-3.5 transition-all duration-200 animate-fade-in-up")}
      style={{
        background: "var(--color-surface)",
        border: `1px solid ${expanded ? "var(--color-accent)" : "var(--color-border)"}`,
        animationDelay: `${index * 40}ms`,
      }}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm truncate flex-1 font-medium" style={{ color: "var(--color-text)" }}>
          "{message.originalText}"
        </p>
        <div className="flex items-center gap-2 shrink-0">
          <ToneChip tone={message.detectedTone} />
          <span className="text-xs" style={{ color: "var(--color-text-faint)" }}>
            {formatDistanceToNow(new Date(message.createdAt), { addSuffix: true })}
          </span>
        </div>
      </div>

      {expanded && (
        <div className="mt-3.5 space-y-2.5 pt-3.5 animate-fade-in"
          style={{ borderTop: "1px solid var(--color-border)" }}>
          <p className="text-xs leading-relaxed" style={{ color: "var(--color-text-muted)" }}>
            {message.perceivedAs}
          </p>
          <div
            className="text-xs rounded-lg px-3 py-2.5 leading-relaxed font-medium"
            style={{ background: "var(--color-accent-light)", color: "var(--color-accent-dark)" }}
          >
            {message.rewrittenText}
          </div>
        </div>
      )}
    </button>
  );
}