import type { DesignStyle } from "@/lib/schema";

export type Theme = {
  bg: string;
  fg: string;
  muted: string;
  card: string;
  line: string;
  /** class for the name / big headings */
  display: string;
  /** class for section headings */
  heading: string;
  label: string;
  radius: string;
  grain: boolean;
  grid: boolean;
};

export const THEMES: Record<DesignStyle, Theme> = {
  cinematic: {
    bg: "#070606",
    fg: "#f2ede4",
    muted: "rgba(242,237,228,0.62)",
    card: "#110e0e",
    line: "rgba(242,237,228,0.12)",
    display: "font-serif italic font-medium tracking-[-0.04em] leading-[0.85]",
    heading: "font-display font-bold uppercase tracking-[-0.045em] leading-[0.88]",
    label: "font-mono text-[11px] uppercase tracking-[0.2em]",
    radius: "rounded-none",
    grain: true,
    grid: false,
  },
  minimalist: {
    bg: "#f4f2ee",
    fg: "#121212",
    muted: "rgba(18,18,18,0.58)",
    card: "#ffffff",
    line: "rgba(18,18,18,0.12)",
    display: "font-sans font-semibold tracking-[-0.055em] leading-[0.9]",
    heading: "font-sans font-semibold tracking-[-0.045em] leading-[0.95]",
    label: "font-sans text-[11px] uppercase tracking-[0.16em] font-medium",
    radius: "rounded-xl",
    grain: false,
    grid: false,
  },
  futuristic: {
    bg: "#060a12",
    fg: "#d6f5ff",
    muted: "rgba(214,245,255,0.6)",
    card: "rgba(15,26,43,0.65)",
    line: "rgba(214,245,255,0.12)",
    display: "font-mono font-medium uppercase tracking-[-0.06em] leading-[0.88]",
    heading: "font-mono font-medium uppercase tracking-[-0.04em] leading-[0.95]",
    label: "font-mono text-[11px] uppercase tracking-[0.22em]",
    radius: "rounded-md",
    grain: false,
    grid: true,
  },
  colourful: {
    bg: "#fff3d6",
    fg: "#2d1b69",
    muted: "rgba(45,27,105,0.68)",
    card: "#ffffff",
    line: "rgba(45,27,105,0.15)",
    display: "font-display font-bold tracking-[-0.06em] leading-[0.82]",
    heading: "font-display font-bold tracking-[-0.05em] leading-[0.9]",
    label: "font-display text-xs font-bold uppercase tracking-[0.12em]",
    radius: "rounded-[2rem]",
    grain: false,
    grid: false,
  },
};

/** Readable text colour for an accent background. */
export function onAccent(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255,
    g = (n >> 8) & 255,
    b = n & 255;
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.6 ? "#111111" : "#ffffff";
}
