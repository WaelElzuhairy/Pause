import { useState, useEffect } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Sun, Moon } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import AppBackground from "./AppBackground";
import UniversityModal from "./UniversityModal";
import clsx from "clsx";

const NAV = [
  { to: "/dashboard", label: "Home", icon: HomeIcon },
  { to: "/checkin", label: "Check In", icon: CheckInIcon },
  { to: "/improve", label: "Improve", icon: ImproveIcon },
  { to: "/report", label: "Report", icon: ReportIcon },
  { to: "/assistant", label: "Assistant", icon: AssistantIcon },
  { to: "/scenarios", label: "Scenarios", icon: ScenariosIcon },
  { to: "/insights", label: "Insights", icon: InsightsIcon },
];

export default function Layout() {
  const { user, university, universityLoaded, isAnonymous, linkGuestToGoogle, signOut } = useAuth();

  // ── Theme state — read from localStorage, sync to <html class="dark"> ─────
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem("pause-theme");
    return saved === "dark" || (!saved && window.matchMedia("(prefers-color-scheme: dark)").matches);
  });

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("pause-theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("pause-theme", "light");
    }
  }, [isDark]);

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--color-background)", position: "relative" }}>

      {/* Animated neural background — renders behind all content on every page */}
      <AppBackground />

      {/* University onboarding — only renders once Firestore confirmed university is unset */}
      {user && universityLoaded && university === null && <UniversityModal />}

      {/* Guest banner */}
      {isAnonymous && (
        <div
          className="relative z-10 px-4 py-2 flex items-center justify-between gap-4 border-b"
          style={{ background: "var(--color-surface)", borderColor: "var(--color-border)" }}
        >
          <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
            You're in guest mode — your data isn't saved permanently.
          </p>
          <button
            onClick={linkGuestToGoogle}
            className="text-xs font-medium underline underline-offset-2 whitespace-nowrap"
            style={{ color: "var(--color-accent)" }}
          >
            Save with Google
          </button>
        </div>
      )}

      {/* Top bar */}
      <header
        className="sticky top-0 z-20 px-6 h-14 flex items-center justify-between border-b"
        style={{
          background: "var(--color-surface-float)",
          backdropFilter: "blur(12px)",
          borderColor: "var(--color-border)",
        }}
      >
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: "var(--color-accent)" }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <rect x="6" y="4" width="4" height="16" rx="2" fill="white" />
              <rect x="14" y="4" width="4" height="16" rx="2" fill="white" />
            </svg>
          </div>
          <span className="font-semibold tracking-tight" style={{ color: "var(--color-text)" }}>
            Pause
          </span>
        </div>

        {/* Right side: name + theme toggle + sign out */}
        <div className="flex items-center gap-2">
          {user?.displayName && (
            <span className="text-sm hidden sm:block" style={{ color: "var(--color-text-muted)" }}>
              {user.displayName.split(" ")[0]}
            </span>
          )}

          {/* Theme toggle button */}
          <motion.button
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.92 }}
            onClick={() => setIsDark(!isDark)}
            aria-label="Toggle dark mode"
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
            style={{
              background: "var(--color-surface-raised)",
              border: "1px solid var(--color-border)",
              color: "var(--color-text-muted)",
            }}
          >
            <AnimatePresence mode="wait" initial={false}>
              {isDark ? (
                <motion.span
                  key="moon"
                  initial={{ rotate: 90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: -90, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  style={{ display: "flex" }}
                >
                  <Moon size={15} strokeWidth={2} />
                </motion.span>
              ) : (
                <motion.span
                  key="sun"
                  initial={{ rotate: -90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: 90, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  style={{ display: "flex" }}
                >
                  <Sun size={15} strokeWidth={2} />
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>

          <button
            onClick={signOut}
            className="text-xs transition-colors"
            style={{ color: "var(--color-text-faint)" }}
            onMouseEnter={e => (e.currentTarget.style.color = "var(--color-text-muted)")}
            onMouseLeave={e => (e.currentTarget.style.color = "var(--color-text-faint)")}
          >
            Sign out
          </button>
        </div>
      </header>

      {/* Main content — sits above background (z-index via relative positioning) */}
      <main className="relative z-10 flex-1 w-full max-w-2xl mx-auto px-4 py-6 pb-24">
        <Outlet />
      </main>

      {/* Bottom nav */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-20 border-t"
        style={{
          background: "var(--color-surface-float)",
          backdropFilter: "blur(12px)",
          borderColor: "var(--color-border)",
        }}
      >
        <div className="max-w-2xl mx-auto flex">
          {NAV.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                clsx(
                  "flex-1 flex flex-col items-center justify-center gap-1 py-3 transition-colors",
                  isActive
                    ? "text-[var(--color-accent)]"
                    : "text-[var(--color-text-faint)] hover:text-[var(--color-text-muted)]"
                )
              }
            >
              <Icon />
              <span className="text-[10px] font-medium">{label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}

function HomeIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}

function CheckInIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}

function ImproveIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function InsightsIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  );
}

function ReportIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
      <line x1="12" y1="9" x2="12" y2="13"/>
      <line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
  );
}

function AssistantIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4"/>
      <path d="M12 12v8"/>
      <path d="M8 20h8"/>
    </svg>
  );
}

function ScenariosIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2L2 7l10 5 10-5-10-5z"/>
      <path d="M2 17l10 5 10-5"/>
      <path d="M2 12l10 5 10-5"/>
    </svg>
  );
}
