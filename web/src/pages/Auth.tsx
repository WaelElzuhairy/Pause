import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { motion, AnimatePresence, useMotionValue, useSpring } from "framer-motion";
import { Sun, Moon, Shield, EyeOff, Landmark } from "lucide-react";

// ── Neural mesh background (matches other pages) ──────────────────────────────
function NeuralBackground({ isDark }: { isDark: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animFrame: number;
    let w = (canvas.width = window.innerWidth);
    let h = (canvas.height = window.innerHeight);

    const onResize = () => {
      w = canvas.width = window.innerWidth;
      h = canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", onResize);

    // Nodes
    const NODE_COUNT = 42;
    const nodes = Array.from({ length: NODE_COUNT }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.35,
      vy: (Math.random() - 0.5) * 0.35,
      r: 1.5 + Math.random() * 2.5,
      hue: [200, 260, 170][Math.floor(Math.random() * 3)], // cerulean, violet, teal
    }));

    let mouseX = w / 2;
    let mouseY = h / 2;
    const onMouseMove = (e: MouseEvent) => { mouseX = e.clientX; mouseY = e.clientY; };
    window.addEventListener("mousemove", onMouseMove);

    const CONNECTION_DIST = 130;

    function draw() {
      ctx!.clearRect(0, 0, w, h);

      // Update positions
      for (const n of nodes) {
        n.x += n.vx;
        n.y += n.vy;
        if (n.x < 0 || n.x > w) n.vx *= -1;
        if (n.y < 0 || n.y > h) n.vy *= -1;

        // Gentle mouse attraction
        const dx = mouseX - n.x;
        const dy = mouseY - n.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 200) {
          n.vx += dx * 0.00012;
          n.vy += dy * 0.00012;
        }
        // Dampen
        n.vx *= 0.999;
        n.vy *= 0.999;
      }

      // Draw connections
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i];
          const b = nodes[j];
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < CONNECTION_DIST) {
            const alpha = (1 - d / CONNECTION_DIST) * (isDark ? 0.22 : 0.13);
            ctx!.beginPath();
            ctx!.moveTo(a.x, a.y);
            ctx!.lineTo(b.x, b.y);
            ctx!.strokeStyle = isDark
              ? `hsla(220, 80%, 70%, ${alpha})`
              : `hsla(210, 70%, 50%, ${alpha})`;
            ctx!.lineWidth = 0.8;
            ctx!.stroke();
          }
        }
      }

      // Draw nodes
      for (const n of nodes) {
        ctx!.beginPath();
        ctx!.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        const alpha = isDark ? 0.55 : 0.35;
        ctx!.fillStyle = `hsla(${n.hue}, 75%, 65%, ${alpha})`;
        ctx!.fill();
      }

      animFrame = requestAnimationFrame(draw);
    }

    draw();
    return () => {
      cancelAnimationFrame(animFrame);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("mousemove", onMouseMove);
    };
  }, [isDark]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0"
      style={{ opacity: isDark ? 1 : 0.7 }}
    />
  );
}

// ── SVG Noise Filter ──────────────────────────────────────────────────────────
const NoiseOverlay = () => (
  <svg className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.025] mix-blend-overlay z-0">
    <filter id="auth-noise">
      <feTurbulence type="fractalNoise" baseFrequency="0.75" numOctaves="4" stitchTiles="stitch" />
    </filter>
    <rect width="100%" height="100%" filter="url(#auth-noise)" />
  </svg>
);

