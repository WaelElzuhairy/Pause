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

export default function ImprovePage() {
  const { messages, loading } = useMessages(10);

  const [step, setStep] = useState<Step>("input");
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [copied, setCopied] = useState(false);

  const handleAnalyze = async () => {
    if (!text.trim()) return;
    setStep("loading");
    setError("");
    try {
      const res = await callAnalyzeMessage({ text: text.trim() });
      setResult(res.data as AnalysisResult);
      setStep("result");
    } catch {
      setError(
        "Couldn't reach the AI right now — functions may not be deployed yet."
      );
      setStep("input");
    }
  };

  const handleCopy = async (content: string) => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleReset = () => {
    setStep("input");
    setText("");
    setResult(null);
    setError("");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-[var(--color-text)]">
          Improve Message
        </h1>
        <p className="text-sm text-[var(--color-text-muted)] mt-1">
          See how your message may land — and find a better way to say it.
        </p>
      </div>

      {/* Input */}
      {step === "input" && (
        <div className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] p-6 space-y-4">
          <div>
            <label className="text-sm font-medium text-[var(--color-text)] block mb-2">
              Paste the message you want to send
            </label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Type or paste a message here..."
              rows={5}
              maxLength={2000}
              className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-raised)] px-4 py-3 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-faint)] resize-none focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent"
            />
            <p className="text-right text-xs text-[var(--color-text-faint)] mt-1">
              {text.length}/2000
            </p>
          </div>

          {error && (
            <p className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <button
            onClick={handleAnalyze}
            disabled={!text.trim()}
            className="w-full py-3 rounded-xl bg-[var(--color-accent)] hover:bg-[var(--color-accent-dark)] disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors"
          >
            Analyze message
          </button>

          <p className="text-center text-xs text-[var(--color-text-faint)]">
            Your message is private and only used to generate a reflection.
          </p>
        </div>
      )}

      {/* Loading */}
      {step === "loading" && (
        <div className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] p-10 flex flex-col items-center gap-4">
          <div className="w-8 h-8 rounded-full border-2 border-[var(--color-accent)] border-t-transparent animate-spin" />
          <p className="text-sm text-[var(--color-text-muted)]">
            Seeing it from the other side…
          </p>
        </div>
      )}

      {/* Result */}
      {step === "result" && result && (
        <div className="space-y-4">
          {/* Mood context note */}
          {result.moodContextNote && (
            <div className="flex gap-2 bg-[var(--color-amber-50)] border border-[var(--color-amber-100)] rounded-xl px-4 py-3">
              <span className="text-amber-500 mt-0.5 shrink-0">💡</span>
              <p className="text-xs text-amber-700 leading-relaxed">
                {result.moodContextNote}
              </p>
            </div>
          )}

          {/* Original + tone */}
          <div className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] p-6 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm font-medium text-[var(--color-text)]">
                Your message
              </p>
              <ToneChip tone={result.tone} />
            </div>

            <p className="text-sm text-[var(--color-text-muted)] bg-[var(--color-surface-raised)] rounded-xl px-4 py-3 leading-relaxed italic">
              "{text}"
            </p>

            <div className="space-y-3">
              <div>
                <p className="text-xs font-medium text-[var(--color-text-faint)] uppercase tracking-wide mb-1">
                  How it may come across
                </p>
                <p className="text-sm text-[var(--color-text)] leading-relaxed">
                  {result.perceivedAs}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-[var(--color-text-faint)] uppercase tracking-wide mb-1">
                  Likely emotional impact
                </p>
                <p className="text-sm text-[var(--color-text)] leading-relaxed">
                  {result.emotionalImpact}
                </p>
              </div>
            </div>
          </div>

          {/* Rewrite */}
          <div className="bg-[var(--color-surface)] rounded-2xl border-2 border-[var(--color-sage-200)] p-6 space-y-4">
            <div>
              <p className="text-xs font-medium text-[var(--color-accent)] uppercase tracking-wide mb-2">
                A suggested alternative
              </p>
              <p className="text-sm text-[var(--color-text)] leading-relaxed">
                {result.rewrittenText}
              </p>
            </div>

            {/* Three equal options — no hierarchy */}
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => handleCopy(result.rewrittenText)}
                className="flex flex-col items-center gap-1 py-3 px-2 rounded-xl bg-[var(--color-accent)] hover:bg-[var(--color-accent-dark)] text-white transition-colors"
              >
                <span className="text-base">{copied ? "✓" : "📋"}</span>
                <span className="text-xs font-medium">
                  {copied ? "Copied!" : "Use rewrite"}
                </span>
              </button>

              <button
                onClick={() => {
                  setText(result.rewrittenText);
                  setStep("input");
                  setResult(null);
                }}
                className="flex flex-col items-center gap-1 py-3 px-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-raised)] text-[var(--color-text-muted)] transition-colors"
              >
                <span className="text-base">✏️</span>
                <span className="text-xs font-medium">Edit yourself</span>
              </button>

              <button
                onClick={() => handleCopy(text)}
                className="flex flex-col items-center gap-1 py-3 px-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-raised)] text-[var(--color-text-muted)] transition-colors"
              >
                <span className="text-base">➡️</span>
                <span className="text-xs font-medium">Send anyway</span>
              </button>
            </div>
          </div>

          <button
            onClick={handleReset}
            className="w-full py-3 rounded-xl border border-[var(--color-border)] text-sm text-[var(--color-text-muted)] hover:bg-[var(--color-surface-raised)] transition-colors"
          >
            Analyze another message
          </button>
        </div>
      )}

      {/* History */}
      {!loading && messages.length > 0 && step === "input" && (
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-[var(--color-text-muted)] uppercase tracking-wide">
            Recent messages
          </h2>
          <div className="space-y-2">
            {messages.map((m) => (
              <MessageHistoryItem key={m.id} message={m} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function MessageHistoryItem({ message }: { message: Message }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <button
      onClick={() => setExpanded((v) => !v)}
      className={clsx(
        "w-full text-left bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] px-4 py-3 transition-colors",
        expanded ? "border-[var(--color-sage-200)]" : "hover:bg-[var(--color-surface-raised)]"
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-[var(--color-text)] truncate flex-1">
          "{message.originalText}"
        </p>
        <div className="flex items-center gap-2 shrink-0">
          <ToneChip tone={message.detectedTone} />
          <span className="text-xs text-[var(--color-text-faint)]">
            {formatDistanceToNow(new Date(message.createdAt), { addSuffix: true })}
          </span>
        </div>
      </div>

      {expanded && (
        <div className="mt-3 space-y-2 border-t border-[var(--color-border)] pt-3">
          <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">
            {message.perceivedAs}
          </p>
          <p className="text-xs text-[var(--color-accent-dark)] bg-[var(--color-accent-light)] rounded-lg px-3 py-2 leading-relaxed">
            {message.rewrittenText}
          </p>
        </div>
      )}
    </button>
  );
}
