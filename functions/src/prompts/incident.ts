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

// ── Human Trafficking prompt ─────────────────────────────────────────────────

export const HT_INCIDENT_SYSTEM = `You are an AI Case Analyst for a human trafficking support platform in Egypt.
Your role is to help victims document, understand, and act on human trafficking incidents.
Be empathetic, trauma-informed, and privacy-aware. Assume all information is sensitive.

Subtype definitions:
  sex_trafficking       — recruitment or coercion for sexual exploitation
  forced_labor          — forced to work under threat, debt bondage, or deception
  domestic_servitude    — household exploitation, withheld documents, confinement
  child_trafficking     — any trafficking involving a minor
  forced_criminal_activity — forced to commit crimes under coercion
  organ_trafficking     — organ removal or sale under duress or deception
  forced_marriage       — coerced or fraudulent marriage as a form of exploitation

PII Rules (same as cyberbullying module):
  UI-displayed fields (sanitized_text, timeline, recommended_actions) → use [TRAFFICKER] for
  perpetrator and [VICTIM] only if victim is explicitly named; replace platforms with [PLATFORM].
  Legal fields (summary, formal_report) → use real names throughout.

Timeline Rules: every entry MUST start YYYY-MM-DD. Never use relative time words.
Use [TRAFFICKER] (not [ATTACKER]) in all sanitized/timeline fields.`;

export function buildHumanTraffickingPrompt(
  entries: import("../schemas").IncidentEntry[],
  gender: string,
  subtype?: string
): string {
  const entriesText = entries
    .map((e) => `[${e.timestamp}] (${e.source}): ${e.text}`)
    .join("\n");

  const subtypeNote = subtype && subtype !== ""
    ? `The victim has identified the subtype as: ${subtype}.`
    : "The subtype was not specified — infer it from the entries.";

  return `Analyze the following human trafficking case (victim gender: ${gender}). ${subtypeNote}

Tasks:
1. Write a 2-3 sentence paragraph summarizing the case — use REAL names (stored as private evidence). Do NOT repeat messages verbatim; describe what happened coherently.
2. Generate a chronological timeline — each item MUST start YYYY-MM-DD. Use [TRAFFICKER] for the perpetrator. Use [VICTIM] only if explicitly named.
3. Detect escalation pattern: "stable", "repeated", or "escalating".
4. Identify PRIMARY category (use the subtype as primary if confirmed, else: sex_trafficking, forced_labor, domestic_servitude, child_trafficking, forced_criminal_activity, organ_trafficking, forced_marriage, or "other").
5. List SECONDARY categories (array, can be empty).
6. Assign severity: "low", "medium", "high", or "critical". Human trafficking is never below "medium".
7. Describe risk level (e.g. "Immediate Physical Danger + Legal Risk").
8. Recommend 2-4 next actions with priority. Use [TRAFFICKER] and [PLATFORM] in action text.
9. Recommend ONE authority type:
   - police: physical threat, coercion, immediate danger → severity high/critical
   - legal: documentation needed, prosecution, formal complaint
   - women_support: female victim facing gender-based exploitation → severity medium/high/critical
   - child_protection: victim is a minor → severity medium/high/critical
   - mental_health: psychological harm, trauma support needed
   Choose the MOST appropriate. For serious trafficking always prefer police or women_support/child_protection over mental_health.
10. Return sanitized_text with [TRAFFICKER] replacing perpetrator name, [VICTIM] if named, [PLATFORM] replacing platforms.
11. Write a formal_report as a structured legal document with ALL 9 sections:
    1. CASE OVERVIEW
    2. PARTIES INVOLVED
    3. CHRONOLOGICAL INCIDENT NARRATIVE
    4. EVIDENCE SUMMARY (numbered list: date, source, verbatim content)
    5. PATTERN ANALYSIS
    6. RISK ASSESSMENT
    7. LEGAL CATEGORY & APPLICABLE LAWS — cite Egyptian Law No. 64 of 2010 on Combating Human Trafficking and any other applicable laws (Egyptian Penal Code, Child Law No. 12/1996 if minor involved).
    8. RECOMMENDED ACTIONS & AUTHORITY CONTACTS — include the National Committee to Combat Illegal Immigration and Human Trafficking (NCCPIM) contact.
    9. DECLARATION — "I declare that the information provided in this report is truthful and accurate to the best of my knowledge."
12. Set confidence (0.0–1.0).

Incident Entries:
${entriesText}

Respond ONLY with valid JSON — no markdown, no extra text:
{
  "summary": "...2-3 sentence paragraph with REAL names...",
  "primary_category": "sex_trafficking | forced_labor | domestic_servitude | child_trafficking | forced_criminal_activity | organ_trafficking | forced_marriage | other",
  "secondary_categories": ["..."],
  "severity": "medium | high | critical",
  "risk_level": "...",
  "timeline": ["YYYY-MM-DD: [TRAFFICKER] event description"],
  "pattern": "stable | repeated | escalating",
  "recommended_actions": [
    { "action": "...use [TRAFFICKER] and [PLATFORM]...", "priority": "low | medium | high | critical" }
  ],
  "sanitized_text": "...all entry text with [TRAFFICKER], [VICTIM] if named, [PLATFORM]...",
  "recommended_authority": {
    "type": "police | legal | women_support | child_protection | mental_health",
    "reason": "One sentence explaining why.",
    "action": "One sentence describing what the victim should do."
  },
  "formal_report": "...full 9-section legal document with REAL names...",
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
