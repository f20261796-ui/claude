"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "motion/react";

type Phase = "idle" | "cover" | "reveal";
const Ctx = createContext<{ go: (href: string) => void }>({ go: () => {} });
export const useTransitionNav = () => useContext(Ctx);

const COLS = 9;
const EASE = [0.83, 0, 0.17, 1] as const;

/**
 * Route transitions: crimson columns rise and cover the screen (like ink
 * dripping in reverse), the route changes underneath, then columns fall away.
 */
export function TransitionProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [phase, setPhase] = useState<Phase>("idle");
  const [label, setLabel] = useState("");
  const pending = useRef<string | null>(null);
  const reduced = useRef(false);

  useEffect(() => {
    reduced.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  const go = useCallback(
    (href: string) => {
      const url = new URL(href, window.location.href);
      if (url.pathname === window.location.pathname) {
        router.push(href);
        return;
      }
      if (reduced.current) {
        router.push(href);
        return;
      }
      router.prefetch(href);
      pending.current = href;
      setLabel(url.pathname === "/" ? "Home" : url.pathname.split("/").filter(Boolean)[0] ?? "");
      setPhase("cover");
    },
    [router],
  );

  useEffect(() => {
    if (phase === "cover") {
      const id = window.setTimeout(() => router.push(pending.current!), 720);
      return () => window.clearTimeout(id);
    }
  }, [phase, router]);

  useEffect(() => {
    if (pending.current && phase === "cover") {
      pending.current = null;
      const id = window.setTimeout(() => setPhase("reveal"), 120);
      return () => window.clearTimeout(id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  return (
    <Ctx.Provider value={{ go }}>
      {children}
      {phase !== "idle" && (
        <div aria-hidden className="pointer-events-none fixed inset-0 z-[150] flex">
          {Array.from({ length: COLS }).map((_, i) => {
            const d = Math.abs(i - (COLS - 1) / 2) * 0.035 + (i % 2) * 0.02;
            return (
              <motion.div
                key={i}
                className="relative h-full flex-1 bg-blood"
                style={{ marginLeft: -1 }}
                initial={{ y: "101%" }}
                animate={phase === "cover" ? { y: "0%" } : { y: "-101%" }}
                transition={{ duration: 0.65, ease: EASE, delay: d }}
                onAnimationComplete={() => {
                  if (phase === "reveal" && i === 0) setPhase("idle");
                }}
              >
                <div className="streaks absolute inset-0 opacity-60" />
                <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-blood-deep to-transparent" />
              </motion.div>
            );
          })}
          <motion.div
            className="absolute inset-0 flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: phase === "cover" ? 1 : 0 }}
            transition={{ duration: 0.3, delay: phase === "cover" ? 0.35 : 0 }}
          >
            <span className="display text-[14vw] text-ink md:text-[8vw]">{label || "IDENTITY."}</span>
          </motion.div>
        </div>
      )}
    </Ctx.Provider>
  );
}

/** Drop-in <Link> that plays the transition. */
export function TLink({
  href,
  children,
  onClick,
  ...rest
}: React.ComponentProps<typeof Link> & { href: string }) {
  const { go } = useTransitionNav();
  return (
    <Link
      href={href}
      {...rest}
      onClick={(e) => {
        onClick?.(e);
        if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0 || rest.target === "_blank") return;
        if (href.startsWith("#") || href.startsWith("http")) return;
        e.preventDefault();
        go(href);
      }}
    >
      {children}
    </Link>
  );
}
