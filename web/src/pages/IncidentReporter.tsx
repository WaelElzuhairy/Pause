import { useState, useEffect } from "react";
import { callAnalyzeIncident } from "../lib/firebase";
import type { IncidentEntry, IncidentReport } from "../lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "../hooks/useAuth";
import type { UniversityChoice } from "../hooks/useAuth";
import { EGYPT_AUTHORITIES, HT_CONTACTS } from "../lib/authorities";
import type { AuthorityType } from "../lib/authorities";

// ── University wellbeing contacts ────────────────────────────────────────────
const WELLBEING: Record<
  Exclude<UniversityChoice, "other">,
  { name: string; email: string; phone: string; website?: string }
> = {
  galala: {
    name: "Galala University Wellbeing Center",
    email: "wellbeing.center@gu.edu.eg",
    phone: "+20 128 924 4460",
  },
  auc: {
    name: "AUC Student Wellbeing",
    email: "studentwellbeing@aucegypt.edu",
    phone: "+20 2 2615 4000",
    website: "https://www.aucegypt.edu/campus-life/student-wellbeing",
  },
};
import jsPDF from "jspdf";

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
  const { user, university } = useAuth();
  const wellbeing = university && university !== "other" ? WELLBEING[university] : null;

  const [caseType, setCaseType] = useState<"cyberbullying" | "human_trafficking" | "auto">("cyberbullying");
  const [traffickingSubtype, setTraffickingSubtype] = useState("");

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
      const res = await callAnalyzeIncident({
        entries,
        gender,
        case_type: caseType,
        trafficking_subtype: traffickingSubtype || undefined,
      });
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

    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const PW = pdf.internal.pageSize.getWidth();
    const PH = pdf.internal.pageSize.getHeight();
    const ML = 22;
    const MR = 22;
    const MT = 20;
    const MB = 20;
    const CW = PW - ML - MR;
    let y = MT;

    const now = new Date();
    const dateStr = now.toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });
    const timeStr = now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

    // ── Strip markdown the AI may have added ──────────────────
    const stripMd = (s: string) =>
      s.replace(/^#{1,6}\s*/g, "")
       .replace(/\*\*(.+?)\*\*/g, "$1")
       .replace(/\*(.+?)\*/g, "$1")
       .replace(/__(.+?)__/g, "$1")
       .trim();

    // Section header: after stripping, all-caps line (allows digits, dots, spaces, & / -)
    const isSectionHeader = (raw: string) => {
      const t = stripMd(raw);
      return /^(\d+\.\s+)?[A-Z][A-Z0-9 &\/\-]{3,}$/.test(t);
    };

    // ── Page break helper ──────────────────────────────────────
    const needsPage = (h: number) => {
      if (y + h > PH - MB - 14) {
        addFooter();
        pdf.addPage();
        y = MT;
        addPageHeader();
      }
    };

    // ── Compact running header (pages 2+) ─────────────────────
    const addPageHeader = () => {
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(7);
      pdf.setTextColor(90, 90, 90);
      pdf.text("PAUSE — OFFICIAL INCIDENT REPORT", ML, y);
      pdf.text(report!.case_id, PW - MR, y, { align: "right" });
      y += 2.5;
      pdf.setDrawColor(180, 180, 180);
      pdf.setLineWidth(0.3);
      pdf.line(ML, y, PW - MR, y);
      y += 7;
    };

    // ── Footer ────────────────────────────────────────────────
    const addFooter = () => {
      const fy = PH - MB + 2;
      pdf.setDrawColor(210, 210, 210);
      pdf.setLineWidth(0.3);
      pdf.line(ML, fy, PW - MR, fy);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(7);
      pdf.setTextColor(155, 155, 155);
      pdf.text(`Pause Platform  ·  Case ${report!.case_id}  ·  ${dateStr}`, ML, fy + 4);
    };

    // ══════════════════════════════════════════════════════════
    // PAGE 1 — LETTERHEAD
    // ══════════════════════════════════════════════════════════

    // Green header bar
    pdf.setFillColor(22, 101, 52);
    pdf.rect(0, 0, PW, 14, "F");
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(13);
    pdf.setTextColor(255, 255, 255);
    pdf.text("PAUSE", ML, 9.5);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    pdf.text("AI Incident Documentation Platform", PW - MR, 9.5, { align: "right" });

    y = 22;

    // Title
    pdf.setFont("times", "bold");
    pdf.setFontSize(18);
    pdf.setTextColor(15, 15, 15);
    pdf.text("OFFICIAL INCIDENT REPORT", PW / 2, y, { align: "center" });
    y += 5.5;
    pdf.setFont("times", "normal");
    pdf.setFontSize(9);
    pdf.setTextColor(110, 110, 110);
    pdf.text("Prepared for submission to legal and law enforcement authorities", PW / 2, y, { align: "center" });
    y += 9;

    // ── Metadata box — absolute positioning inside the box ────
    const sevColors: Record<string, [number, number, number]> = {
      low: [22, 163, 74], medium: [180, 120, 0], high: [200, 70, 10], critical: [200, 30, 30],
    };
    const BOX_H = 50;
    const boxTop = y;
    const c1 = ML + 7;
    const c2 = ML + CW / 2 + 4;

    pdf.setFillColor(247, 250, 247);
    pdf.setDrawColor(190, 215, 190);
    pdf.setLineWidth(0.4);
    pdf.roundedRect(ML, boxTop, CW, BOX_H, 2.5, 2.5, "FD");

    // Thin mid-line separator
    const midY = boxTop + BOX_H / 2;
    pdf.setDrawColor(210, 230, 210);
    pdf.setLineWidth(0.3);
    pdf.line(ML + 5, midY, PW - MR - 5, midY);

    // Row 1  — Case ID | Generated On
    const r1L = boxTop + 9;   // label baseline
    const r1V = boxTop + 15;  // value baseline
    pdf.setFont("helvetica", "bold"); pdf.setFontSize(7); pdf.setTextColor(80, 120, 80);
    pdf.text("CASE ID", c1, r1L);
    pdf.text("GENERATED ON", c2, r1L);
    pdf.setFont("helvetica", "bold"); pdf.setFontSize(11); pdf.setTextColor(15, 15, 15);
    pdf.text(report.case_id, c1, r1V);
    pdf.setFontSize(10);
    pdf.text(`${dateStr}   ${timeStr}`, c2, r1V);

    // Row 2  — Severity | Pattern | Confidence
    const r2L = midY + 7;
    const r2V = midY + 13;
    const c3 = ML + CW * 0.66 + 4;
    pdf.setFont("helvetica", "bold"); pdf.setFontSize(7); pdf.setTextColor(80, 120, 80);
    pdf.text("SEVERITY", c1, r2L);
    pdf.text("PATTERN", c2, r2L);
    pdf.text("AI CONFIDENCE", c3, r2L);

    const sev = report.severity;
    pdf.setFont("helvetica", "bold"); pdf.setFontSize(11);
    pdf.setTextColor(...(sevColors[sev] ?? [15, 15, 15]));
    pdf.text(sev.toUpperCase(), c1, r2V);
    pdf.setTextColor(15, 15, 15);
    pdf.setFontSize(10);
    pdf.text(report.pattern.charAt(0).toUpperCase() + report.pattern.slice(1), c2, r2V);
    pdf.text(`${Math.round(report.confidence * 100)}%`, c3, r2V);

    y = boxTop + BOX_H + 5;

    // ── Confidentiality notice ────────────────────────────────
    const confH = 13;
    pdf.setFillColor(254, 243, 243);
    pdf.setDrawColor(248, 180, 180);
    pdf.setLineWidth(0.4);
    pdf.roundedRect(ML, y, CW, confH, 2, 2, "FD");

    // Label + text on same baseline row, vertically centred in the box
    const confMidY = y + confH / 2;
    pdf.setFont("helvetica", "bold"); pdf.setFontSize(7.5); pdf.setTextColor(180, 30, 30);
    pdf.text("CONFIDENTIAL", ML + 5, confMidY + 1.5);
    const labelW = pdf.getTextWidth("CONFIDENTIAL");
    pdf.setFont("helvetica", "normal"); pdf.setFontSize(7); pdf.setTextColor(150, 40, 40);
    const confText = "This report contains sensitive personal information intended solely for the named victim and relevant legal authorities. Unauthorised disclosure is prohibited.";
    const confLines = pdf.splitTextToSize(confText, CW - labelW - 12);
    // Place first line on same baseline, rest below
    pdf.text(confLines[0] ?? "", ML + 5 + labelW + 3, confMidY + 1.5);
    if (confLines[1]) pdf.text(confLines[1], ML + 5, confMidY + 5.5);

    y += confH + 7;

    // Divider
    pdf.setDrawColor(22, 101, 52);
    pdf.setLineWidth(0.5);
    pdf.line(ML, y, PW - MR, y);
    y += 10;

    // ══════════════════════════════════════════════════════════
    // BODY — formal_report
    // ══════════════════════════════════════════════════════════
    const bodyLines = report.formal_report.split("\n");

    for (const raw of bodyLines) {
      if (raw.trim() === "") { y += 3; continue; }

      if (isSectionHeader(raw)) {
        needsPage(16);
        const title = stripMd(raw);
        y += 3;
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(10.5);
        pdf.setTextColor(22, 101, 52);
        pdf.text(title, ML, y);
        y += 2;
        pdf.setDrawColor(22, 101, 52);
        pdf.setLineWidth(0.35);
        pdf.line(ML, y, PW - MR, y);
        y += 5;
      } else {
        const cleaned = stripMd(raw);
        const isBullet = /^[-•*]/.test(raw.trim());
        const indent = isBullet ? 5 : 0;
        const displayLine = isBullet ? "• " + cleaned.replace(/^[-•*]\s*/, "") : cleaned;
        const wrapped = pdf.splitTextToSize(displayLine, CW - indent);
        for (const wl of wrapped) {
          needsPage(5.5);
          pdf.setFont("times", "normal");
          pdf.setFontSize(10);
          pdf.setTextColor(25, 25, 25);
          pdf.text(wl, ML + indent, y);
          y += 5.2;
        }
      }
    }

    // ── University Wellbeing Center (if applicable) ───────────
    if (wellbeing) {
      needsPage(26);
      y += 4;
      pdf.setFillColor(245, 240, 255);
      pdf.setDrawColor(180, 150, 220);
      pdf.setLineWidth(0.4);
      const wbH = 22;
      pdf.roundedRect(ML, y, CW, wbH, 2, 2, "FD");

      const wbMid = y + wbH / 2;
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(7);
      pdf.setTextColor(100, 50, 160);
      pdf.text("UNIVERSITY WELLBEING SUPPORT", ML + 5, wbMid - 5);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(9);
      pdf.setTextColor(50, 20, 100);
      pdf.text(wellbeing.name, ML + 5, wbMid + 0.5);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(8);
      pdf.setTextColor(80, 40, 130);
      pdf.text(`${wellbeing.phone}  ·  ${wellbeing.email}`, ML + 5, wbMid + 6);

      y += wbH + 6;
    }

    // Final footer
    addFooter();

    // Page numbers on every page
    const total = pdf.getNumberOfPages();
    for (let p = 1; p <= total; p++) {
      pdf.setPage(p);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(7);
      pdf.setTextColor(155, 155, 155);
      pdf.text(`Page ${p} of ${total}`, PW - MR, PH - MB + 6, { align: "right" });
    }

    pdf.save(`Pause_Incident_Report_${report.case_id}.pdf`);
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

            {/* Case Type */}
            <div className="mb-4">
              <p className="text-xs font-semibold text-[var(--color-text)] mb-2">Case Type</p>
              <div className="flex flex-col gap-2">
                {([
                  { value: "cyberbullying", label: "Cyberbullying / Online Violence", icon: "💬" },
                  { value: "human_trafficking", label: "Human Trafficking", icon: "🚨" },
                  { value: "auto", label: "Let AI Decide", icon: "🤖" },
                ] as const).map(({ value, label, icon }) => (
                  <button
                    key={value}
                    onClick={() => { setCaseType(value); if (value !== "human_trafficking") setTraffickingSubtype(""); }}
                    className={`text-left flex items-center gap-2 px-3 py-2.5 rounded-xl border text-xs font-medium transition-colors ${
                      caseType === value
                        ? value === "human_trafficking"
                          ? "border-red-400 bg-red-50 text-red-700"
                          : "border-[var(--color-accent)] bg-[var(--color-accent)]/10 text-[var(--color-accent)]"
                        : "border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-accent)]/40"
                    }`}
                  >
                    <span>{icon}</span> {label}
                  </button>
                ))}
              </div>

              {/* HT Subtype picker */}
              {caseType === "human_trafficking" && (
                <div className="mt-3">
                  <p className="text-xs text-[var(--color-text-muted)] mb-1.5">Subtype (optional)</p>
                  <select
                    value={traffickingSubtype}
                    onChange={(e) => setTraffickingSubtype(e.target.value)}
                    className="w-full text-xs rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-[var(--color-text)]"
                  >
                    <option value="">— Let AI determine —</option>
                    <option value="sex_trafficking">Sex Trafficking</option>
                    <option value="forced_labor">Forced Labor</option>
                    <option value="domestic_servitude">Domestic Servitude</option>
                    <option value="child_trafficking">Child Trafficking</option>
                    <option value="forced_criminal_activity">Forced Criminal Activity</option>
                    <option value="organ_trafficking">Organ Trafficking</option>
                    <option value="forced_marriage">Forced Marriage</option>
                  </select>
                  <p className="text-[10px] text-red-500 mt-1.5 leading-relaxed">
                    🚨 If you are in immediate danger, call <strong>122</strong> (Police) or <strong>16000</strong> (Child Helpline) now.
                  </p>
                </div>
              )}
            </div>

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

              {/* Human Trafficking Emergency Contacts */}
              {caseType === "human_trafficking" && (
                <div className="rounded-xl border border-red-300 bg-red-50 p-4 flex flex-col gap-3">
                  <div className="flex items-start gap-2">
                    <span className="text-base">🚨</span>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-red-700">
                        Human Trafficking Emergency Contacts
                      </p>
                      <p className="text-xs text-red-600 mt-0.5">
                        Contact these authorities immediately. Your case has been securely vaulted.
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    {HT_CONTACTS.map((c) => (
                      <div key={c.id} className="bg-white rounded-lg border border-red-200 px-3 py-2.5">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-red-800 leading-snug">{c.label}</p>
                            {c.sublabel && (
                              <p className="text-[10px] text-red-500 mt-0.5">{c.sublabel}</p>
                            )}
                            <p className="text-[10px] text-red-600 mt-1 leading-relaxed">{c.note}</p>
                          </div>
                          {c.number && (
                            <a
                              href={`tel:${c.number}`}
                              className="shrink-0 text-xs px-3 py-1.5 rounded-lg bg-red-600 text-white font-bold"
                            >
                              📞 {c.number}
                            </a>
                          )}
                          {c.facebook && (
                            <a
                              href={c.facebook}
                              target="_blank"
                              rel="noreferrer"
                              className="shrink-0 text-xs px-3 py-1.5 rounded-lg bg-blue-600 text-white font-medium"
                            >
                              Facebook
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* University Wellbeing Center */}
              {wellbeing && (
                <div className="rounded-xl p-4 flex flex-col gap-2 border bg-purple-50 border-purple-200">
                  <div className="flex items-start gap-2">
                    <span className="text-base">🏫</span>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-purple-700">
                        University Wellbeing Support
                      </p>
                      <p className="text-sm font-bold text-purple-900 mt-0.5">{wellbeing.name}</p>
                      <p className="text-xs text-purple-700 mt-0.5">
                        Your campus wellbeing center can provide confidential support and guidance.
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-wrap mt-1">
                    <a
                      href={`tel:${wellbeing.phone}`}
                      className="text-xs px-3 py-1.5 rounded-lg bg-purple-600 text-white font-medium"
                    >
                      📞 {wellbeing.phone}
                    </a>
                    <a
                      href={`mailto:${wellbeing.email}`}
                      className="text-xs px-3 py-1.5 rounded-lg border border-purple-300 text-purple-700 font-medium"
                    >
                      ✉️ {wellbeing.email}
                    </a>
                    {wellbeing.website && (
                      <a
                        href={wellbeing.website}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs px-3 py-1.5 rounded-lg border border-purple-300 text-purple-700 font-medium"
                      >
                        🌐 Website
                      </a>
                    )}
                  </div>
                </div>
              )}

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
