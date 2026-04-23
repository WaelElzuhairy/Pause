import type { IncidentEntry } from "../schemas";

export const INCIDENT_SYSTEM = `You are an AI Incident Analyst for a cyberbullying support platform in Egypt.
Your role is to help victims document, understand, and act on cyberbullying incidents.
Be empathetic, precise, and privacy-aware.

PII Rules (CRITICAL):
- ONLY the "sanitized_text" field uses [PERSON] to mask the attacker's identity.
- ALL other fields — summary, timeline, formal_report, risk_level, recommended_actions — MUST use the attacker's actual name or handle as stated in the entries. Do NOT use [PERSON] in those fields.
- Do NOT replace the victim in any field — they are always implicit ("I", "me", "the victim").
- Replace platform names with [PLATFORM] only inside sanitized_text, and only when they identify a person.

Timeline Rules (CRITICAL):
- Every timeline entry MUST start with an absolute date in YYYY-MM-DD format.
- NEVER use relative words: "yesterday", "today", "recently", "last week", "earlier".
- Use formal language with real names. Example: "2026-04-21: Ahmed began sending threatening messages."`;

export function buildIncidentPrompt(entries: IncidentEntry[], gender: string): string {
  const entriesText = entries
    .map((e) => `[${e.timestamp}] (${e.source}): ${e.text}`)
    .join("\n");

  return `Analyze the following multi-entry cyberbullying case (victim gender: ${gender}).

Tasks:
1. Summarize the case in 2-3 sentences — use real names from the entries.
2. Generate a chronological timeline — each item MUST start with YYYY-MM-DD date and use real names.
3. Detect escalation pattern: "stable", "repeated", or "escalating".
4. Identify the PRIMARY category (single most relevant: harassment, threat, blackmail, defamation, impersonation, other).
5. List any SECONDARY categories (array, can be empty).
6. Assign severity: "low", "medium", "high", or "critical".
7. Describe risk level in a short phrase (e.g. "Legal Risk + Emotional Distress") — use real names if applicable.
8. Recommend 2-4 next actions with priority: "low", "medium", "high", or "critical".
9. Recommend authority type with a reason and suggested action for the victim.
10. Return sanitized_text: ALL entry text combined, with ONLY the attacker's name/handle replaced by [PERSON]. Keep victim implicit. This is the ONLY field that uses [PERSON].
11. Write a formal_report: a legal-style document suitable for authorities — use real names throughout.
12. Set confidence (0.0 to 1.0) for your analysis.

Incident Entries:
${entriesText}

Respond ONLY with a valid JSON object — no markdown, no extra text:
{
  "summary": "...real names here...",
  "primary_category": "harassment | threat | blackmail | defamation | impersonation | other",
  "secondary_categories": ["..."],
  "severity": "low | medium | high | critical",
  "risk_level": "...real names if applicable...",
  "timeline": [
    "YYYY-MM-DD: event description with real attacker name"
  ],
  "pattern": "stable | repeated | escalating",
  "recommended_actions": [
    { "action": "...", "priority": "low | medium | high | critical" }
  ],
  "sanitized_text": "...entries with [PERSON] replacing attacker only — NO real names here...",
  "recommended_authority": {
    "type": "police | legal | telecom | none",
    "reason": "One sentence explaining why this authority is appropriate.",
    "action": "One sentence describing what the victim should do."
  },
  "formal_report": "...full legal report with real names, dates, and incident details...",
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
