import type { IncidentEntry } from "../schemas";

export const INCIDENT_SYSTEM = `You are an AI Incident Analyst for a cyberbullying support platform in Egypt.
Your role is to help victims document, understand, and act on cyberbullying incidents.
Be empathetic, precise, and privacy-aware.

PII Rules (CRITICAL — read carefully):
UI-displayed fields MUST use role labels instead of real names (safe to show on screen):
  → sanitized_text, timeline, recommended_actions
  Use [ATTACKER] for the perpetrator and [VICTIM] only when the victim is explicitly named in the entries.
  If the victim is referred to implicitly ("I", "me"), do NOT add [VICTIM] — leave it implicit.
  Replace platform names with [PLATFORM] in these fields.

Evidence/legal fields MUST use real names (stored privately or downloaded):
  → summary, formal_report
  Use real platform names in these fields.

Timeline Rules (CRITICAL):
- Every timeline entry MUST start with an absolute date in YYYY-MM-DD format.
- NEVER use relative words: "yesterday", "today", "recently", "last week", "earlier".
- Use [ATTACKER] for the perpetrator. Example: "2026-04-21: [ATTACKER] began sending threatening messages."`;

export function buildIncidentPrompt(entries: IncidentEntry[], gender: string): string {
  const entriesText = entries
    .map((e) => `[${e.timestamp}] (${e.source}): ${e.text}`)
    .join("\n");

  return `Analyze the following multi-entry cyberbullying case (victim gender: ${gender}).

Tasks:
1. Write a 2-3 sentence paragraph summarizing the case — use REAL names from the entries (stored as private evidence). Do NOT repeat the messages verbatim; write a coherent paragraph describing what happened.
2. Generate a chronological timeline — each item MUST start with YYYY-MM-DD date. Use [ATTACKER] for the perpetrator. Use [VICTIM] only if the victim is explicitly named in the entries; otherwise keep them implicit.
3. Detect escalation pattern: "stable", "repeated", or "escalating".
4. Identify the PRIMARY category (single most relevant: harassment, threat, blackmail, defamation, impersonation, other).
5. List any SECONDARY categories (array, can be empty).
6. Assign severity: "low", "medium", "high", or "critical".
7. Describe risk level in a short phrase (e.g. "Legal Risk + Emotional Distress").
8. Recommend 2-4 next actions with priority: "low", "medium", "high", or "critical" — use [ATTACKER] and [PLATFORM] in action text.
9. Recommend ONE authority type from the list below based on the case context:
   - police: threats, blackmail, extortion, serious harassment, privacy violation, images at risk → severity high/critical
   - legal: defamation, formal complaint needed, legal documentation, case needs prosecution → severity high/critical
   - telecom: harassment via phone/SMS, telecom abuse → severity medium/high
   - women_support: female victim facing harassment or gender-based abuse → severity medium/high/critical
   - child_protection: victim is a minor, child safety concern → severity medium/high/critical
   - mental_health: emotional distress, anxiety, psychological harm, mild cases → severity low/medium
   - none: mild non-harmful interaction → severity low
   Pick the MOST appropriate single type. If female victim with serious threat, prefer women_support or police over mental_health.
10. Return sanitized_text: ALL entry text combined, with attacker name/handle replaced by [ATTACKER], victim name (if explicitly stated) replaced by [VICTIM], and platform names replaced by [PLATFORM].
11. Write a formal_report as a structured legal document using REAL names throughout. Include ALL of the following numbered sections with their exact headings:

    1. CASE OVERVIEW — one paragraph: what happened, who was involved, date range, platform(s) used.
    2. PARTIES INVOLVED — list the victim (describe only, no name unless given) and the attacker (real name/handle).
    3. CHRONOLOGICAL INCIDENT NARRATIVE — detailed paragraph-form account of events in order, using exact dates and real names.
    4. EVIDENCE SUMMARY — numbered list of each entry submitted: date, source, and full content verbatim.
    5. PATTERN ANALYSIS — describe the escalation pattern, frequency, and progression of the behavior.
    6. RISK ASSESSMENT — describe current and potential risks to the victim (legal, emotional, physical, reputational).
    7. LEGAL CATEGORY & APPLICABLE LAWS — name the category of offense and cite Egyptian Cybercrime Law No. 175 of 2018 and any other applicable laws.
    8. RECOMMENDED ACTIONS & AUTHORITY CONTACTS — list the recommended steps and the appropriate authority to contact.
    9. DECLARATION — standard statement: "I declare that the information provided in this report is truthful and accurate to the best of my knowledge."

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
    "YYYY-MM-DD: [ATTACKER] event description"
  ],
  "pattern": "stable | repeated | escalating",
  "recommended_actions": [
    { "action": "...use [ATTACKER] and [PLATFORM]...", "priority": "low | medium | high | critical" }
  ],
  "sanitized_text": "...all entry text with [ATTACKER], [VICTIM] (if named), and [PLATFORM]...",
  "recommended_authority": {
    "type": "police | legal | telecom | women_support | child_protection | mental_health | none",
    "reason": "One sentence explaining why this authority is appropriate.",
    "action": "One sentence describing what the victim should do."
  },
  "formal_report": "...full structured legal document with all 9 sections, REAL names, exact dates...",
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
