import { useState, useRef, useEffect } from "react";
import { callChatAssistant } from "../lib/firebase";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

/* Animated neural orb avatar for assistant */
function NeuralAvatar({ size = 28 }: { size?: number }) {
  return (
    <div
      className="shrink-0 neural-orb animate-orb-pulse"
      style={{ width: size, height: size, minWidth: size }}
    />
  );
}

export default function AIAssistantPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content: "Hi, I'm MindShield — a safe, private space to talk. How are you feeling right now?",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function handleSend() {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: ChatMessage = { role: "user", content: text };
    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    setInput("");
    setLoading(true);

    if (textareaRef.current) textareaRef.current.style.height = "44px";

    try {
      const res = await callChatAssistant({ message: text, history: messages });
      setMessages([...newHistory, { role: "assistant", content: res.data.reply }]);
    } catch {
      setMessages([
        ...newHistory,
        {
          role: "assistant",
          content: "I'm having a little trouble connecting right now. Please try again in a moment.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  const canSend = input.trim().length > 0 && !loading;

  return (
    <div className="flex flex-col h-[calc(100vh-10rem)]">
      {/* ── Header ── */}
      <div
        className="mb-4 pb-4"
        style={{ borderBottom: "1px solid var(--color-border)" }}
      >
        <div className="flex items-center gap-3">
          {/* Animated neural orb */}
          <div className="relative">
            <NeuralAvatar size={40} />
            {/* Live pulse ring */}
            <span
              className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2"
              style={{
                background: "var(--color-tertiary)",
                borderColor: "var(--color-background)",
                boxShadow: "0 0 6px var(--color-tertiary-glow)",
              }}
            />
          </div>
          <div>
            <h1 className="font-display font-bold text-base" style={{ color: "var(--color-text)" }}>
              MindShield
            </h1>
            <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
              Private · End-to-end encrypted
            </p>
          </div>

          {/* Right: encryption badge */}
          <div className="ml-auto">
            <span
              className="status-pill"
              style={{
                background: "var(--color-tertiary-light)",
                color: "var(--color-tertiary)",
                border: "1px solid var(--color-border)",
              }}
            >
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "var(--color-tertiary)" }} />
              Live
            </span>
          </div>
        </div>
      </div>

      {/* ── Messages ── */}
      <div className="flex-1 overflow-y-auto flex flex-col gap-4 py-2 pr-1">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex items-end gap-2.5 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            style={{ animation: "fadeInUp 0.35s cubic-bezier(0.16,1,0.3,1) both" }}
          >
            {msg.role === "assistant" && <NeuralAvatar size={28} />}

            <div
              className={`max-w-[80%] px-4 py-3 text-sm leading-relaxed ${msg.role === "user" ? "bubble-user" : "bubble-ai"
                }`}
            >
              {msg.content}
            </div>

            {msg.role === "user" && (
              <div
                className="w-7 h-7 rounded-xl flex items-center justify-center text-xs font-bold shrink-0"
                style={{
                  background: "linear-gradient(135deg, var(--color-surface-raised), var(--color-border))",
                  color: "var(--color-text-muted)",
                  border: "1px solid var(--color-border)",
                }}
              >
                U
              </div>
            )}
          </div>
        ))}

        {/* Typing indicator */}
        {loading && (
          <div
            className="flex items-end gap-2.5 justify-start"
            style={{ animation: "fadeInUp 0.3s cubic-bezier(0.16,1,0.3,1) both" }}
          >
            <NeuralAvatar size={28} />
            <div className="bubble-ai px-4 py-4">
              <div className="flex gap-1.5 items-center">
                {[0, 150, 300].map((delay) => (
                  <span
                    key={delay}
                    className="w-2 h-2 rounded-full animate-bounce"
                    style={{
                      background: "var(--color-accent)",
                      animationDelay: `${delay}ms`,
                      opacity: 0.7,
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* ── Input ── */}
      <div
        className="mt-3 rounded-2xl p-2 flex gap-2 items-end"
        style={{
          background: "var(--color-surface)",
          border: "1.5px solid var(--color-border)",
          boxShadow: "var(--shadow-card)",
          transition: "border-color 0.2s ease, box-shadow 0.2s ease",
        }}
        onFocusCapture={(e) => {
          (e.currentTarget as HTMLDivElement).style.borderColor = "var(--color-accent)";
          (e.currentTarget as HTMLDivElement).style.boxShadow = "0 0 0 3px var(--color-accent-glow)";
        }}
        onBlurCapture={(e) => {
          (e.currentTarget as HTMLDivElement).style.borderColor = "var(--color-border)";
          (e.currentTarget as HTMLDivElement).style.boxShadow = "var(--shadow-card)";
        }}
      >
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message…"
          rows={1}
          className="flex-1 resize-none bg-transparent px-3 py-2.5 text-sm focus:outline-none"
          style={{
            minHeight: "44px",
            maxHeight: "120px",
            color: "var(--color-text)",
            caretColor: "var(--color-accent)",
          }}
          onInput={(e) => {
            const t = e.target as HTMLTextAreaElement;
            t.style.height = "auto";
            t.style.height = t.scrollHeight + "px";
          }}
        />

        {input.length > 200 && (
          <span className="text-xs self-end pb-3 pr-1 shrink-0" style={{ color: "var(--color-text-faint)" }}>
            {input.length}
          </span>
        )}

        <button
          onClick={handleSend}
          disabled={!canSend}
          className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0 transition-all duration-200 ripple-wrapper"
          style={{
            background: canSend
              ? "linear-gradient(135deg, var(--color-accent), var(--color-accent-dark))"
              : "var(--color-surface-raised)",
            boxShadow: canSend ? "0 2px 10px var(--color-accent-glow)" : "none",
            opacity: canSend ? 1 : 0.45,
            transform: canSend ? "scale(1)" : "scale(0.93)",
          }}
        >
          <svg
            width="16" height="16"
            viewBox="0 0 24 24" fill="none"
            stroke={canSend ? "white" : "var(--color-text-faint)"}
            strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
          >
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </button>
      </div>

      <p className="text-center text-[10px] mt-2" style={{ color: "var(--color-text-faint)" }}>
        Enter to send · Shift+Enter for new line
      </p>
    </div>
  );
}