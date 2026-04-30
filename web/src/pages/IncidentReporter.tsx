import { useState, useEffect } from "react";
import { callAnalyzeIncident } from "../lib/firebase";
import type { IncidentEntry, IncidentReport } from "../lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "../hooks/useAuth";
import { EGYPT_AUTHORITIES } from "../lib/authorities";
import type { AuthorityType } from "../lib/authorities";

type FullReport = IncidentReport & { case_id: string; authority_name: string };

type PastCase = {
  id: string;
  case_id: string;
  summary: string;
  primary_category: string;
  severity: string;
  pattern: string;
  createdAt: Date | null;
};

// Fix 4: Priority sort order
const PRIORITY_ORDER: Record<string, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

const SEVERITY_COLOR: Record<string, string> = {
  low: "text-green-600 bg-green-50 border-green-200",
  medium: "text-yellow-700 bg-yellow-50 border-yellow-200",
  high: "text-orange-600 bg-orange-50 border-orange-200",
  critical: "text-red-600 bg-red-50 border-red-200",
};

const PRIORITY_BAR: Record<string, string> = {
  low: "border-l-green-400",
  medium: "border-l-yellow-400",
  high: "border-l-orange-500",
  critical: "border-l-red-500",
};

function timelineIcon(text: string) {
  const t = text.toLowerCase();
  if (t.includes("threat") || t.includes("critical") || t.includes("danger")) return "🔴";
  if (t.includes("escalat") || t.includes("repeat") || t.includes("harass")) return "⚠️";
  return "🟢";
}

