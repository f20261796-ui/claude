"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useLenis } from "./SmoothScroll";

const COLS = 14;
const EASE = [0.83, 0, 0.17, 1] as const;

/**
 * First-visit intro: counter + wordmark, then the screen melts away in
 * vertical columns. Plays once per browser session.
 */
export default function Loader({ onDone }: { onDone?: () => void }) {
  const [show, setShow] = useState(true);
  const [count, setCount] = useState(0);
  const [exiting, setExiting] = useState(false);
  const lenis = useLenis();

  useEffect(() => {
    let seen = false;
    try {
      seen = sessionStorage.getItem("identity-intro") === "1";
    } catch {}
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (seen || reduced) {
      setShow(false);
      onDone?.();
      return;
    }
    try {
      sessionStorage.setItem("identity-intro", "1");
    } catch {}
    document.documentElement.style.overflow = "hidden";
    const start = performance.now();
    const dur = 1900;
    let raf = 0;
    const tick = () => {
      const p = Math.min(1, (performance.now() - start) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      setCount(Math.round(eased * 100));
      if (p < 1) raf = requestAnimationFrame(tick);
      else
        setTimeout(() => {
          setExiting(true);
          setTimeout(() => {
            setShow(false);
            document.documentElement.style.overflow = "";
            onDone?.();
          }, 1250);
        }, 250);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      document.documentElement.style.overflow = "";
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (show) lenis?.stop();
    else lenis?.start();
  }, [show, lenis]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key="loader"
          className="fixed inset-0 z-[300] overflow-hidden"
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          aria-label="Loading"
          role="status"
        >
          {/* melting columns */}
          <div className="absolute inset-0 flex">
            {Array.from({ length: COLS }).map((_, i) => {
              const rnd = ((i * 7919) % 13) / 13;
              return (
                <motion.div
                  key={i}
                  className="relative h-full flex-1 bg-ink"
                  style={{ marginLeft: -1 }}
                  animate={exiting ? { y: "105%", scaleY: 1.6 } : { y: "0%", scaleY: 1 }}
                  transition={{ duration: 0.9 + rnd * 0.35, ease: EASE, delay: rnd * 0.25 }}
                >
                  <motion.div
                    className="absolute inset-x-0 top-0 bg-blood"
                    initial={{ height: "0%" }}
                    animate={{ height: exiting ? "100%" : `${Math.max(0, count - 60 - rnd * 30) * 2.2}%` }}
                    transition={{ duration: exiting ? 0.5 : 0.2, ease: "easeOut" }}
                  />
                  <div className="streaks absolute inset-0 opacity-40" />
                </motion.div>
              );
            })}
          </div>

          <motion.div
            className="relative flex h-full flex-col justify-between p-5 md:p-10"
            animate={exiting ? { opacity: 0, y: -40 } : { opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: EASE }}
          >
            <div className="flex items-start justify-between">
              <span className="label text-ash">Studio for digital identities</span>
              <span className="label text-ash">Est. 2026</span>
            </div>
            <div className="overflow-hidden">
              <motion.div
                className="display flex text-[22vw] text-bone md:text-[15vw]"
                initial="hidden"
                animate="show"
                variants={{ show: { transition: { staggerChildren: 0.06, delayChildren: 0.15 } } }}
              >
                {"IDENTITY.".split("").map((c, i) => (
                  <motion.span
                    key={i}
                    className={c === "." ? "text-blood" : ""}
                    variants={{ hidden: { y: "110%" }, show: { y: "0%", transition: { duration: 0.9, ease: [0.16, 1, 0.3, 1] } } }}
                  >
                    {c}
                  </motion.span>
                ))}
              </motion.div>
            </div>
            <div className="flex items-end justify-between">
              <span className="editorial max-w-[14ch] text-lg text-bone-dim md:text-2xl">Your story is loading…</span>
              <span className="font-mono text-6xl font-light tabular-nums text-bone md:text-8xl">
                {String(count).padStart(3, "0")}
              </span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
