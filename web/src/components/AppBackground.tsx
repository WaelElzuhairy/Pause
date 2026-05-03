/**
 * AppBackground
 * Drop this component once inside your root App layout (outside the router pages).
 * It renders a live neural-network canvas + ambient blob layers behind every page.
 * It reads the current dark-mode class from <html> and re-syncs automatically.
 */
import { useEffect, useRef, useState } from "react";

function useIsDark() {
    const [dark, setDark] = useState(() =>
        document.documentElement.classList.contains("dark")
    );

    useEffect(() => {
        const obs = new MutationObserver(() => {
            setDark(document.documentElement.classList.contains("dark"));
        });
        obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
        return () => obs.disconnect();
    }, []);

    return dark;
}

export default function AppBackground() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const isDark = useIsDark();

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

        // Psycho-scientific palette: cerulean (200°), violet (260°), teal (170°)
        const HUE_PALETTE = [200, 260, 170, 215, 240];

        const NODE_COUNT = 55;
        const nodes = Array.from({ length: NODE_COUNT }, () => ({
            x: Math.random() * w,
            y: Math.random() * h,
            vx: (Math.random() - 0.5) * 0.28,
            vy: (Math.random() - 0.5) * 0.28,
            r: 1.2 + Math.random() * 2.2,
            hue: HUE_PALETTE[Math.floor(Math.random() * HUE_PALETTE.length)],
            phase: Math.random() * Math.PI * 2,
        }));

        let mouseX = w * 0.5;
        let mouseY = h * 0.4;
        const onMouseMove = (e: MouseEvent) => {
            mouseX = e.clientX;
            mouseY = e.clientY;
        };
        window.addEventListener("mousemove", onMouseMove);

        const CONNECTION_DIST = 140;
        let t = 0;

        function draw() {
            t += 0.003;
            ctx!.clearRect(0, 0, w, h);

            // Update node positions
            for (const n of nodes) {
                // Gentle sinusoidal breathing
                n.x += n.vx + Math.sin(t + n.phase) * 0.08;
                n.y += n.vy + Math.cos(t + n.phase * 1.3) * 0.06;

                // Wrap around edges softly
                if (n.x < -20) n.x = w + 20;
                if (n.x > w + 20) n.x = -20;
                if (n.y < -20) n.y = h + 20;
                if (n.y > h + 20) n.y = -20;

                // Subtle mouse repulsion
                const dx = n.x - mouseX;
                const dy = n.y - mouseY;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 160) {
                    const force = (160 - dist) / 160;
                    n.vx += (dx / dist) * force * 0.015;
                    n.vy += (dy / dist) * force * 0.015;
                }

                // Velocity damping
                n.vx *= 0.996;
                n.vy *= 0.996;

                // Speed clamp
                const speed = Math.sqrt(n.vx * n.vx + n.vy * n.vy);
                if (speed > 0.8) { n.vx *= 0.8 / speed; n.vy *= 0.8 / speed; }
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
                        const t_ratio = 1 - d / CONNECTION_DIST;
                        const alpha = t_ratio * t_ratio * (isDark ? 0.28 : 0.14);
                        const hue = (a.hue + b.hue) / 2;
                        ctx!.beginPath();
                        ctx!.moveTo(a.x, a.y);
                        ctx!.lineTo(b.x, b.y);
                        ctx!.strokeStyle = `hsla(${hue}, 70%, ${isDark ? 65 : 45}%, ${alpha})`;
                        ctx!.lineWidth = t_ratio * (isDark ? 1.2 : 0.8);
                        ctx!.stroke();
                    }
                }
            }

            // Draw nodes
            for (const n of nodes) {
                const pulse = 0.7 + 0.3 * Math.sin(t * 2 + n.phase);
                const alpha = pulse * (isDark ? 0.6 : 0.38);
                ctx!.beginPath();
                ctx!.arc(n.x, n.y, n.r * pulse, 0, Math.PI * 2);
                ctx!.fillStyle = `hsla(${n.hue}, 72%, ${isDark ? 68 : 50}%, ${alpha})`;
                ctx!.fill();

                // Node glow halo
                const grd = ctx!.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.r * 4);
                grd.addColorStop(0, `hsla(${n.hue}, 72%, 65%, ${alpha * 0.4})`);
                grd.addColorStop(1, `hsla(${n.hue}, 72%, 65%, 0)`);
                ctx!.beginPath();
                ctx!.arc(n.x, n.y, n.r * 4, 0, Math.PI * 2);
                ctx!.fillStyle = grd;
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
        <>
            {/* Neural canvas */}
            <canvas
                ref={canvasRef}
                id="neural-bg-canvas"
                style={{
                    position: "fixed",
                    inset: 0,
                    pointerEvents: "none",
                    zIndex: 0,
                    opacity: isDark ? 0.95 : 0.7,
                    transition: "opacity 0.6s ease",
                }}
            />

            {/* Ambient blob layer */}
            <div className="ambient-layer" aria-hidden="true">
                <div className="ambient-blob ambient-blob-1" />
                <div className="ambient-blob ambient-blob-2" />
                <div className="ambient-blob ambient-blob-3" />
            </div>

            {/* Subtle perspective grid */}
            <div className="page-grid-overlay" aria-hidden="true" />

            {/* Corner glows */}
            <div className="corner-glow-tl" aria-hidden="true" />
            <div className="corner-glow-br" aria-hidden="true" />

            {/* Top and bottom mesh bands */}
            <div className="mesh-band mesh-band-top" aria-hidden="true" />
            <div className="mesh-band mesh-band-bottom" aria-hidden="true" />

            {/* Edge vignette */}
            <div className="page-vignette" aria-hidden="true" />
        </>
    );
}