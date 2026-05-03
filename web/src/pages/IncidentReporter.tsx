import { useState, useEffect } from "react";
import { callAnalyzeIncident } from "../lib/firebase";
import type { IncidentEntry, IncidentReport } from "../lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "../hooks/useAuth";
import type { UniversityChoice } from "../hooks/useAuth";
import { EGYPT_AUTHORITIES, HT_CONTACTS } from "../lib/authorities";
import type { AuthorityType } from "../lib/authorities";
import jsPDF from "jspdf";

// ── University wellbeing contacts ─────────────────────────────────────────────
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

const HT_CATEGORIES = new Set([
  "sex_trafficking", "forced_labor", "domestic_servitude", "child_trafficking",
  "forced_criminal_activity", "organ_trafficking", "forced_marriage",
]);

const PRIORITY_ORDER: Record<string, number> = {
  critical: 0, high: 1, medium: 2, low: 3,
};

const SEVERITY_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  low: { bg: "var(--color-tertiary-light)", text: "var(--color-tertiary)", border: "rgba(20,196,158,0.25)" },
  medium: { bg: "rgba(245,158,11,0.1)", text: "#d97706", border: "rgba(245,158,11,0.25)" },
  high: { bg: "rgba(249,115,22,0.1)", text: "#ea580c", border: "rgba(249,115,22,0.25)" },
  critical: { bg: "rgba(239,68,68,0.1)", text: "var(--color-danger)", border: "rgba(239,68,68,0.25)" },
};

const PRIORITY_ACCENT: Record<string, string> = {
  low: "var(--color-tertiary)", medium: "#f59e0b", high: "#f97316", critical: "var(--color-danger)",
};

function timelineIcon(text: string) {
  const t = text.toLowerCase();
  if (t.includes("threat") || t.includes("critical") || t.includes("danger")) return "🔴";
  if (t.includes("escalat") || t.includes("repeat") || t.includes("harass")) return "⚠️";
  return "🟢";
}

// ── Animated neural particles (same pattern as Dashboard) ─────────────────────
function NeuralParticles() {
  const particles = Array.from({ length: 6 });
  return (
    <div className="particle-field pointer-events-none">
      {particles.map((_, i) => (
        <div
          key={i}
          className="particle"
          style={{
            width: `${2 + (i % 3)}px`,
            height: `${2 + (i % 3)}px`,
            left: `${8 + i * 16}%`,
            top: `${10 + (i % 4) * 20}%`,
            "--duration": `${5 + i}s`,
            "--delay": `${i * 0.7}s`,
            background: i % 3 === 0 ? "var(--color-accent)" : i % 3 === 1 ? "var(--color-secondary)" : "var(--color-tertiary)",
          } as React.CSSProperties}
        />
      ))}
    </div>
  );
}

