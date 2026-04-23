import type { IncidentEntry } from "../schemas";

export const INCIDENT_SYSTEM = `You are an AI Incident Analyst for a cyberbullying support platform in Egypt.
Your role is to help victims document, understand, and act on cyberbullying incidents.
Be empathetic, precise, and privacy-aware.

PII Rules (CRITICAL):
- In sanitized_text: replace ONLY the attacker's name/identity with [PERSON].
- Do NOT replace the victim — they are implicit ("I", "me", "the victim").
- Replace platform names with [PLATFORM] only when they identify a person.
- Never produce multiple [PERSON] tokens in a single sentence for the same subject.

Timeline Rules (CRITICAL):
- Every timeline entry MUST start with an absolute date in YYYY-MM-DD format.
- NEVER use relative words: "yesterday", "today", "recently", "last week", "earlier".
- Use formal language. Example: "2026-04-21: [PERSON] began sending threatening messages."`;

export function buildIncidentPrompt(entries: IncidentEntry[], gender: string): string {
  const entriesText = entries
    .map((e) => `[${e.timestamp}] (${e.source}): ${e.text}`)
    .join("\n");

  return `Analyze the following multi-entry cyberbullying case (victim gender: ${gender}).

Tasks:
1. Summarize the case in 2-3 sentences.
2. Generate a chronological timeline — each item MUST start with YYYY-MM-DD date.
3. Detect escalation pattern: "stable", "repeated", or "escalating".
4. Identify the PRIMARY category (single most relevant: harassment, threat, blackmail, defamation, impersonation, other).
5. List any SECONDARY categories (array, can be empty).
6. Assign severity: "low", "medium", "high", or "critical".
7. Describe risk level in a short phrase (e.g. "Legal Risk + Emotional Distress").
8. Recommend 2-4 next actions with priority: "low", "medium", "high", or "critical".
9. Recommend authority type with a reason and suggested action for the victim.
10. Return sanitized_text: entries with attacker PII replaced by [PERSON]. Keep victim implicit.
11. Write a formal_report: legal-style summary usable by authorities.
12. Set confidence (0.0 to 1.0) for your analysis.

Incident Entries:
${entriesText}

Respond ONLY with a valid JSON object — no markdown, no extra text:
{
  "summary": "...",
  "primary_category": "harassment | threat | blackmail | defamation | impersonation | other",
  "secondary_categories": ["..."],
  "severity": "low | medium | high | critical",
  "risk_level": "...",
  "timeline": [
    "YYYY-MM-DD: event description using [PERSON] for attacker"
  ],
  "pattern": "stable | repeated | escalating",
  "recommended_actions": [
    { "action": "...", "priority": "low | medium | high | critical" }
  ],
  "sanitized_text": "...",
  "recommended_authority": {
    "type": "police | legal | telecom | none",
    "reason": "One sentence explaining why this authority is appropriate.",
    "action": "One sentence describing what the victim should do."
  },
  "formal_report": "...",
  "confidence": 0.95
}`;
}

// Post-process timeline to strip any relative time words the AI may have missed
const RELATIVE_WORDS = [
  /\btoday\b/gi,
  /\byesterday\b/gi,
  /\blast\s+\w+\b/gi,
  /\brecently\b/gi,
  /\bearlier\b/gi,
  /\bthis\s+week\b/gi,
  /\bthis\s+month\b/gi,
];

export function normalizeTimeline(timeline: string[]): string[] {
  return timeline.map((item) => {
    let cleaned = item;
    for (const re of RELATIVE_WORDS) {
      cleaned = cleaned.replace(re, "");
    }
    // Collapse double spaces
    return cleaned.replace(/\s{2,}/g, " ").trim();
  });
}
