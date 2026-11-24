"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { motion, useMotionValue, useScroll, useSpring, useTransform } from "motion/react";
import Button from "@/components/brand/Button";
import { siteConfig } from "@/lib/config";

const InkField = dynamic(() => import("@/components/gl/InkField"), { ssr: false });

const EASE = [0.16, 1, 0.3, 1] as const;

function SpinningBadge() {
  const text = `₹${siteConfig.price} ONLY • ONE-TIME • ₹${siteConfig.price} ONLY • YOURS • `;
  return (
    <div className="relative h-28 w-28 md:h-36 md:w-36" aria-label={`₹${siteConfig.price} only`}>
      <svg viewBox="0 0 200 200" className="absolute inset-0 h-full w-full animate-[spin_14s_linear_infinite]" aria-hidden>
        <defs>
          <path id="badge-circle" d="M100,100 m-78,0 a78,78 0 1,1 156,0 a78,78 0 1,1 -156,0" />
        </defs>
        <text className="fill-bone font-mono text-[15px] tracking-[0.28em]">
          <textPath href="#badge-circle">{text}</textPath>
        </text>
      </svg>
      <div className="absolute inset-[26%] flex flex-col items-center justify-center rounded-full bg-blood text-bone">
        <span className="font-display text-2xl font-bold leading-none md:text-3xl">₹{siteConfig.price}</span>
        <span className="label mt-1 text-[8px]">only</span>
      </div>
    </div>
  );
}

