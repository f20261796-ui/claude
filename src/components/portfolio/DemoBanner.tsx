"use client";

import { motion } from "motion/react";
import { TLink } from "@/components/motion/PageTransition";

export default function DemoBanner() {
  return (
    <motion.div
      className="fixed bottom-4 left-1/2 z-[60] w-[calc(100%-2rem)] max-w-md -translate-x-1/2"
      initial={{ y: 120, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 1.8, duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="flex items-center gap-3 rounded-full border border-bone/15 bg-ink/90 p-1.5 pl-5 text-bone shadow-2xl backdrop-blur-xl">
        <span className="label truncate text-[10px] text-bone/70">Sample portfolio · fictional</span>
        <TLink
          href="/create"
          data-cursor="Begin"
          className="ml-auto shrink-0 rounded-full bg-blood px-5 py-3 font-display text-xs font-bold uppercase"
        >
          Make mine
        </TLink>
      </div>
    </motion.div>
  );
}
