import { useState } from "react";

const SCENARIOS = [
  {
    title: "The Observer",
    description:
      "You see a classmate leaving mean comments on a friend's photo. What do you do?",
    options: [
      {
        text: "Ignore it — it's not my problem.",
        correct: false,
        feedback:
          "Ignoring it may make the victim feel alone. Bystanders have more power than they think.",
      },
      {
        text: "Publicly insult the classmate to defend your friend.",
        correct: false,
        feedback:
          "Fighting fire with fire usually escalates the situation and can backfire.",
      },
      {
        text: "Privately message your friend to check in, and report the comment.",
        correct: true,
        feedback:
          "You supported the victim and took safe action without putting yourself at risk.",
      },
    ],
  },
  {
    title: "The Sender",
    description:
      "You're really angry at someone for canceling plans and want to text: \"You're so selfish, I hate you.\"",
    options: [
      {
        text: "Send it — they deserve to know how you feel.",
        correct: false,
        feedback:
          "Sending messages in anger leads to regret. Take a pause before you type.",
      },
      {
        text: "Rewrite it: \"I'm really hurt you canceled. Can we talk later?\"",
        correct: true,
        feedback:
          "You expressed how you feel honestly without being aggressive. That's emotional intelligence.",
      },
      {
        text: "Post a passive-aggressive story about fake friends.",
        correct: false,
        feedback:
          "Passive aggression rarely solves anything and often creates more drama.",
      },
    ],
  },
  {
    title: "The Target",
    description:
      "Someone is spreading rumors about you in a group chat you're not in. A friend screenshots it and shows you.",
    options: [
      {
        text: "Join the chat and confront everyone publicly.",
        correct: false,
        feedback:
          "Public confrontations online tend to escalate. You could end up looking worse.",
      },
      {
        text: "Save the screenshots, report it to the platform, and talk to a trusted adult.",
        correct: true,
        feedback:
          "Documenting evidence and involving a trusted adult is the right move — it protects you legally and emotionally.",
      },
      {
        text: "Spread rumors about them in return.",
        correct: false,
        feedback:
          "Retaliating puts you in the wrong and can turn you into the aggressor.",
      },
    ],
  },
];

export default function ScenariosPage() {
  const [step, setStep] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);

  const scenario = SCENARIOS[step];

  function handleSelect(idx: number) {
    if (selected !== null) return;
    setSelected(idx);
    if (SCENARIOS[step].options[idx].correct) setScore((s) => s + 1);
  }

  function handleNext() {
    if (step < SCENARIOS.length - 1) {
      setStep((s) => s + 1);
      setSelected(null);
    } else {
      setDone(true);
    }
  }

  function handleReset() {
    setStep(0);
    setSelected(null);
    setScore(0);
    setDone(false);
  }

  if (done) {
    return (
      <div className="flex flex-col items-center justify-center gap-6 py-16 text-center">
        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center text-3xl">
          {score === SCENARIOS.length ? "🏆" : "👍"}
        </div>
        <div>
          <h2 className="text-xl font-bold text-[var(--color-text)] mb-1">
            Training Complete!
          </h2>
          <p className="text-[var(--color-text-muted)]">
            You scored{" "}
            <span className="font-semibold text-[var(--color-accent)]">
              {score} / {SCENARIOS.length}
            </span>
          </p>
          <p className="text-sm text-[var(--color-text-faint)] mt-1">
            {score === SCENARIOS.length
              ? "Perfect — you're a digital empathy pro."
              : "Good effort. Each scenario helps you respond better online."}
          </p>
        </div>
        <button
          onClick={handleReset}
          className="px-6 py-2 rounded-xl bg-[var(--color-accent)] text-white text-sm font-medium"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-[var(--color-text)]">
          Scenario Training
        </h1>
        <p className="text-sm text-[var(--color-text-muted)] mt-1">
          Practice handling difficult online situations safely.
        </p>
      </div>

      {/* Progress */}
      <div className="flex items-center gap-2">
        {SCENARIOS.map((_, i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-colors ${
              i < step
                ? "bg-[var(--color-accent)]"
                : i === step
                ? "bg-[var(--color-accent)] opacity-50"
                : "bg-[var(--color-border)]"
            }`}
          />
        ))}
        <span className="text-xs text-[var(--color-text-faint)] ml-1 shrink-0">
          {step + 1}/{SCENARIOS.length}
        </span>
      </div>

      {/* Scenario card */}
      <div className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] p-5">
        <p className="text-xs font-semibold text-[var(--color-accent)] uppercase tracking-wide mb-2">
          {scenario.title}
        </p>
        <p className="text-[var(--color-text)] font-medium leading-relaxed">
          {scenario.description}
        </p>
      </div>

      {/* Options */}
      <div className="flex flex-col gap-3">
        {scenario.options.map((opt, idx) => {
          const isSelected = selected === idx;
          const showResult = selected !== null;
          let borderColor = "border-[var(--color-border)]";
          let bg = "bg-[var(--color-surface)]";
          if (showResult && isSelected) {
            borderColor = opt.correct ? "border-green-400" : "border-red-400";
            bg = opt.correct ? "bg-green-50" : "bg-red-50";
          }

          return (
            <button
              key={idx}
              onClick={() => handleSelect(idx)}
              disabled={selected !== null}
              className={`text-left w-full rounded-xl border-2 ${borderColor} ${bg} p-4 transition-all`}
            >
              <p className="text-sm text-[var(--color-text)] font-medium">
                {opt.text}
              </p>
              {showResult && isSelected && (
                <p
                  className={`text-xs mt-2 font-medium ${
                    opt.correct ? "text-green-700" : "text-red-700"
                  }`}
                >
                  {opt.correct ? "✓ " : "✗ "}
                  {opt.feedback}
                </p>
              )}
            </button>
          );
        })}
      </div>

      {selected !== null && (
        <button
          onClick={handleNext}
          className="w-full py-3 rounded-xl bg-[var(--color-accent)] text-white font-medium text-sm"
        >
          {step < SCENARIOS.length - 1 ? "Next Scenario →" : "See Results"}
        </button>
      )}
    </div>
  );
}
