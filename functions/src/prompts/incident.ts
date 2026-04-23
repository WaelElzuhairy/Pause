import type { IncidentEntry } from "../schemas";

export const INCIDENT_SYSTEM = `You are an AI Incident Analyst for a cyberbullying support platform in Egypt.
Your role is to help victims document, understand, and act on cyberbullying incidents.
Be empathetic, precise, and privacy-aware.

PII Rules (CRITICAL — read carefully):
UI-displayed fields MUST use [PERSON] for attacker (safe to show on screen):
  → sanitized_text, timeline, recommended_actions

Evidence/legal fields MUST use real names (stored privately or downloaded):
  → summary, formal_report

General rules:
- Never replace the victim in any field — they are always implicit ("I", "me", "the victim").
- Replace platform names with [PLATFORM] in sanitized_text, timeline, and recommended_actions.
- In summary and formal_report, use real platform names.

Timeline Rules (CRITICAL):
- Every timeline entry MUST start with an absolute date in YYYY-MM-DD format.
- NEVER use relative words: "yesterday", "today", "recently", "last week", "earlier".
- Use [PERSON] for attacker. Example: "2026-04-21: [PERSON] began sending threatening messages."`;

export function buildIncidentPrompt(entries: IncidentEntry[], gender: string): string {
  const entriesText = entries
    .map((e) => `[${e.timestamp}] (${e.source}): ${e.text}`)
    .join("\n");

  return `Analyze the following multi-entry cyberbullying case (victim gender: ${gender}).

Tasks:
1. Write a 2-3 sentence paragraph summarizing the case — use REAL names from the entries (stored as private evidence). Do NOT repeat the messages verbatim; write a coherent paragraph describing what happened.
2. Generate a chronological timeline — each item MUST start with YYYY-MM-DD date and use [PERSON] for attacker.
3. Detect escalation pattern: "stable", "repeated", or "escalating".
4. Identify the PRIMARY category (single most relevant: harassment, threat, blackmail, defamation, impersonation, other).
5. List any SECONDARY categories (array, can be empty).
6. Assign severity: "low", "medium", "high", or "critical".
7. Describe risk level in a short phrase (e.g. "Legal Risk + Emotional Distress").
8. Recommend 2-4 next actions with priority: "low", "medium", "high", or "critical" — use [PERSON] and [PLATFORM] in action text.
9. Recommend ONE authority type from the list below based on the case context:
   - police: threats, blackmail, extortion, serious harassment, privacy violation, images at risk → severity high/critical
   - legal: defamation, formal complaint needed, legal documentation, case needs prosecution → severity high/critical
   - telecom: harassment via phone/SMS, telecom abuse → severity medium/high
   - women_support: female victim facing harassment or gender-based abuse → severity medium/high/critical
   - child_protection: victim is a minor, child safety concern → severity medium/high/critical
   - mental_health: emotional distress, anxiety, psychological harm, mild cases → severity low/medium
   - none: mild non-harmful interaction → severity low
   Pick the MOST appropriate single type. If female victim with serious threat, prefer women_support or police over mental_health.
10. Return sanitized_text: ALL entry text combined, with attacker name/handle replaced by [PERSON] and platform names replaced by [PLATFORM].
11. Write a formal_report: a legal-style document for authorities — use REAL names throughout.
12. Set confidence (0.0 to 1.0) for your analysis.

Incident Entries:
${entriesText}

Respond ONLY with a valid JSON object — no markdown, no extra text:
{
  "summary": "...2-3 sentence paragraph with REAL names — NOT verbatim messages...",
  "primary_category": "harassment | threat | blackmail | defamation | impersonation | other",
  "secondary_categories": ["..."],
  "severity": "low | medium | high | critical",
  "risk_level": "...",
  "timeline": [
    "YYYY-MM-DD: [PERSON] event description"
  ],
  "pattern": "stable | repeated | escalating",
  "recommended_actions": [
    { "action": "...use [PERSON] and [PLATFORM]...", "priority": "low | medium | high | critical" }
  ],
  "sanitized_text": "...all entry text with [PERSON] and [PLATFORM]...",
  "recommended_authority": {
    "type": "police | legal | telecom | women_support | child_protection | mental_health | none",
    "reason": "One sentence explaining why this authority is appropriate.",
    "action": "One sentence describing what the victim should do."
  },
  "formal_report": "...full legal report with REAL names, dates, and incident details...",
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