export default function IncidentReporterPage() {
  const { user } = useAuth();

  const [entries, setEntries] = useState<IncidentEntry[]>([]);
  const [text, setText] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [source, setSource] = useState("manual");
  const [gender, setGender] = useState("unspecified");
  const [showForm, setShowForm] = useState(true);

  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState("");
  const [report, setReport] = useState<FullReport | null>(null);
  const [error, setError] = useState("");

  const [pastCases, setPastCases] = useState<PastCase[]>([]);
  const [loadingCases, setLoadingCases] = useState(false);
  const [casesError, setCasesError] = useState("");
  const [expandedCaseId, setExpandedCaseId] = useState<string | null>(null);

  useEffect(() => {
    if (user) fetchPastCases();
  }, [user]);

  async function fetchPastCases() {
    if (!user) return;
    setLoadingCases(true);
    try {
      // No orderBy — avoids composite index requirement. Sort client-side instead.
      const q = query(
        collection(db, "user_cases"),
        where("user_id", "==", user.uid)
      );
      const snap = await getDocs(q);
      const cases = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          case_id: data.case_id ?? "—",
          summary: data.summary ?? "No summary",
          primary_category: data.primary_category ?? data.category ?? "Unknown",
          severity: data.severity ?? "low",
          pattern: data.pattern ?? "stable",
          createdAt: data.createdAt?.toDate() ?? null,
        };
      });
      // Sort descending by date client-side
      cases.sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0));
      setPastCases(cases);
    } catch (e: unknown) {
      console.error("fetchPastCases error:", e);
      const msg = e instanceof Error ? e.message : String(e);
      setCasesError(msg);
    } finally {
      setLoadingCases(false);
    }
  }

  function addEntry() {
    if (text.trim().length < 10) return;
    setEntries((prev) => [
      ...prev,
      { entry_id: Math.random().toString(36).slice(2, 11), text: text.trim(), timestamp: date, source },
    ]);
    setText("");
    setShowForm(false);
  }

  function removeEntry(id: string) {
    const next = entries.filter((e) => e.entry_id !== id);
    setEntries(next);
    if (next.length === 0) setShowForm(true);
  }

  async function handleAnalyze() {
    if (entries.length === 0) return;
    setLoading(true);
    setReport(null);
    setError("");
    setStep("AI building timeline and analyzing case…");
    try {
      const res = await callAnalyzeIncident({ entries, gender });
      setReport(res.data);
      fetchPastCases();
    } catch (e) {
      setError("Analysis failed. Please try again.");
      console.error(e);
    } finally {
      setLoading(false);
      setStep("");
    }
  }

  function downloadReport() {
    if (!report?.formal_report) return;

    const now = new Date();
    const dateStr = now.toLocaleDateString("en-GB", {
      day: "2-digit", month: "long", year: "numeric",
    });
    const timeStr = now.toLocaleTimeString("en-GB", {
      hour: "2-digit", minute: "2-digit",
    });

    const divider = "═".repeat(70);
    const thinDivider = "─".repeat(70);

    const header = [
      divider,
      "                    OFFICIAL INCIDENT REPORT",
      "                     Generated by Pause Platform",
      divider,
      `  Case ID       : ${report.case_id}`,
      `  Generated on  : ${dateStr} at ${timeStr}`,
      `  Severity      : ${report.severity.toUpperCase()}`,
      `  Pattern       : ${report.pattern.charAt(0).toUpperCase() + report.pattern.slice(1)}`,
      `  AI Confidence : ${Math.round(report.confidence * 100)}%`,
      thinDivider,
      "  CONFIDENTIALITY NOTICE",
      "  This document contains sensitive personal information. It is intended",
      "  solely for the use of the named victim and relevant legal authorities.",
      "  Unauthorised disclosure is strictly prohibited.",
      divider,
      "",
    ].join("\n");

    const footer = [
      "",
      divider,
      "  DOCUMENT INFORMATION",
      thinDivider,
      "  Platform       : Pause — AI Incident Documentation Tool",
      `  Evidence Vault : Case ${report.case_id} is securely stored in the platform database.`,
      "  Data Policy    : Raw evidence is encrypted and accessible only to the",
      "                   account holder. This report was generated automatically",
      "                   by AI analysis and should be reviewed before submission.",
      thinDivider,
      "  Egyptian Cybercrime Law No. 175 of 2018 may apply to the offenses",
      "  described in this report. Consult a legal professional for advice.",
      divider,
    ].join("\n");

    const fullDocument = header + report.formal_report + footer;

    const blob = new Blob([fullDocument], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Pause_Incident_Report_${report.case_id}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Fix 4: sort actions by priority
  const sortedActions = report
    ? [...report.recommended_actions].sort(
        (a, b) => (PRIORITY_ORDER[a.priority] ?? 9) - (PRIORITY_ORDER[b.priority] ?? 9)
      )
    : [];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-[var(--color-text)]">Incident Reporter</h1>
        <p className="text-sm text-[var(--color-text-muted)] mt-1">
          Build a structured case. MindShield vaults your evidence and uses AI to detect
          patterns and guide next steps.
        </p>
      </div>

      {/* Privacy disclaimer */}
      <div className="flex items-start gap-3 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
        <span className="text-green-600 text-base mt-0.5">🔒</span>
        <p className="text-xs text-green-800 leading-relaxed">
          <span className="font-semibold">Your privacy is protected.</span> Everything you submit
          is encrypted and stored privately under your account only. Your data will never be
          shared, sold, or used to train AI models. Only you can access your case data.
        </p>
      </div>

      <div className="flex flex-col gap-4 lg:flex-row lg:gap-6 lg:items-start">
        {/* ── Left: Evidence Builder ── */}
        <div className="flex flex-col gap-4 lg:w-5/12">
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-5">
            <h2 className="font-semibold text-[var(--color-text)] mb-4">Evidence Builder</h2>

            {/* Gender */}
            <div className="mb-4">
              <p className="text-xs text-[var(--color-text-muted)] mb-2">Victim context (optional)</p>
              <div className="flex gap-3 flex-wrap">
                {["male", "female", "unspecified"].map((g) => (
                  <label key={g} className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="gender"
                      value={g}
                      checked={gender === g}
                      onChange={() => setGender(g)}
                      className="accent-[var(--color-accent)]"
                    />
                    <span className="text-xs capitalize text-[var(--color-text-muted)]">
                      {g === "unspecified" ? "Prefer not to say" : g}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Entries list */}
            {entries.length > 0 && (
              <div className="flex flex-col gap-2 mb-4 max-h-64 overflow-y-auto">
                {entries.map((e, i) => (
                  <div
                    key={e.entry_id}
                    className="border border-[var(--color-border)] rounded-xl p-3 bg-[var(--color-background)]"
                  >
                    <div className="flex justify-between items-start">
                      <span className="text-[10px] font-semibold text-[var(--color-accent)] uppercase">
                        Entry #{i + 1} · {e.timestamp} · {e.source}
                      </span>
                      <button
                        onClick={() => removeEntry(e.entry_id)}
                        className="text-red-400 hover:text-red-600 ml-2 text-xs"
                      >
                        ✕
                      </button>
                    </div>
                    <p className="text-xs text-[var(--color-text)] mt-1 leading-relaxed">{e.text}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Add entry form */}
            {showForm ? (
              <div className="border border-[var(--color-border)] rounded-xl p-4 flex flex-col gap-3">
                <p className="text-xs font-semibold text-[var(--color-text)]">Add Case Entry</p>
                <div className="flex gap-2">
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="flex-1 text-xs rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-[var(--color-text)]"
                  />
                  <select
                    value={source}
                    onChange={(e) => setSource(e.target.value)}
                    className="flex-1 text-xs rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-[var(--color-text)]"
                  >
                    <option value="manual">Manual</option>
                    <option value="message">Text message</option>
                    <option value="email">Email</option>
                  </select>
                </div>
                <textarea
                  rows={3}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Describe the event or paste the message…"
                  className="w-full text-xs rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-[var(--color-text)] placeholder:text-[var(--color-text-faint)] resize-none focus:outline-none focus:border-[var(--color-accent)]"
                />
                {text.length > 0 && text.trim().length < 10 && (
                  <p className="text-[10px] text-red-500">Entry must be at least 10 characters.</p>
                )}
                <div className="flex gap-2">
                  <button
                    onClick={addEntry}
                    disabled={text.trim().length < 10}
                    className="flex-1 py-2 rounded-lg bg-[var(--color-accent)] text-white text-xs font-medium disabled:opacity-40"
                  >
                    Save Entry
                  </button>
                  {entries.length > 0 && (
                    <button
                      onClick={() => setShowForm(false)}
                      className="px-3 py-2 rounded-lg border border-[var(--color-border)] text-xs text-[var(--color-text-muted)]"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowForm(true)}
                className="w-full py-2 rounded-xl border border-dashed border-[var(--color-border)] text-xs text-[var(--color-text-muted)] hover:border-[var(--color-accent)] transition-colors"
              >
                + Add Another Entry
              </button>
            )}

            <button
              onClick={handleAnalyze}
              disabled={entries.length === 0 || loading}
              className="mt-4 w-full py-3 rounded-xl bg-red-500 text-white font-semibold text-sm disabled:opacity-40"
            >
              {loading ? step || "Analyzing…" : "Analyze Case Securely"}
            </button>
            <p className="text-[10px] text-[var(--color-text-faint)] text-center mt-2">
              🔒 Raw evidence is vaulted. Only sanitized data is analyzed.
            </p>
          </div>
        </div>

        {/* ── Right: Analysis output ── */}
        <div className="flex-1 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-5 min-h-48">
          <h2 className="font-semibold text-[var(--color-text)] mb-4">
            Case Analysis & Recommendations
          </h2>

          {loading && (
            <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
              <div className="w-8 h-8 border-2 border-[var(--color-accent)] border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-[var(--color-accent)] font-medium">{step}</p>
            </div>
          )}

          {error && <p className="text-sm text-red-500 text-center py-8">{error}</p>}

          {!loading && !report && !error && (
            <p className="text-sm text-[var(--color-text-faint)] text-center py-12">
              Build and submit a case to view analysis.
            </p>
          )}

          {report && !loading && (
            <div className="flex flex-col gap-5">
              {/* Vaulted */}
              <div className="flex items-start gap-2 bg-green-50 border border-green-200 rounded-xl p-3">
                <span className="text-green-600 text-sm">🔒</span>
                <div>
                  <p className="text-xs font-semibold text-green-700">Evidence Vaulted</p>
                  <p className="text-[10px] text-green-600">Case ID: {report.case_id}</p>
                </div>
              </div>

              {/* Escalation alert */}
              {report.pattern === "escalating" &&
                (report.severity === "high" || report.severity === "critical") && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-3">
                    <p className="text-xs font-semibold text-red-700">⚠️ ESCALATION ALERT</p>
                    <p className="text-[10px] text-red-600 mt-0.5">
                      This situation is escalating quickly. Prioritize the actions below.
                    </p>
                  </div>
                )}

              {/* Overview */}
              <div>
                <p className="text-xs font-semibold text-[var(--color-accent)] uppercase tracking-wide mb-2">
                  Sanitized Case Summary
                </p>
                {/* sanitized_text has [PERSON] replacing attacker — safe to display on screen */}
                <p className="text-sm text-[var(--color-text)] leading-relaxed mb-3 whitespace-pre-line">
                  {report.sanitized_text}
                </p>

                {/* Fix 6: Confidence score */}
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs text-[var(--color-text-faint)]">AI Confidence:</span>
                  <div className="flex-1 h-1.5 bg-[var(--color-border)] rounded-full max-w-[120px]">
                    <div
                      className="h-full rounded-full bg-[var(--color-accent)]"
                      style={{ width: `${Math.round(report.confidence * 100)}%` }}
                    />
                  </div>
                  <span className="text-xs font-semibold text-[var(--color-text)]">
                    {Math.round(report.confidence * 100)}%
                  </span>
                </div>

                {/* Fix 3: Structured categories */}
                <div className="flex gap-3 flex-wrap mb-3">
                  <div>
                    <p className="text-[10px] text-[var(--color-text-faint)] mb-1">Primary</p>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-md border text-[var(--color-accent)] bg-[var(--color-accent)]/10 border-[var(--color-accent)]/20 capitalize">
                      {report.primary_category}
                    </span>
                  </div>
                  {report.secondary_categories.length > 0 && (
                    <div>
                      <p className="text-[10px] text-[var(--color-text-faint)] mb-1">Secondary</p>
                      <div className="flex gap-1 flex-wrap">
                        {report.secondary_categories.map((c) => (
                          <span
                            key={c}
                            className="text-xs px-2 py-0.5 rounded-md border border-[var(--color-border)] text-[var(--color-text-muted)] capitalize"
                          >
                            {c}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  <div>
                    <p className="text-[10px] text-[var(--color-text-faint)] mb-1">Severity</p>
                    <span
                      className={`text-xs font-bold px-2 py-0.5 rounded-md border ${SEVERITY_COLOR[report.severity]}`}
                    >
                      {report.severity.toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="text-[10px] text-[var(--color-text-faint)] mb-1">Pattern</p>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-md border border-[var(--color-border)] text-[var(--color-text-muted)] capitalize">
                      {report.pattern}
                    </span>
                  </div>
                </div>
              </div>

              {/* Fix 2: Timeline (normalized by backend) */}
              <div>
                <p className="text-xs font-semibold text-[var(--color-text)] mb-2">
                  📅 Chronological Timeline
                </p>
                <div className="flex flex-col gap-1.5">
                  {report.timeline.map((item, i) => (
                    <div
                      key={i}
                      className="text-xs text-[var(--color-text)] pl-3 border-l-2 border-[var(--color-accent)] py-1 font-mono"
                    >
                      {timelineIcon(item)} {item}
                    </div>
                  ))}
                </div>
              </div>

              {/* Fix 4: Decision Engine — sorted by priority */}
              <div>
                <p className="text-xs font-semibold text-[var(--color-text)] mb-2">
                  🧠 What Should You Do Next?
                </p>
                <div className="flex flex-col gap-2">
                  {sortedActions.map((act, i) => (
                    <div
                      key={i}
                      className={`flex justify-between items-center border-l-4 ${
                        PRIORITY_BAR[act.priority] ?? "border-l-gray-300"
                      } bg-[var(--color-background)] rounded-r-xl px-3 py-2`}
                    >
                      <p className="text-xs font-medium text-[var(--color-text)]">{act.action}</p>
                      <span
                        className={`shrink-0 ml-2 text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                          SEVERITY_COLOR[act.priority] ?? "text-gray-600 bg-gray-50 border-gray-200"
                        }`}
                      >
                        {act.priority.toUpperCase()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Authority Section — driven by EGYPT_AUTHORITIES data */}
              {(() => {
                const authType = report.recommended_authority.type as AuthorityType;
                const auth = EGYPT_AUTHORITIES[authType];
                const isNone = authType === "none";
                return (
                  <div className={`rounded-xl p-4 flex flex-col gap-3 border ${isNone ? "bg-gray-50 border-gray-200" : "bg-blue-50 border-blue-200"}`}>
                    <div className="flex items-start gap-2">
                      <span className="text-base">{isNone ? "ℹ️" : "⚖️"}</span>
                      <div>
                        <p className={`text-xs font-semibold uppercase tracking-wide ${isNone ? "text-gray-600" : "text-blue-800"}`}>
                          Recommended Authority
                        </p>
                        <p className={`text-sm font-bold mt-0.5 ${isNone ? "text-gray-800" : "text-blue-900"}`}>
                          {auth.name}
                        </p>
                        <p className={`text-xs mt-0.5 ${isNone ? "text-gray-600" : "text-blue-700"}`}>
                          {auth.description}
                        </p>
                      </div>
                    </div>

                    {!isNone && (
                      <>
                        <div>
                          <p className="text-[10px] font-semibold text-blue-700 uppercase tracking-wide mb-1">
                            Why this authority?
                          </p>
                          <p className="text-xs text-blue-800">{report.recommended_authority.reason}</p>
                        </div>

                        <div>
                          <p className="text-[10px] font-semibold text-blue-700 uppercase tracking-wide mb-1">
                            What you should do
                          </p>
                          <p className="text-xs text-blue-800">{report.recommended_authority.action}</p>
                        </div>

                        {auth.recommendedFor.length > 0 && (
                          <div>
                            <p className="text-[10px] font-semibold text-blue-700 uppercase tracking-wide mb-1">
                              Recommended for
                            </p>
                            <ul className="flex flex-col gap-0.5">
                              {auth.recommendedFor.map((r) => (
                                <li key={r} className="text-xs text-blue-800 flex items-center gap-1">
                                  <span className="text-blue-400">•</span> {r}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {auth.contact.notes && (
                          <p className="text-[10px] text-blue-600 italic">{auth.contact.notes}</p>
                        )}

                        <div className="flex gap-2 flex-wrap mt-1">
                          {auth.contact.phone && (
                            <a
                              href={`tel:${auth.contact.phone}`}
                              className="text-xs px-3 py-1.5 rounded-lg bg-blue-600 text-white font-medium"
                            >
                              📞 Call {auth.contact.phone}
                            </a>
                          )}
                          {auth.contact.website && (
                            <a
                              href={auth.contact.website}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs px-3 py-1.5 rounded-lg border border-blue-300 text-blue-700 font-medium"
                            >
                              🌐 Website
                            </a>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                );
              })()}

              {/* Download */}
              {report.formal_report && (
                <button
                  onClick={downloadReport}
                  className="w-full py-3 rounded-xl bg-[var(--color-accent)] text-white text-sm font-medium"
                >
                  ⬇ Download Legal Case Report
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Past Cases */}
      {user && (
        <div className="mt-4">
          <h2 className="text-lg font-bold text-[var(--color-text)] mb-3">Your Previous Cases</h2>
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl overflow-hidden">
            {loadingCases ? (
              <p className="text-sm text-[var(--color-text-faint)] text-center py-8">Loading cases…</p>
            ) : casesError ? (
              <p className="text-xs text-red-500 text-center py-8 px-4">
                ⚠️ Could not load cases: {casesError}
              </p>
            ) : pastCases.length === 0 ? (
              <p className="text-sm text-[var(--color-text-faint)] text-center py-8">
                No past cases yet. Submit your first case above.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-[var(--color-border)] bg-[var(--color-background)]">
                      {["Case ID", "Date", "Summary", "Category", "Severity", "Pattern"].map((h) => (
                        <th
                          key={h}
                          className="text-left px-4 py-3 text-[var(--color-text-faint)] font-medium"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {pastCases.map((c) => {
                      const isExpanded = expandedCaseId === c.id;
                      return (
                        <>
                          <tr
                            key={c.id}
                            onClick={() => setExpandedCaseId(isExpanded ? null : c.id)}
                            className="border-b border-[var(--color-border)] hover:bg-[var(--color-background)] transition-colors cursor-pointer select-none"
                          >
                            <td className="px-4 py-3 font-bold text-[var(--color-accent)]">
                              <span className="mr-1 text-[var(--color-text-faint)]">{isExpanded ? "▾" : "▸"}</span>
                              {c.case_id}
                            </td>
                            <td className="px-4 py-3 text-[var(--color-text-muted)]">
                              {c.createdAt ? c.createdAt.toLocaleDateString() : "—"}
                            </td>
                            <td className="px-4 py-3 text-[var(--color-text)] max-w-[180px] truncate">
                              {c.summary}
                            </td>
                            <td className="px-4 py-3 capitalize">
                              <span className="px-2 py-0.5 rounded-md border border-[var(--color-border)] text-[var(--color-text-muted)]">
                                {c.primary_category}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className={`px-2 py-0.5 rounded-md border font-bold ${
                                  SEVERITY_COLOR[c.severity] ?? "text-gray-600 bg-gray-50 border-gray-200"
                                }`}
                              >
                                {c.severity.toUpperCase()}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-[var(--color-text-muted)] capitalize">
                              {c.pattern}
                            </td>
                          </tr>
                          {isExpanded && (
                            <tr key={`${c.id}-expanded`} className="bg-[var(--color-background)]">
                              <td colSpan={6} className="px-6 py-4 border-b border-[var(--color-border)]">
                                <p className="text-[10px] font-semibold text-[var(--color-accent)] uppercase tracking-wide mb-1">
                                  Full Case Summary
                                </p>
                                <p className="text-sm text-[var(--color-text)] leading-relaxed whitespace-pre-wrap">
                                  {c.summary}
                                </p>
                              </td>
                            </tr>
                          )}
                        </>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