/** Floating device that previews a real demo portfolio. Tilts toward the pointer. */
function DevicePreview({ started }: { started: boolean }) {
  const rx = useMotionValue(0);
  const ry = useMotionValue(0);
  const srx = useSpring(rx, { stiffness: 80, damping: 15 });
  const sry = useSpring(ry, { stiffness: 80, damping: 15 });

  useEffect(() => {
    const move = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      ry.set((e.clientX / window.innerWidth - 0.5) * 16);
      rx.set(-(e.clientY / window.innerHeight - 0.5) * 12);
    };
    window.addEventListener("pointermove", move, { passive: true });
    return () => window.removeEventListener("pointermove", move);
  }, [rx, ry]);

  return (
    <motion.div
      className="relative [perspective:1200px]"
      initial={{ opacity: 0, y: 120, rotate: 8 }}
      animate={started ? { opacity: 1, y: 0, rotate: -6 } : {}}
      transition={{ duration: 1.6, ease: EASE, delay: 0.5 }}
    >
      <motion.div style={{ rotateX: srx, rotateY: sry }} className="relative [transform-style:preserve-3d]">
        <div className="relative w-[46vw] max-w-[270px] overflow-hidden rounded-[2.2rem] border border-bone/15 bg-ink p-2 shadow-[0_60px_120px_-30px_rgba(225,18,27,0.55)] md:w-[16vw] md:max-w-[260px]">
          <div className="relative aspect-[9/19] overflow-hidden rounded-[1.7rem] bg-ink-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/demos/aarav-mehta-mobile.jpg"
              alt="Preview of a portfolio built with IDENTITY."
              className="absolute inset-x-0 top-0 w-full animate-[heroScroll_16s_ease-in-out_infinite_alternate]"
            />
            <div className="absolute left-1/2 top-2 h-5 w-20 -translate-x-1/2 rounded-full bg-ink" />
          </div>
        </div>
        <div
          className="absolute -right-6 top-10 rounded-full bg-bone px-3 py-2 font-mono text-[10px] uppercase tracking-widest text-ink shadow-xl md:-right-16"
          style={{ transform: "translateZ(60px)" }}
        >
          /p/your-name
        </div>
        <div
          className="absolute -left-8 bottom-16 flex items-center gap-2 rounded-full border border-bone/20 bg-ink/80 px-3 py-2 backdrop-blur md:-left-20"
          style={{ transform: "translateZ(90px)" }}
        >
          <span className="h-2 w-2 animate-pulse rounded-full bg-blood" />
          <span className="label text-[9px] text-bone">Live portfolio</span>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function Hero({ started }: { started: boolean }) {
  const section = useRef<HTMLElement>(null);
  const melt = useRef(0);
  const { scrollYProgress } = useScroll({ target: section, offset: ["start start", "end start"] });
  const [reduced, setReduced] = useState(false);
  useEffect(() => setReduced(window.matchMedia("(prefers-reduced-motion: reduce)").matches), []);

  useEffect(() => scrollYProgress.on("change", (v) => (melt.current = Math.min(1.4, v * 1.8))), [scrollYProgress]);

  const y1 = useTransform(scrollYProgress, [0, 1], ["0%", reduced ? "0%" : "-60%"]);
  const y2 = useTransform(scrollYProgress, [0, 1], ["0%", reduced ? "0%" : "-25%"]);
  const x3 = useTransform(scrollYProgress, [0, 1], ["0%", reduced ? "0%" : "18%"]);
  const deviceY = useTransform(scrollYProgress, [0, 1], ["0%", reduced ? "0%" : "-40%"]);
  const fade = useTransform(scrollYProgress, [0, 0.6], [1, 0]);

  const line = (delay: number) => ({
    initial: { y: "115%", rotate: 3 },
    animate: started ? { y: "0%", rotate: 0 } : {},
    transition: { duration: 1.3, ease: EASE, delay },
  });

  return (
    <section ref={section} className="relative h-[150svh]" aria-label="Introduction">
      <div className="sticky top-0 h-[100svh] overflow-hidden">
        <motion.div
          className="absolute inset-0"
          initial={{ opacity: 0, scale: 1.15 }}
          animate={started ? { opacity: 1, scale: 1 } : {}}
          transition={{ duration: 2.2, ease: EASE }}
        >
          <InkField melt={melt} />
        </motion.div>
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-ink/85 via-ink/30 to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-ink to-transparent" />

        <motion.div
          style={{ y: deviceY }}
          className="pointer-events-none absolute right-[3vw] top-[13vh] z-0 hidden lg:block"
        >
          <DevicePreview started={started} />
        </motion.div>

        <div className="relative flex h-full flex-col justify-between px-4 pb-6 pt-24 md:px-10 md:pb-10 md:pt-32">
          <motion.div
            className="flex items-start justify-between"
            initial={{ opacity: 0 }}
            animate={started ? { opacity: 1 } : {}}
            transition={{ delay: 1.2, duration: 1 }}
          >
            <p className="label max-w-[22ch] text-bone/70">
              <span className="text-blood">(01)</span> Personal portfolio websites, crafted for you
            </p>

          </motion.div>

          <div className="relative grid items-end gap-6 md:grid-cols-12">
            <h1 className="display relative z-10 text-[15.5vw] text-bone md:col-span-9 md:text-[10.4vw] lg:text-[9.2vw]">
              <motion.span style={{ y: y1 }} className="block overflow-hidden pb-[0.04em]">
                <motion.span className="block" {...line(0.15)}>
                  Your story<span className="text-blood">.</span>
                </motion.span>
              </motion.span>
              <motion.span style={{ y: y2 }} className="block overflow-hidden pb-[0.04em]">
                <motion.span className="block" {...line(0.27)}>
                  <span className="editorial normal-case tracking-[-0.04em] text-blood">your</span>{" "}
                  <span className="outline-text-bone">space.</span>
                </motion.span>
              </motion.span>
              <motion.span style={{ x: x3 }} className="block overflow-hidden pb-[0.04em]">
                <motion.span className="block" {...line(0.39)}>
                  Your website<span className="text-blood">.</span>
                </motion.span>
              </motion.span>
            </h1>

          </div>

          <motion.div style={{ opacity: fade }} className="grid items-end gap-6 md:grid-cols-12">
            <motion.p
              className="max-w-md text-base leading-relaxed text-bone/80 md:col-span-4 md:text-lg"
              initial={{ opacity: 0, y: 20 }}
              animate={started ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 1, ease: EASE, delay: 0.8 }}
            >
              Your own professional portfolio. <span className="editorial text-bone">Designed around you.</span> Built to
              make an impression.
            </motion.p>
            <motion.div
              className="flex flex-wrap items-center gap-4 md:col-span-5 md:col-start-6"
              initial={{ opacity: 0, y: 30 }}
              animate={started ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 1, ease: EASE, delay: 1 }}
            >
              <Button href="/create" size="xl" cursor="Begin">
                Create my portfolio
              </Button>
            </motion.div>
            <motion.div
              className="absolute right-4 top-[22svh] md:static md:col-span-2 md:col-start-11 md:flex md:justify-end"
              initial={{ opacity: 0, scale: 0.6 }}
              animate={started ? { opacity: 1, scale: 1 } : {}}
              transition={{ duration: 1.2, ease: EASE, delay: 1.1 }}
            >
              <SpinningBadge />
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