// ── Severity badge ─────────────────────────────────────────────────────────────
function SeverityBadge({ severity }: { severity: string }) {
  const s = SEVERITY_STYLES[severity] ?? SEVERITY_STYLES.low;
  return (
    <span
      className="text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider"
      style={{ background: s.bg, color: s.text, border: `1px solid ${s.border}` }}
    >
      {severity}
    </span>
  );
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

  useEffect(() => { if (user) fetchPastCases(); }, [user]);

  async function fetchPastCases() {
    if (!user) return;
    setLoadingCases(true);
    try {
      const q = query(collection(db, "user_cases"), where("user_id", "==", user.uid));
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
      cases.sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0));
      setPastCases(cases);
    } catch (e: unknown) {
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
    const ML = 22, MR = 22, MT = 20, MB = 20;
    const CW = PW - ML - MR;
    let y = MT;
    const now = new Date();
    const dateStr = now.toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });
    const timeStr = now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

    const stripMd = (s: string) =>
      s.replace(/^#{1,6}\s*/g, "").replace(/\*\*(.+?)\*\*/g, "$1").replace(/\*(.+?)\*/g, "$1").replace(/__(.+?)__/g, "$1").trim();

    const isSectionHeader = (raw: string) => {
      const t = stripMd(raw);
      return /^(\d+\.\s+)?[A-Z][A-Z0-9 &\/\-]{3,}$/.test(t);
    };

    const addFooter = () => {
      const fy = PH - MB + 2;
      pdf.setDrawColor(210, 210, 210); pdf.setLineWidth(0.3); pdf.line(ML, fy, PW - MR, fy);
      pdf.setFont("helvetica", "normal"); pdf.setFontSize(7); pdf.setTextColor(155, 155, 155);
      pdf.text(`Pause Platform  ·  Case ${report!.case_id}  ·  ${dateStr}`, ML, fy + 4);
    };

    const addPageHeader = () => {
      pdf.setFont("helvetica", "bold"); pdf.setFontSize(7); pdf.setTextColor(90, 90, 90);
      pdf.text("PAUSE — OFFICIAL INCIDENT REPORT", ML, y);
      pdf.text(report!.case_id, PW - MR, y, { align: "right" });
      y += 2.5; pdf.setDrawColor(180, 180, 180); pdf.setLineWidth(0.3); pdf.line(ML, y, PW - MR, y); y += 7;
    };

    const needsPage = (h: number) => {
      if (y + h > PH - MB - 14) { addFooter(); pdf.addPage(); y = MT; addPageHeader(); }
    };

    pdf.setFillColor(22, 101, 52); pdf.rect(0, 0, PW, 14, "F");
    pdf.setFont("helvetica", "bold"); pdf.setFontSize(13); pdf.setTextColor(255, 255, 255);
    pdf.text("PAUSE", ML, 9.5);
    pdf.setFont("helvetica", "normal"); pdf.setFontSize(8);
    pdf.text("AI Incident Documentation Platform", PW - MR, 9.5, { align: "right" });
    y = 22;

    pdf.setFont("times", "bold"); pdf.setFontSize(18); pdf.setTextColor(15, 15, 15);
    pdf.text("OFFICIAL INCIDENT REPORT", PW / 2, y, { align: "center" }); y += 5.5;
    pdf.setFont("times", "normal"); pdf.setFontSize(9); pdf.setTextColor(110, 110, 110);
    pdf.text("Prepared for submission to legal and law enforcement authorities", PW / 2, y, { align: "center" }); y += 9;

    const sevColors: Record<string, [number, number, number]> = {
      low: [22, 163, 74], medium: [180, 120, 0], high: [200, 70, 10], critical: [200, 30, 30],
    };
    const BOX_H = 50;
    const boxTop = y;
    const c1 = ML + 7, c2 = ML + CW / 2 + 4;
    pdf.setFillColor(247, 250, 247); pdf.setDrawColor(190, 215, 190); pdf.setLineWidth(0.4);
    pdf.roundedRect(ML, boxTop, CW, BOX_H, 2.5, 2.5, "FD");
    const midY = boxTop + BOX_H / 2;
    pdf.setDrawColor(210, 230, 210); pdf.setLineWidth(0.3); pdf.line(ML + 5, midY, PW - MR - 5, midY);
    const r1L = boxTop + 9, r1V = boxTop + 15;
    pdf.setFont("helvetica", "bold"); pdf.setFontSize(7); pdf.setTextColor(80, 120, 80);
    pdf.text("CASE ID", c1, r1L); pdf.text("GENERATED ON", c2, r1L);
    pdf.setFont("helvetica", "bold"); pdf.setFontSize(11); pdf.setTextColor(15, 15, 15);
    pdf.text(report.case_id, c1, r1V); pdf.setFontSize(10);
    pdf.text(`${dateStr}   ${timeStr}`, c2, r1V);
    const r2L = midY + 7, r2V = midY + 13, c3 = ML + CW * 0.66 + 4;
    pdf.setFont("helvetica", "bold"); pdf.setFontSize(7); pdf.setTextColor(80, 120, 80);
    pdf.text("SEVERITY", c1, r2L); pdf.text("PATTERN", c2, r2L); pdf.text("AI CONFIDENCE", c3, r2L);
    const sev = report.severity;
    pdf.setFont("helvetica", "bold"); pdf.setFontSize(11); pdf.setTextColor(...(sevColors[sev] ?? [15, 15, 15]));
    pdf.text(sev.toUpperCase(), c1, r2V); pdf.setTextColor(15, 15, 15); pdf.setFontSize(10);
    pdf.text(report.pattern.charAt(0).toUpperCase() + report.pattern.slice(1), c2, r2V);
    pdf.text(`${Math.round(report.confidence * 100)}%`, c3, r2V);
    y = boxTop + BOX_H + 5;

    const confH = 13;
    pdf.setFillColor(254, 243, 243); pdf.setDrawColor(248, 180, 180); pdf.setLineWidth(0.4);
    pdf.roundedRect(ML, y, CW, confH, 2, 2, "FD");
    const confMidY = y + confH / 2;
    pdf.setFont("helvetica", "bold"); pdf.setFontSize(7.5); pdf.setTextColor(180, 30, 30);
    pdf.text("CONFIDENTIAL", ML + 5, confMidY + 1.5);
    const labelW = pdf.getTextWidth("CONFIDENTIAL");
    pdf.setFont("helvetica", "normal"); pdf.setFontSize(7); pdf.setTextColor(150, 40, 40);
    const confText = "This report contains sensitive personal information intended solely for the named victim and relevant legal authorities.";
    const confLines = pdf.splitTextToSize(confText, CW - labelW - 12);
    pdf.text(confLines[0] ?? "", ML + 5 + labelW + 3, confMidY + 1.5);
    if (confLines[1]) pdf.text(confLines[1], ML + 5, confMidY + 5.5);
    y += confH + 7;

    pdf.setDrawColor(22, 101, 52); pdf.setLineWidth(0.5); pdf.line(ML, y, PW - MR, y); y += 10;

    const bodyLines = report.formal_report.split("\n");
    for (const raw of bodyLines) {
      if (raw.trim() === "") { y += 3; continue; }
      if (isSectionHeader(raw)) {
        needsPage(16);
        const title = stripMd(raw); y += 3;
        pdf.setFont("helvetica", "bold"); pdf.setFontSize(10.5); pdf.setTextColor(22, 101, 52);
        pdf.text(title, ML, y); y += 2;
        pdf.setDrawColor(22, 101, 52); pdf.setLineWidth(0.35); pdf.line(ML, y, PW - MR, y); y += 5;
      } else {
        const cleaned = stripMd(raw);
        const isBullet = /^[-•*]/.test(raw.trim());
        const indent = isBullet ? 5 : 0;
        const displayLine = isBullet ? "• " + cleaned.replace(/^[-•*]\s*/, "") : cleaned;
        const wrapped = pdf.splitTextToSize(displayLine, CW - indent);
        for (const wl of wrapped) {
          needsPage(5.5);
          pdf.setFont("times", "normal"); pdf.setFontSize(10); pdf.setTextColor(25, 25, 25);
          pdf.text(wl, ML + indent, y); y += 5.2;
        }
      }
    }

    if (wellbeing) {
      needsPage(26); y += 4;
      pdf.setFillColor(245, 240, 255); pdf.setDrawColor(180, 150, 220); pdf.setLineWidth(0.4);
      const wbH = 22; pdf.roundedRect(ML, y, CW, wbH, 2, 2, "FD");
      const wbMid = y + wbH / 2;
      pdf.setFont("helvetica", "bold"); pdf.setFontSize(7); pdf.setTextColor(100, 50, 160);
      pdf.text("UNIVERSITY WELLBEING SUPPORT", ML + 5, wbMid - 5);
      pdf.setFont("helvetica", "bold"); pdf.setFontSize(9); pdf.setTextColor(50, 20, 100);
      pdf.text(wellbeing.name, ML + 5, wbMid + 0.5);
      pdf.setFont("helvetica", "normal"); pdf.setFontSize(8); pdf.setTextColor(80, 40, 130);
      pdf.text(`${wellbeing.phone}  ·  ${wellbeing.email}`, ML + 5, wbMid + 6);
      y += wbH + 6;
    }

    addFooter();
    const total = pdf.getNumberOfPages();
    for (let p = 1; p <= total; p++) {
      pdf.setPage(p); pdf.setFont("helvetica", "normal"); pdf.setFontSize(7); pdf.setTextColor(155, 155, 155);
      pdf.text(`Page ${p} of ${total}`, PW - MR, PH - MB + 6, { align: "right" });
    }
    pdf.save(`Pause_Incident_Report_${report.case_id}.pdf`);
  }

  const sortedActions = report
    ? [...report.recommended_actions].sort(
      (a, b) => (PRIORITY_ORDER[a.priority] ?? 9) - (PRIORITY_ORDER[b.priority] ?? 9)
    )
    : [];

  const CASE_TYPE_OPTIONS = [
    { value: "cyberbullying", label: "Cyberbullying / Online Violence", icon: "💬", accent: "var(--color-accent)" },
    { value: "human_trafficking", label: "Human Trafficking", icon: "🚨", accent: "var(--color-danger)" },
    { value: "auto", label: "Let AI Decide", icon: "🤖", accent: "var(--color-secondary)" },
  ] as const;

  return (
    <div className="flex flex-col gap-6 relative">
      <NeuralParticles />

      {/* ── Header ── */}
      <div className="animate-fade-in-up">
        <div className="flex items-center gap-3 mb-1">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center text-lg"
            style={{
              background: "linear-gradient(135deg, var(--color-accent), var(--color-secondary))",
              boxShadow: "var(--shadow-glow-blue)",
            }}
          >
            🛡️
          </div>
          <h1
            className="text-2xl font-bold tracking-tight"
            style={{ fontFamily: "var(--font-display)", color: "var(--color-text)" }}
          >
            Incident Reporter
          </h1>
          <span className="status-pill status-pill-teal ml-auto">
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "var(--color-tertiary)" }} />
            Encrypted
          </span>
        </div>
        <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
          Build a structured case. MindShield vaults your evidence and uses AI to detect patterns and guide next steps.
        </p>
      </div>

      {/* ── Privacy notice ── */}
      <div
        className="flex items-start gap-3 rounded-2xl px-4 py-3.5 animate-fade-in-up"
        style={{
          background: "var(--color-tertiary-light)",
          border: "1px solid rgba(20,196,158,0.2)",
          animationDelay: "40ms",
        }}
      >
        <span className="text-lg mt-0.5">🔒</span>
        <p className="text-xs leading-relaxed" style={{ color: "var(--color-tertiary-dark)" }}>
          <span className="font-bold">Your privacy is protected.</span>{" "}
          Everything you submit is encrypted and stored privately under your account only. Your data will never be shared, sold, or used to train AI models.
        </p>
      </div>

      {/* ── Main Layout ── */}
      <div className="flex flex-col gap-6 animate-fade-in-up" style={{ animationDelay: "80ms" }}>

        {/* ──── TOP: Evidence Builder ──── */}
        <div className="flex flex-col gap-4 w-full">
          <div
            className="rounded-2xl overflow-hidden"
            style={{
              background: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              boxShadow: "var(--shadow-card)",
            }}
          >
            {/* ── Card header bar ── */}
            <div
              className="flex items-center gap-3 px-6 py-5"
              style={{ borderBottom: "1px solid var(--color-border)", background: "var(--color-surface-raised)" }}
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0"
                style={{
                  background: "linear-gradient(135deg, var(--color-accent-light), var(--color-secondary-light))",
                  border: "1px solid var(--color-border)",
                }}
              >
                📁
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="font-bold text-base leading-tight" style={{ fontFamily: "var(--font-display)", color: "var(--color-text)" }}>
                  Evidence Builder
                </h2>
                <p className="text-xs mt-0.5" style={{ color: "var(--color-text-faint)" }}>
                  {entries.length === 0 ? "No entries yet" : `${entries.length} entr${entries.length === 1 ? "y" : "ies"} logged`}
                </p>
              </div>
              {entries.length > 0 && (
                <span
                  className="text-xs font-bold px-3 py-1.5 rounded-full shrink-0"
                  style={{ background: "var(--color-accent-light)", color: "var(--color-accent)", border: "1px solid rgba(26,133,204,0.2)" }}
                >
                  {entries.length}
                </span>
              )}
            </div>

            <div className="p-5 flex flex-col gap-5">

              {/* ── Case Type ── */}
              <div>
                <p className="section-label mb-2.5">Case Type</p>
                <div className="flex flex-col gap-2">
                  {CASE_TYPE_OPTIONS.map(({ value, label, icon, accent }) => {
                    const isActive = caseType === value;
                    return (
                      <button
                        key={value}
                        onClick={() => { setCaseType(value); if (value !== "human_trafficking") setTraffickingSubtype(""); }}
                        className="text-left flex items-center gap-4 px-4 py-3 rounded-xl text-base font-medium transition-all"
                        style={{
                          background: isActive ? `${accent}10` : "var(--color-surface-raised)",
                          border: `1.5px solid ${isActive ? `${accent}50` : "var(--color-border)"}`,
                          color: isActive ? accent : "var(--color-text-muted)",
                          boxShadow: isActive ? `0 0 14px ${accent}18` : "none",
                        }}
                      >
                        <span className="text-lg w-6 text-center shrink-0">{icon}</span>
                        <span className="flex-1">{label}</span>
                        <span
                          className="w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center transition-all"
                          style={{
                            borderColor: isActive ? accent : "var(--color-border)",
                            background: isActive ? accent : "transparent",
                          }}
                        >
                          {isActive && <span className="w-1.5 h-1.5 rounded-full bg-white block" />}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {caseType === "human_trafficking" && (
                  <div
                    className="mt-3 rounded-xl p-3.5 flex flex-col gap-2.5"
                    style={{ background: "rgba(239,68,68,0.05)", border: "1px solid rgba(239,68,68,0.18)" }}
                  >
                    <p className="section-label" style={{ color: "var(--color-danger)" }}>Subtype (optional)</p>
                    <select
                      value={traffickingSubtype}
                      onChange={(e) => setTraffickingSubtype(e.target.value)}
                      className="input-field w-full text-sm px-4 py-2.5 rounded-lg"
                      style={{ background: "var(--color-background)" }}
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
                    <p className="text-xs leading-relaxed font-medium" style={{ color: "var(--color-danger)" }}>
                      🚨 If you are in immediate danger, call <strong>122</strong> (Police) or{" "}
                      <strong>16000</strong> (Child Helpline) now.
                    </p>
                  </div>
                )}
              </div>

              {/* ── Victim context ── */}
              <div>
                <p className="section-label mb-2.5">Victim context (optional)</p>
                <div className="flex gap-2 flex-wrap">
                  {[
                    { value: "male", label: "Male" },
                    { value: "female", label: "Female" },
                    { value: "unspecified", label: "Prefer not to say" },
                  ].map(({ value, label }) => (
                    <button
                      key={value}
                      onClick={() => setGender(value)}
                      className="text-sm px-4 py-2 rounded-full font-medium transition-all"
                      style={{
                        background: gender === value ? "var(--color-accent-light)" : "var(--color-surface-raised)",
                        border: `1px solid ${gender === value ? "var(--color-accent)" : "var(--color-border)"}`,
                        color: gender === value ? "var(--color-accent)" : "var(--color-text-muted)",
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* ── Logged entries ── */}
              {entries.length > 0 && (
                <div>
                  <p className="section-label mb-2.5">Logged evidence</p>
                  <div className="flex flex-col gap-2 max-h-52 overflow-y-auto pr-0.5">
                    {entries.map((e, i) => (
                      <div
                        key={e.entry_id}
                        className="rounded-xl p-3.5 relative"
                        style={{
                          background: "var(--color-background)",
                          border: "1px solid var(--color-border)",
                          borderLeft: "3px solid var(--color-accent)",
                        }}
                      >
                        <div className="flex items-start justify-between gap-2 mb-1.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span
                              className="text-xs font-bold px-2 py-1 rounded"
                              style={{ background: "var(--color-accent-light)", color: "var(--color-accent)" }}
                            >
                              #{i + 1}
                            </span>
                            <span className="text-xs" style={{ color: "var(--color-text-faint)" }}>
                              {e.timestamp}
                            </span>
                            <span
                              className="text-xs px-2 py-1 rounded capitalize"
                              style={{ background: "var(--color-surface-raised)", color: "var(--color-text-muted)", border: "1px solid var(--color-border)" }}
                            >
                              {e.source}
                            </span>
                          </div>
                          <button
                            onClick={() => removeEntry(e.entry_id)}
                            className="w-6 h-6 rounded-full flex items-center justify-center text-xs shrink-0 transition-all"
                            style={{ color: "var(--color-danger)", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.15)" }}
                            title="Remove entry"
                          >
                            ✕
                          </button>
                        </div>
                        <p className="text-sm leading-relaxed" style={{ color: "var(--color-text)" }}>
                          {e.text}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Add entry form / button ── */}
              {showForm ? (
                <div
                  className="rounded-xl overflow-hidden"
                  style={{ border: "1.5px solid var(--color-accent)", boxShadow: "0 0 0 3px var(--color-accent-glow)" }}
                >
                  {/* Form header */}
                  <div
                    className="flex items-center gap-2 px-5 py-3"
                    style={{ background: "var(--color-accent-light)", borderBottom: "1px solid rgba(26,133,204,0.15)" }}
                  >
                    <span className="text-base">📝</span>
                    <p className="text-sm font-bold" style={{ color: "var(--color-accent)" }}>
                      New Case Entry
                    </p>
                  </div>

                  {/* Form body */}
                  <div
                    className="p-4 flex flex-col gap-3"
                    style={{ background: "var(--color-background)" }}
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-bold uppercase tracking-wide mb-1.5 block" style={{ color: "var(--color-text-faint)" }}>
                          Date
                        </label>
                        <input
                          type="date"
                          value={date}
                          onChange={(e) => setDate(e.target.value)}
                          className="input-field w-full text-sm px-4 py-3"
                          style={{ borderRadius: "var(--radius-sm)" }}
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold uppercase tracking-wide mb-1.5 block" style={{ color: "var(--color-text-faint)" }}>
                          Source
                        </label>
                        <select
                          value={source}
                          onChange={(e) => setSource(e.target.value)}
                          className="input-field w-full text-sm px-4 py-3"
                          style={{ borderRadius: "var(--radius-sm)" }}
                        >
                          <option value="manual">Manual</option>
                          <option value="message">Text message</option>
                          <option value="email">Email</option>
                        </select>
                      </div>
                    </div>

                    <div className="mt-2">
                      <label className="text-xs font-bold uppercase tracking-wide mb-1.5 block" style={{ color: "var(--color-text-faint)" }}>
                        Description
                      </label>
                      <textarea
                        rows={4}
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        placeholder="Describe the incident or paste the message content…"
                        className="input-field w-full text-sm px-4 py-3 resize-none"
                        style={{ borderRadius: "var(--radius-sm)", lineHeight: "1.6" }}
                      />
                      <div className="flex items-center justify-between mt-2">
                        {text.length > 0 && text.trim().length < 10 ? (
                          <p className="text-xs" style={{ color: "var(--color-danger)" }}>
                            At least 10 characters required.
                          </p>
                        ) : (
                          <span />
                        )}
                        <p className="text-xs" style={{ color: "var(--color-text-faint)" }}>
                          {text.length} chars
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-3 pt-2">
                      <button
                        onClick={addEntry}
                        disabled={text.trim().length < 10}
                        className="btn-primary flex-1 py-3 text-sm font-semibold ripple-wrapper disabled:opacity-40"
                      >
                        ✓ Save Entry
                      </button>
                      {entries.length > 0 && (
                        <button
                          onClick={() => setShowForm(false)}
                          className="px-5 py-3 rounded-xl text-sm font-medium transition-all hover:bg-[var(--color-surface-raised)]"
                          style={{ border: "1px solid var(--color-border)", color: "var(--color-text-muted)", background: "var(--color-surface)" }}
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowForm(true)}
                  className="w-full py-4 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2 group"
                  style={{
                    border: "1.5px dashed var(--color-border)",
                    color: "var(--color-text-muted)",
                    background: "transparent",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--color-accent)";
                    (e.currentTarget as HTMLButtonElement).style.color = "var(--color-accent)";
                    (e.currentTarget as HTMLButtonElement).style.background = "var(--color-accent-light)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--color-border)";
                    (e.currentTarget as HTMLButtonElement).style.color = "var(--color-text-muted)";
                    (e.currentTarget as HTMLButtonElement).style.background = "transparent";
                  }}
                >
                  <span className="text-base leading-none">+</span>
                  <span>Add Another Entry</span>
                </button>
              )}

              {/* ── Divider ── */}
              <div style={{ height: 1, background: "var(--color-border)" }} />

              {/* ── Analyze button ── */}
              <div className="flex flex-col gap-2">
                <button
                  onClick={handleAnalyze}
                  disabled={entries.length === 0 || loading}
                  className="w-full py-3.5 rounded-xl font-bold text-sm text-white transition-all ripple-wrapper disabled:opacity-40 relative overflow-hidden"
                  style={{
                    background: caseType === "human_trafficking"
                      ? "linear-gradient(135deg, #dc2626, #b91c1c)"
                      : "linear-gradient(135deg, var(--color-accent), var(--color-secondary))",
                    boxShadow: entries.length === 0 ? "none" : caseType === "human_trafficking"
                      ? "0 4px 16px rgba(220,38,38,0.35)"
                      : "0 4px 16px var(--color-accent-glow)",
                    fontFamily: "var(--font-display)",
                  }}
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      {step || "Analyzing…"}
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      🔍 Analyze Case Securely
                    </span>
                  )}
                </button>
                <p className="text-[10px] text-center" style={{ color: "var(--color-text-faint)" }}>
                  🔒 Raw evidence is vaulted. Only sanitized data is analyzed.
                </p>
              </div>

            </div>
          </div>
        </div>

        {/* ──── RIGHT: Analysis Output ──── */}
        <div
          className="flex-1 rounded-2xl p-5 min-h-48"
          style={{
            background: "var(--color-surface)",
            border: "1px solid var(--color-border)",
            boxShadow: "var(--shadow-card)",
          }}
        >
          <div className="flex items-center gap-2 mb-5">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center text-sm"
              style={{ background: "var(--color-secondary-light)", color: "var(--color-secondary)" }}
            >
              🧠
            </div>
            <h2 className="font-bold text-base" style={{ fontFamily: "var(--font-display)", color: "var(--color-text)" }}>
              Case Analysis & Recommendations
            </h2>
          </div>

          {/* Loading state */}
          {loading && (
            <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
              <div className="relative">
                <div
                  className="w-14 h-14 rounded-full border-2 border-t-transparent animate-spin"
                  style={{ borderColor: "var(--color-accent)", borderTopColor: "transparent" }}
                />
                <div
                  className="absolute inset-2 rounded-full"
                  style={{ background: "var(--color-accent-light)" }}
                />
              </div>
              <div>
                <p className="text-sm font-bold" style={{ color: "var(--color-accent)" }}>{step}</p>
                <p className="text-xs mt-1" style={{ color: "var(--color-text-faint)" }}>
                  Encrypting and processing…
                </p>
              </div>
            </div>
          )}

          {error && (
            <div
              className="rounded-xl px-4 py-3 text-sm text-center"
              style={{ background: "rgba(239,68,68,0.08)", color: "var(--color-danger)", border: "1px solid rgba(239,68,68,0.2)" }}
            >
              ⚠️ {error}
            </div>
          )}

          {!loading && !report && !error && (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl"
                style={{ background: "var(--color-surface-raised)", border: "1px solid var(--color-border)" }}
              >
                📋
              </div>
              <p className="text-sm" style={{ color: "var(--color-text-faint)" }}>
                Build and submit a case to view AI analysis
              </p>
            </div>
          )}

          {report && !loading && (
            <div className="flex flex-col gap-5">
              {/* Case ID + meta */}
              <div
                className="rounded-xl p-4"
                style={{ background: "var(--color-background)", border: "1px solid var(--color-border)" }}
              >
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="section-label">Case ID</p>
                    <p
                      className="text-lg font-bold font-mono mt-0.5"
                      style={{ color: "var(--color-accent)" }}
                    >
                      {report.case_id}
                    </p>
                  </div>
                  <SeverityBadge severity={report.severity} />
                </div>
                <div className="flex flex-wrap gap-3">
                  <div>
                    <p className="section-label">Category</p>
                    <span
                      className="text-xs font-bold px-2.5 py-1 rounded-full mt-1 inline-block capitalize"
                      style={{
                        background: "var(--color-accent-light)",
                        color: "var(--color-accent)",
                        border: "1px solid var(--color-border)",
                      }}
                    >
                      {report.primary_category}
                    </span>
                  </div>
                  {report.secondary_categories?.length > 0 && (
                    <div>
                      <p className="section-label">Also detected</p>
                      <div className="flex gap-1 flex-wrap mt-1">
                        {report.secondary_categories.map((c) => (
                          <span
                            key={c}
                            className="text-xs px-2 py-0.5 rounded-full capitalize"
                            style={{
                              background: "var(--color-surface-raised)",
                              color: "var(--color-text-muted)",
                              border: "1px solid var(--color-border)",
                            }}
                          >
                            {c}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  <div>
                    <p className="section-label">Pattern</p>
                    <span
                      className="text-xs font-bold px-2.5 py-1 rounded-full mt-1 inline-block capitalize"
                      style={{
                        background: "var(--color-surface-raised)",
                        color: "var(--color-text-muted)",
                        border: "1px solid var(--color-border)",
                      }}
                    >
                      {report.pattern}
                    </span>
                  </div>
                  <div>
                    <p className="section-label">AI Confidence</p>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="data-bar w-20">
                        <div
                          className="data-bar-fill"
                          style={{
                            width: `${Math.round(report.confidence * 100)}%`,
                            background: "linear-gradient(90deg, var(--color-accent), var(--color-secondary))",
                          }}
                        />
                      </div>
                      <span className="text-xs font-bold" style={{ color: "var(--color-accent)" }}>
                        {Math.round(report.confidence * 100)}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Timeline */}
              <div>
                <p className="section-label mb-3">📅 Chronological Timeline</p>
                <div className="flex flex-col gap-2">
                  {report.timeline.map((item, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-3 pl-3 py-2 rounded-r-xl text-xs"
                      style={{
                        borderLeft: "2px solid var(--color-accent)",
                        background: "var(--color-background)",
                        color: "var(--color-text)",
                        fontFamily: "var(--font-body)",
                      }}
                    >
                      <span>{timelineIcon(item)}</span>
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div>
                <p className="section-label mb-3">🧠 What Should You Do Next?</p>
                <div className="flex flex-col gap-2">
                  {sortedActions.map((act, i) => (
                    <div
                      key={i}
                      className="flex justify-between items-start gap-3 px-3 py-2.5 rounded-xl"
                      style={{
                        background: "var(--color-background)",
                        borderLeft: `3px solid ${PRIORITY_ACCENT[act.priority] ?? "var(--color-border)"}`,
                        border: "1px solid var(--color-border)",
                        borderLeftWidth: "3px",
                        borderLeftColor: PRIORITY_ACCENT[act.priority] ?? "var(--color-border)",
                      }}
                    >
                      <p className="text-xs font-medium" style={{ color: "var(--color-text)" }}>
                        {act.action}
                      </p>
                      <SeverityBadge severity={act.priority} />
                    </div>
                  ))}
                </div>
              </div>

              {/* Authority block */}
              {!HT_CATEGORIES.has(report.primary_category) && caseType !== "human_trafficking" && (() => {
                const authType = report.recommended_authority.type as AuthorityType;
                const auth = EGYPT_AUTHORITIES[authType];
                const isNone = authType === "none";
                return (
                  <div
                    className="rounded-xl p-4 flex flex-col gap-3"
                    style={{
                      background: isNone ? "var(--color-surface-raised)" : "var(--color-accent-light)",
                      border: `1px solid ${isNone ? "var(--color-border)" : "rgba(26,133,204,0.25)"}`,
                    }}
                  >
                    <div className="flex items-start gap-2">
                      <span className="text-base">{isNone ? "ℹ️" : "⚖️"}</span>
                      <div>
                        <p className="section-label" style={{ color: isNone ? "var(--color-text-faint)" : "var(--color-accent)" }}>
                          Recommended Authority
                        </p>
                        <p className="text-sm font-bold mt-0.5" style={{ color: "var(--color-text)" }}>
                          {auth.name}
                        </p>
                        <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>
                          {auth.description}
                        </p>
                      </div>
                    </div>

                    {!isNone && (
                      <>
                        <div>
                          <p className="section-label mb-1" style={{ color: "var(--color-accent)" }}>Why this authority?</p>
                          <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>{report.recommended_authority.reason}</p>
                        </div>
                        <div>
                          <p className="section-label mb-1" style={{ color: "var(--color-accent)" }}>What you should do</p>
                          <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>{report.recommended_authority.action}</p>
                        </div>
                        {auth.recommendedFor.length > 0 && (
                          <div>
                            <p className="section-label mb-1.5" style={{ color: "var(--color-accent)" }}>Recommended for</p>
                            <ul className="flex flex-col gap-1">
                              {auth.recommendedFor.map((r) => (
                                <li key={r} className="text-xs flex items-center gap-1.5" style={{ color: "var(--color-text-muted)" }}>
                                  <span style={{ color: "var(--color-accent)" }}>•</span> {r}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {auth.contact.notes && (
                          <p className="text-[10px] italic" style={{ color: "var(--color-text-faint)" }}>{auth.contact.notes}</p>
                        )}
                        <div className="flex gap-2 flex-wrap">
                          {auth.contact.phone && (
                            <a
                              href={`tel:${auth.contact.phone}`}
                              className="text-xs px-3 py-1.5 rounded-xl text-white font-medium"
                              style={{ background: "var(--color-accent)", boxShadow: "0 2px 8px var(--color-accent-glow)" }}
                            >
                              📞 {auth.contact.phone}
                            </a>
                          )}
                          {auth.contact.website && (
                            <a
                              href={auth.contact.website}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs px-3 py-1.5 rounded-xl font-medium"
                              style={{
                                border: "1px solid var(--color-border)",
                                color: "var(--color-accent)",
                                background: "var(--color-surface)",
                              }}
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

              {/* HT Emergency Contacts */}
              {(caseType === "human_trafficking" || HT_CATEGORIES.has(report.primary_category)) && (
                <div
                  className="rounded-xl p-4 flex flex-col gap-3"
                  style={{
                    background: "rgba(239,68,68,0.06)",
                    border: "1px solid rgba(239,68,68,0.25)",
                  }}
                >
                  <div className="flex items-start gap-2">
                    <span className="text-base">🚨</span>
                    <div>
                      <p className="section-label" style={{ color: "var(--color-danger)" }}>
                        Human Trafficking Emergency Contacts
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>
                        Contact these authorities immediately. Your case has been securely vaulted.
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    {HT_CONTACTS.map((c) => (
                      <div
                        key={c.id}
                        className="rounded-xl border px-3 py-2.5"
                        style={{ background: "var(--color-surface)", border: "1px solid rgba(239,68,68,0.2)" }}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold" style={{ color: "var(--color-text)" }}>{c.label}</p>
                            {c.sublabel && <p className="text-[10px] mt-0.5" style={{ color: "var(--color-danger)" }}>{c.sublabel}</p>}
                            <p className="text-[10px] mt-1 leading-relaxed" style={{ color: "var(--color-text-muted)" }}>{c.note}</p>
                          </div>
                          {c.number && (
                            <a
                              href={`tel:${c.number}`}
                              className="shrink-0 text-xs px-3 py-1.5 rounded-lg text-white font-bold"
                              style={{ background: "var(--color-danger)" }}
                            >
                              📞 {c.number}
                            </a>
                          )}
                          {c.facebook && (
                            <a
                              href={c.facebook}
                              target="_blank"
                              rel="noreferrer"
                              className="shrink-0 text-xs px-3 py-1.5 rounded-lg text-white font-medium"
                              style={{ background: "#1d4ed8" }}
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

              {/* University Wellbeing */}
              {wellbeing && (
                <div
                  className="rounded-xl p-4 flex flex-col gap-3"
                  style={{
                    background: "var(--color-secondary-light)",
                    border: "1px solid rgba(139,92,246,0.2)",
                  }}
                >
                  <div className="flex items-start gap-2">
                    <span className="text-base">🏫</span>
                    <div>
                      <p className="section-label" style={{ color: "var(--color-secondary)" }}>
                        University Wellbeing Support
                      </p>
                      <p className="text-sm font-bold mt-0.5" style={{ color: "var(--color-text)" }}>
                        {wellbeing.name}
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>
                        Your campus wellbeing center can provide confidential support and guidance.
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <a
                      href={`tel:${wellbeing.phone}`}
                      className="text-xs px-3 py-1.5 rounded-xl text-white font-medium"
                      style={{ background: "var(--color-secondary)", boxShadow: "0 2px 8px var(--color-secondary-glow)" }}
                    >
                      📞 {wellbeing.phone}
                    </a>
                    <a
                      href={`mailto:${wellbeing.email}`}
                      className="text-xs px-3 py-1.5 rounded-xl font-medium"
                      style={{
                        border: "1px solid rgba(139,92,246,0.3)",
                        color: "var(--color-secondary)",
                        background: "var(--color-surface)",
                      }}
                    >
                      ✉️ {wellbeing.email}
                    </a>
                    {wellbeing.website && (
                      <a
                        href={wellbeing.website}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs px-3 py-1.5 rounded-xl font-medium"
                        style={{
                          border: "1px solid rgba(139,92,246,0.3)",
                          color: "var(--color-secondary)",
                          background: "var(--color-surface)",
                        }}
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
                  className="btn-primary w-full py-3.5 text-sm font-bold ripple-wrapper"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  ⬇ Download Legal Case Report
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Past Cases ── */}
      {user && (
        <div className="mt-2 animate-fade-in-up" style={{ animationDelay: "120ms" }}>
          <div className="flex items-center gap-2 mb-3">
            <h2 className="font-bold text-lg" style={{ fontFamily: "var(--font-display)", color: "var(--color-text)" }}>
              Your Previous Cases
            </h2>
            {pastCases.length > 0 && (
              <span
                className="status-pill"
                style={{
                  background: "var(--color-accent-light)",
                  color: "var(--color-accent)",
                  border: "1px solid var(--color-border)",
                }}
              >
                {pastCases.length}
              </span>
            )}
          </div>

          <div
            className="rounded-2xl overflow-hidden"
            style={{
              background: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              boxShadow: "var(--shadow-card)",
            }}
          >
            {loadingCases ? (
              <div className="flex items-center justify-center gap-2 py-10">
                <div
                  className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin"
                  style={{ borderColor: "var(--color-accent)", borderTopColor: "transparent" }}
                />
                <p className="text-sm" style={{ color: "var(--color-text-faint)" }}>Loading cases…</p>
              </div>
            ) : casesError ? (
              <p className="text-xs text-center py-8 px-4" style={{ color: "var(--color-danger)" }}>
                ⚠️ Could not load cases: {casesError}
              </p>
            ) : pastCases.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-10">
                <span className="text-3xl">📂</span>
                <p className="text-sm" style={{ color: "var(--color-text-faint)" }}>
                  No past cases yet. Submit your first case above.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr style={{ borderBottom: "1px solid var(--color-border)", background: "var(--color-background)" }}>
                      {["Case ID", "Date", "Summary", "Category", "Severity", "Pattern"].map((h) => (
                        <th
                          key={h}
                          className="text-left px-4 py-3 font-bold uppercase tracking-wider text-[10px]"
                          style={{ color: "var(--color-text-faint)" }}
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
                            className="cursor-pointer select-none transition-colors"
                            style={{ borderBottom: "1px solid var(--color-border)" }}
                            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--color-background)")}
                            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                          >
                            <td className="px-4 py-3 font-bold" style={{ color: "var(--color-accent)" }}>
                              <span className="mr-1" style={{ color: "var(--color-text-faint)" }}>
                                {isExpanded ? "▾" : "▸"}
                              </span>
                              {c.case_id}
                            </td>
                            <td className="px-4 py-3" style={{ color: "var(--color-text-muted)" }}>
                              {c.createdAt ? c.createdAt.toLocaleDateString() : "—"}
                            </td>
                            <td
                              className="px-4 py-3 max-w-[180px] truncate"
                              style={{ color: "var(--color-text)" }}
                            >
                              {c.summary}
                            </td>
                            <td className="px-4 py-3 capitalize">
                              <span
                                className="px-2 py-0.5 rounded-md text-[10px] font-bold"
                                style={{
                                  background: "var(--color-accent-light)",
                                  color: "var(--color-accent)",
                                  border: "1px solid var(--color-border)",
                                }}
                              >
                                {c.primary_category}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <SeverityBadge severity={c.severity} />
                            </td>
                            <td className="px-4 py-3 capitalize" style={{ color: "var(--color-text-muted)" }}>
                              {c.pattern}
                            </td>
                          </tr>
                          {isExpanded && (
                            <tr key={`${c.id}-expanded`}>
                              <td
                                colSpan={6}
                                className="px-6 py-4"
                                style={{
                                  background: "var(--color-background)",
                                  borderBottom: "1px solid var(--color-border)",
                                  borderLeft: "3px solid var(--color-accent)",
                                }}
                              >
                                <p className="section-label mb-1.5" style={{ color: "var(--color-accent)" }}>
                                  Full Case Summary
                                </p>
                                <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: "var(--color-text)" }}>
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