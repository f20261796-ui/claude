"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Custom cursor: a precise dot + a lagging ring that swells into a labelled
 * disc over interactive elements. Add `data-cursor="View"` to any element to label it.
 * Only mounts for fine pointers (desktop).
 */
export default function Cursor() {
  const dot = useRef<HTMLDivElement>(null);
  const ring = useRef<HTMLDivElement>(null);
  const [enabled, setEnabled] = useState(false);
  const [label, setLabel] = useState("");
  const [mode, setMode] = useState<"idle" | "hover" | "label" | "down">("idle");

  useEffect(() => {
    const mq = window.matchMedia("(pointer: fine) and (hover: hover)");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!mq.matches || reduced) return;
    setEnabled(true);
    document.documentElement.classList.add("has-cursor");

    const pos = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    const lag = { ...pos };
    let raf = 0;
    let shown = false;
    const move = (e: PointerEvent) => {
      pos.x = e.clientX;
      pos.y = e.clientY;
      if (!shown) {
        shown = true;
        lag.x = pos.x;
        lag.y = pos.y;
        dot.current?.style.setProperty("opacity", "1");
        ring.current?.style.setProperty("opacity", "1");
      }
      const t = (e.target as HTMLElement | null)?.closest<HTMLElement>("[data-cursor], a, button, input, textarea, select, label, [role=button]");
      if (!t) {
        setMode((m) => (m === "down" ? m : "idle"));
        setLabel("");
      } else if (t.dataset.cursor) {
        setMode("label");
        setLabel(t.dataset.cursor);
      } else if (t.matches("input, textarea, select")) {
        setMode("idle");
        setLabel("");
      } else {
        setMode("hover");
        setLabel("");
      }
    };
    const down = () => ring.current?.style.setProperty("--press", "0.8");
    const up = () => ring.current?.style.setProperty("--press", "1");
    const leave = () => {
      shown = false;
      dot.current?.style.setProperty("opacity", "0");
      ring.current?.style.setProperty("opacity", "0");
    };
    const loop = () => {
      lag.x += (pos.x - lag.x) * 0.16;
      lag.y += (pos.y - lag.y) * 0.16;
      if (dot.current) dot.current.style.transform = `translate3d(${pos.x}px, ${pos.y}px, 0) translate(-50%, -50%)`;
      if (ring.current) ring.current.style.transform = `translate3d(${lag.x}px, ${lag.y}px, 0) translate(-50%, -50%)`;
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("pointerdown", down);
    window.addEventListener("pointerup", up);
    document.addEventListener("pointerleave", leave);
    return () => {
      cancelAnimationFrame(raf);
      document.documentElement.classList.remove("has-cursor");
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerdown", down);
      window.removeEventListener("pointerup", up);
      document.removeEventListener("pointerleave", leave);
    };
  }, []);

  if (!enabled) return null;
  const size = mode === "label" ? 96 : mode === "hover" ? 56 : 34;
  return (
    <>
      <div
        ref={ring}
        aria-hidden
        className="pointer-events-none fixed left-0 top-0 z-[200] opacity-0 transition-opacity duration-300"
      >
        <div
          className="flex items-center justify-center rounded-full border text-center transition-all duration-500 ease-[cubic-bezier(.16,1,.3,1)]"
          style={{
            width: size,
            height: size,
            transform: "scale(var(--press, 1))",
            background: mode === "label" ? "var(--blood)" : mode === "hover" ? "rgba(225,18,27,0.15)" : "transparent",
            borderColor: mode === "idle" ? "rgba(242,237,228,0.55)" : "var(--blood)",
            mixBlendMode: mode === "label" ? "normal" : "difference",
          }}
        >
          <span
            className="label px-2 text-[9px] leading-tight text-bone transition-opacity duration-300"
            style={{ opacity: mode === "label" ? 1 : 0 }}
          >
            {label}
          </span>
        </div>
      </div>
      <div
        ref={dot}
        aria-hidden
        className="pointer-events-none fixed left-0 top-0 z-[201] h-1.5 w-1.5 rounded-full bg-blood opacity-0"
        style={{ opacity: mode === "label" ? 0 : undefined }}
      />
    </>
  );
}
