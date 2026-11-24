"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { LogoLink, Wordmark } from "./Logo";
import { TLink } from "@/components/motion/PageTransition";
import { useLenis } from "@/components/motion/SmoothScroll";
import { siteConfig } from "@/lib/config";

const LINKS = [
  { href: "/#process", label: "Process" },
  { href: "/#work", label: "Examples" },
  { href: "/#included", label: "Included" },
  { href: "/#pricing", label: "Pricing" },
  { href: "/#faq", label: "FAQ" },
];

const EASE = [0.16, 1, 0.3, 1] as const;

export default function Nav() {
  const [open, setOpen] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const lenis = useLenis();

  useEffect(() => {
    let last = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      setScrolled(y > 40);
      setHidden(y > 300 && y > last + 2);
      if (y < last - 2) setHidden(false);
      last = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (open) lenis?.stop();
    else lenis?.start();
    document.documentElement.style.overflow = open ? "hidden" : "";
  }, [open, lenis]);

  const jump = (href: string) => (e: React.MouseEvent) => {
    const id = href.split("#")[1];
    const el = id && document.getElementById(id);
    if (el && window.location.pathname === "/") {
      e.preventDefault();
      setOpen(false);
      if (lenis) lenis.scrollTo(el, { offset: -20, duration: 1.6 });
      else el.scrollIntoView({ behavior: "smooth" });
    } else setOpen(false);
  };

  return (
    <>
      <motion.header
        className="fixed inset-x-0 top-0 z-[100] px-4 pt-4 md:px-8 md:pt-6"
        animate={{ y: hidden && !open ? -110 : 0 }}
        transition={{ duration: 0.6, ease: EASE }}
      >
        <div className="flex items-center justify-between">
          <div className={`rounded-full px-1 transition-colors duration-500 ${scrolled ? "mix-blend-difference" : ""}`}>
            <LogoLink />
          </div>

          <nav className="hidden items-center gap-1 rounded-full border border-bone/10 bg-ink/50 p-1.5 backdrop-blur-xl md:flex">
            {LINKS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={jump(l.href)}
                className="label group relative overflow-hidden rounded-full px-4 py-2.5 text-bone/80 transition-colors hover:text-bone"
              >
                <span className="absolute inset-0 scale-50 rounded-full bg-bone/10 opacity-0 transition-all duration-500 group-hover:scale-100 group-hover:opacity-100" />
                <span className="relative">{l.label}</span>
              </a>
            ))}
            <TLink
              href="/create"
              data-cursor="Begin"
              className="label ml-1 flex items-center gap-2 rounded-full bg-blood px-5 py-2.5 font-bold text-bone transition-transform hover:scale-[1.04]"
            >
              Create — ₹{siteConfig.price}
            </TLink>
          </nav>

          <button
            onClick={() => setOpen((o) => !o)}
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            className="relative z-[120] flex h-12 w-12 items-center justify-center rounded-full bg-bone text-ink md:hidden"
          >
            <span className="relative block h-3 w-5">
              <span
                className={`absolute left-0 h-[2px] w-full bg-current transition-all duration-500 ${open ? "top-1/2 -translate-y-1/2 rotate-45" : "top-0"}`}
              />
              <span
                className={`absolute left-0 h-[2px] w-full bg-current transition-all duration-500 ${open ? "top-1/2 -translate-y-1/2 -rotate-45" : "bottom-0"}`}
              />
            </span>
          </button>
        </div>
      </motion.header>

      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-[110] flex flex-col justify-between overflow-hidden bg-blood px-5 pb-8 pt-24 md:hidden"
            initial={{ clipPath: "circle(0% at calc(100% - 40px) 40px)" }}
            animate={{ clipPath: "circle(150% at calc(100% - 40px) 40px)" }}
            exit={{ clipPath: "circle(0% at calc(100% - 40px) 40px)" }}
            transition={{ duration: 0.8, ease: [0.83, 0, 0.17, 1] }}
          >
            <div className="streaks pointer-events-none absolute inset-0 opacity-30" />
            <nav className="relative flex flex-col">
              {[...LINKS, { href: "/create", label: "Create yours" }].map((l, i) => (
                <div key={l.href} className="overflow-hidden border-b border-ink/20">
                  <motion.a
                    href={l.href}
                    onClick={l.href === "/create" ? () => setOpen(false) : jump(l.href)}
                    className="display flex items-center justify-between py-3 text-[13vw] text-ink"
                    initial={{ y: "100%" }}
                    animate={{ y: "0%" }}
                    transition={{ duration: 0.8, ease: EASE, delay: 0.25 + i * 0.05 }}
                  >
                    {l.label}
                    <span className="font-mono text-xs tracking-widest">0{i + 1}</span>
                  </motion.a>
                </div>
              ))}
            </nav>
            <motion.div
              className="relative flex items-end justify-between text-ink"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
            >
              <Wordmark className="text-3xl" />
              <span className="label">₹{siteConfig.price} only</span>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