// ── AI Orb (matches global neural-orb style) ──────────────────────────────────
const Orb = ({ mouseX, mouseY, isDark }: { mouseX: any; mouseY: any; isDark: boolean }) => {
  const shiftX = useSpring(mouseX, { damping: 50, stiffness: 400 });
  const shiftY = useSpring(mouseY, { damping: 50, stiffness: 400 });

  return (
    <motion.div
      className="relative w-[220px] h-[220px] lg:w-[300px] lg:h-[300px] mb-10 mt-4 lg:mt-0 flex items-center justify-center z-10"
      style={{ x: shiftX, y: shiftY }}
    >
      {/* Orbit Rings */}
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
        className="absolute inset-[-18%] rounded-full"
        style={{ border: "1px solid rgba(58,163,227,0.2)" }}
      />
      <motion.div
        animate={{ rotate: -360 }}
        transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
        className="absolute inset-[-5%] rounded-full"
        style={{ border: "1px solid rgba(139,92,246,0.2)" }}
      />

      {/* Main Orb */}
      <motion.div
        animate={{
          scale: [1, 1.06, 1],
          boxShadow: isDark
            ? [
              "0 0 60px rgba(58,163,227,0.25)",
              "0 0 100px rgba(58,163,227,0.45)",
              "0 0 60px rgba(58,163,227,0.25)",
            ]
            : [
              "0 0 60px rgba(26,133,204,0.2)",
              "0 0 100px rgba(26,133,204,0.38)",
              "0 0 60px rgba(26,133,204,0.2)",
            ],
        }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        className="relative w-[80%] h-[80%] rounded-full overflow-hidden"
      >
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
          className="absolute inset-0"
          style={{
            background: isDark
              ? "conic-gradient(from 180deg at 50% 50%, #1a85cc 0deg, #3aa3e3 90deg, #a78bfa 200deg, #2dd4bf 300deg, #1a85cc 360deg)"
              : "conic-gradient(from 180deg at 50% 50%, #1268a8 0deg, #1a85cc 90deg, #8b5cf6 200deg, #14c49e 300deg, #1268a8 360deg)",
          }}
        />
        {/* Inner glow */}
        <div
          className="absolute inset-0 rounded-full"
          style={{ background: "radial-gradient(circle at 38% 32%, rgba(255,255,255,0.22) 0%, transparent 60%)" }}
        />
        <div className="absolute inset-0 rounded-full shadow-[inset_0_-18px_50px_rgba(0,0,0,0.35)] z-10" />
      </motion.div>

      {/* Floating data nodes around orb */}
      {[0, 60, 120, 180, 240, 300].map((deg, i) => (
        <motion.div
          key={i}
          className="absolute w-2 h-2 rounded-full"
          style={{
            top: `${50 + 47 * Math.sin((deg * Math.PI) / 180)}%`,
            left: `${50 + 47 * Math.cos((deg * Math.PI) / 180)}%`,
            background: i % 3 === 0
              ? "var(--color-accent)"
              : i % 3 === 1
                ? "var(--color-secondary)"
                : "var(--color-tertiary)",
            boxShadow: `0 0 8px currentColor`,
          }}
          animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2 + i * 0.4, repeat: Infinity, delay: i * 0.3 }}
        />
      ))}
    </motion.div>
  );
};

export default function AuthPage() {
  const { user, loading, signInWithGoogle, signInAsGuest } = useAuth();
  const navigate = useNavigate();
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem("pause-theme");
    return saved === "dark" || (!saved && window.matchMedia("(prefers-color-scheme: dark)").matches);
  });

  const rawMouseX = useMotionValue(0);
  const rawMouseY = useMotionValue(0);
  const bgShiftX = useSpring(rawMouseX, { damping: 100, stiffness: 50 });
  const bgShiftY = useSpring(rawMouseY, { damping: 100, stiffness: 50 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      rawMouseX.set((e.clientX / window.innerWidth - 0.5) * -30);
      rawMouseY.set((e.clientY / window.innerHeight - 0.5) * -30);
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [rawMouseX, rawMouseY]);

  useEffect(() => {
    if (!loading && user) navigate("/dashboard", { replace: true });
  }, [user, loading, navigate]);

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("pause-theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("pause-theme", "light");
    }
  }, [isDark]);

  const badges = [
    { icon: <Shield size={13} />, text: "End-to-End Encrypted", color: "var(--color-accent)" },
    { icon: <EyeOff size={13} />, text: "Zero Data Sharing", color: "var(--color-secondary)" },
    { icon: <Landmark size={13} />, text: "Report Ready", color: "var(--color-tertiary)" },
  ];

  return (
    <div
      className="flex min-h-screen w-full overflow-hidden selection:bg-indigo-500/30"
      style={{ background: "var(--color-background)", color: "var(--color-text)", fontFamily: "var(--font-body)" }}
    >
      {/* Interactive neural canvas */}
      <NeuralBackground isDark={isDark} />

      {/* Theme Toggle */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsDark(!isDark)}
        className="fixed top-5 right-5 p-2.5 rounded-xl z-50 transition-all"
        style={{
          background: "var(--color-surface)",
          border: "1px solid var(--color-border)",
          boxShadow: "var(--shadow-card)",
          color: "var(--color-text-muted)",
        }}
        aria-label="Toggle dark mode"
      >
        <AnimatePresence mode="wait">
          {isDark ? (
            <motion.div key="moon" initial={{ rotate: 180, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -180, opacity: 0 }} transition={{ duration: 0.35 }}>
              <Moon size={18} strokeWidth={2} />
            </motion.div>
          ) : (
            <motion.div key="sun" initial={{ rotate: -180, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 180, opacity: 0 }} transition={{ duration: 0.35 }}>
              <Sun size={18} strokeWidth={2} />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>

      {/* ── LEFT PANEL ── */}
      <div className="hidden lg:flex w-1/2 relative flex-col justify-center px-16 xl:px-20 overflow-hidden z-10">
        {/* Ambient blobs */}
        <motion.div
          className="absolute inset-[-10%] z-0"
          style={{ x: bgShiftX, y: bgShiftY }}
        >
          <div
            className="absolute top-[-15%] left-[10%] w-[65%] h-[65%] rounded-full blur-[100px] opacity-25"
            style={{ background: "radial-gradient(ellipse, var(--color-accent) 0%, transparent 70%)" }}
          />
          <div
            className="absolute bottom-[5%] right-[5%] w-[50%] h-[50%] rounded-full blur-[80px] opacity-20"
            style={{ background: "radial-gradient(ellipse, var(--color-secondary) 0%, transparent 70%)" }}
          />
          <div
            className="absolute top-[40%] right-[20%] w-[35%] h-[35%] rounded-full blur-[60px] opacity-15"
            style={{ background: "radial-gradient(ellipse, var(--color-tertiary) 0%, transparent 70%)" }}
          />
        </motion.div>

        {/* Glass panel */}
        <div
          className="relative z-10 flex flex-col items-start max-w-xl"
          style={{
            backdropFilter: "blur(2px)",
          }}
        >
          {/* Word mark watermark */}
          <div
            className="absolute -bottom-8 -left-6 text-[22vw] font-black leading-none pointer-events-none select-none"
            style={{
              color: "transparent",
              WebkitTextStroke: `1px ${isDark ? "rgba(58,163,227,0.04)" : "rgba(26,133,204,0.04)"}`,
              fontFamily: "var(--font-display)",
              zIndex: 0,
            }}
          >
            PAUSE
          </div>

          <div className="relative z-10">
            <Orb mouseX={rawMouseX} mouseY={rawMouseY} isDark={isDark} />

            {/* Eyebrow */}
            <div className="flex items-center gap-3 mb-5">
              <motion.div
                initial={{ width: 0 }} animate={{ width: 28 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                style={{ height: "2px", background: "var(--color-accent)", borderRadius: "99px" }}
              />
              <span
                className="text-[10px] font-bold tracking-[0.22em] uppercase"
                style={{ color: "var(--color-accent)" }}
              >
                Digital Sanctuary
              </span>
            </div>

            <h1
              className="text-6xl xl:text-7xl font-bold mb-1 tracking-tight pb-2"
              style={{
                fontFamily: "var(--font-display)",
                background: "linear-gradient(135deg, var(--color-accent), var(--color-secondary), var(--color-tertiary))",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              Pause
            </h1>
            <h2
              className="text-3xl xl:text-4xl font-extrabold mb-6 tracking-tight"
              style={{ fontFamily: "var(--font-display)", color: "var(--color-text)" }}
            >
              before you react.
            </h2>
            <p
              className="max-w-md text-base leading-relaxed mb-10 font-medium"
              style={{ color: "var(--color-text-muted)" }}
            >
              Reflect on your emotions, refine your words, and communicate with clarity.
              Your private AI companion for mindful messaging.
            </p>

            {/* Badges */}
            <div className="flex flex-wrap gap-3">
              {badges.map((badge, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.3 + i * 0.12 }}
                  className="flex items-center gap-2 px-3.5 py-2 rounded-full"
                  style={{
                    background: "var(--color-surface-float)",
                    border: "1px solid var(--color-border)",
                    backdropFilter: "blur(12px)",
                    color: badge.color,
                  }}
                >
                  {badge.icon}
                  <span
                    className="text-[12px] font-bold"
                    style={{ color: "var(--color-text-muted)" }}
                  >
                    {badge.text}
                  </span>
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        {/* Vertical divider */}
        <div
          className="absolute right-0 top-[15%] bottom-[15%] w-px"
          style={{ background: "linear-gradient(to bottom, transparent, var(--color-border), transparent)" }}
        />
      </div>

      {/* ── RIGHT PANEL — Auth Form ── */}
      <div
        className="w-full lg:w-1/2 flex flex-col items-center justify-center p-8 lg:p-20 relative z-10"
      >
        <NoiseOverlay />

        {/* Subtle glow */}
        <div
          className="absolute top-0 right-0 w-[70%] h-[50%] pointer-events-none"
          style={{
            background: "radial-gradient(ellipse at top right, var(--color-accent-glow) 0%, transparent 70%)",
            opacity: 0.35,
          }}
        />
        <div
          className="absolute bottom-0 left-0 w-[50%] h-[40%] pointer-events-none"
          style={{
            background: "radial-gradient(ellipse at bottom left, var(--color-secondary-glow) 0%, transparent 70%)",
            opacity: 0.25,
          }}
        />

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-[420px] relative"
        >
          {/* Mobile header */}
          <div className="lg:hidden flex flex-col items-center text-center mb-10 mt-10">
            <motion.div
              animate={{
                scale: [1, 1.04, 1],
                boxShadow: [
                  "0 0 30px var(--color-accent-glow)",
                  "0 0 60px var(--color-accent-glow)",
                  "0 0 30px var(--color-accent-glow)",
                ],
              }}
              transition={{ duration: 3.5, repeat: Infinity }}
              className="w-20 h-20 mb-6 rounded-full overflow-hidden"
            >
              <div
                className="w-full h-full"
                style={{
                  background: "conic-gradient(from 180deg at 50% 50%, var(--color-accent) 0deg, var(--color-secondary) 200deg, var(--color-tertiary) 320deg, var(--color-accent) 360deg)",
                }}
              />
            </motion.div>
            <h1
              className="text-4xl font-bold mb-1"
              style={{
                fontFamily: "var(--font-display)",
                background: "linear-gradient(135deg, var(--color-accent), var(--color-secondary))",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              Pause
            </h1>
            <p style={{ color: "var(--color-text-muted)", fontFamily: "var(--font-display)", fontWeight: 800 }}>
              before you react.
            </p>
          </div>

          {/* Card */}
          <div
            className="rounded-3xl p-8 relative overflow-hidden"
            style={{
              background: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              boxShadow: "var(--shadow-elevated)",
            }}
          >
            {/* Card top gradient line */}
            <div
              className="absolute top-0 left-0 right-0 h-[2px]"
              style={{
                background: "linear-gradient(90deg, var(--color-accent), var(--color-secondary), var(--color-tertiary))",
              }}
            />

            {/* Scan line animation */}
            <div className="scan-container absolute inset-0 pointer-events-none" style={{ opacity: 0.3 }}>
              <div className="scan-line" />
            </div>

            <div className="mb-8">
              <h2
                className="text-3xl font-bold mb-2 tracking-tight"
                style={{ fontFamily: "var(--font-display)", color: "var(--color-text)" }}
              >
                Welcome back
              </h2>
              <p style={{ color: "var(--color-text-muted)", fontSize: "15px" }}>
                Sign in to your safe space
              </p>
            </div>

            <div className="space-y-4">
              {/* Google Button */}
              <motion.button
                whileHover={{ scale: 1.015, y: -1 }}
                whileTap={{ scale: 0.98 }}
                onClick={signInWithGoogle}
                className="group relative overflow-hidden w-full flex items-center justify-center gap-3 px-4 py-3.5 rounded-2xl font-bold text-[15px] transition-all"
                style={{
                  background: "var(--color-surface-raised)",
                  border: "1.5px solid var(--color-border)",
                  color: "var(--color-text)",
                  boxShadow: "var(--shadow-sm)",
                }}
              >
                <div
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  style={{
                    background: "linear-gradient(135deg, var(--color-accent-glow) 0%, transparent 60%)",
                  }}
                />
                <GoogleIcon />
                <span className="relative z-10">Continue with Google</span>
              </motion.button>

              {/* Divider */}
              <div className="flex items-center gap-3 py-2">
                <div className="flex-1 h-px" style={{ background: "var(--color-border)" }} />
                <span
                  className="text-[11px] font-bold tracking-[0.18em] uppercase"
                  style={{ color: "var(--color-text-faint)" }}
                >
                  or
                </span>
                <div className="flex-1 h-px" style={{ background: "var(--color-border)" }} />
              </div>

              {/* Guest Button */}
              <motion.button
                whileHover={{ scale: 1.015, y: -1 }}
                whileTap={{ scale: 0.98 }}
                onClick={signInAsGuest}
                className="group relative overflow-hidden w-full px-4 py-3.5 rounded-2xl font-bold text-[15px] transition-all"
                style={{
                  background: "linear-gradient(135deg, var(--color-accent), var(--color-secondary))",
                  color: "white",
                  boxShadow: "0 4px 20px var(--color-accent-glow)",
                }}
              >
                <div
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  style={{ background: "rgba(255,255,255,0.12)" }}
                />
                <span className="relative z-10">Continue as Guest</span>
              </motion.button>
            </div>

            <p
              className="text-center text-[12px] mt-6 leading-relaxed"
              style={{ color: "var(--color-text-faint)" }}
            >
              Guest sessions are private &amp; encrypted. Link Google later to save progress.
            </p>

            {/* Feature row */}
            <div
              className="grid grid-cols-3 gap-2 mt-7 pt-7"
              style={{ borderTop: "1px solid var(--color-border)" }}
            >
              {[
                { icon: <Shield size={16} />, label: "Encrypted", color: "var(--color-accent)" },
                { icon: <EyeOff size={16} />, label: "Private", color: "var(--color-secondary)" },
                { icon: <Landmark size={16} />, label: "Legal-Ready", color: "var(--color-tertiary)" },
              ].map((f, i) => (
                <div key={i} className="flex flex-col items-center gap-2">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center"
                    style={{
                      background: "var(--color-surface-raised)",
                      border: "1px solid var(--color-border)",
                      color: f.color,
                    }}
                  >
                    {f.icon}
                  </div>
                  <span
                    className="text-[11px] font-bold"
                    style={{ color: "var(--color-text-faint)" }}
                  >
                    {f.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Neural activity indicator */}
          <div className="flex items-center justify-center gap-2 mt-5">
            <div
              className="w-1.5 h-1.5 rounded-full animate-pulse"
              style={{ background: "var(--color-tertiary)", boxShadow: "0 0 6px var(--color-tertiary-glow)" }}
            />
            <span
              className="text-[11px] font-bold tracking-wider uppercase"
              style={{ color: "var(--color-text-faint)" }}
            >
              Neural encryption active
            </span>
          </div>
        </motion.div>

        {/* Footer disclaimer */}
        <p
          className="absolute bottom-5 text-center text-[11px] max-w-sm px-6 font-medium"
          style={{ color: "var(--color-text-faint)" }}
        >
          Not a substitute for professional support. If in crisis, please contact your campus counselor or a trusted adult.
        </p>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4" />
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z" fill="#34A853" />
      <path d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332z" fill="#FBBC05" />
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.962L3.964 7.294C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335" />
    </svg>
  );
}