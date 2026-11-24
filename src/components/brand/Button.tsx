"use client";

import Magnetic from "@/components/motion/Magnetic";
import { TLink } from "@/components/motion/PageTransition";

type Props = {
  children: React.ReactNode;
  href?: string;
  onClick?: () => void;
  variant?: "blood" | "bone" | "ghost";
  size?: "md" | "lg" | "xl";
  type?: "button" | "submit";
  disabled?: boolean;
  className?: string;
  cursor?: string;
  arrow?: boolean;
};

/**
 * Magnetic CTA. A liquid fill rises from below on hover; the label rolls
 * vertically to its duplicate.
 */
export default function Button({
  children,
  href,
  onClick,
  variant = "blood",
  size = "lg",
  type = "button",
  disabled,
  className = "",
  cursor,
  arrow = true,
}: Props) {
  const base =
    "group relative inline-flex items-center justify-center gap-3 overflow-hidden rounded-full font-display font-bold uppercase tracking-tight transition-[transform,opacity] duration-300 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-40 select-none";
  const sizes = {
    md: "h-12 px-6 text-sm",
    lg: "h-14 px-8 text-base md:h-16 md:px-10",
    xl: "h-16 px-9 text-lg md:h-20 md:px-14 md:text-xl",
  }[size];
  const colors = {
    blood: "bg-blood text-bone",
    bone: "bg-bone text-ink",
    ghost: "border border-bone/25 text-bone",
  }[variant];
  const fill = { blood: "bg-bone", bone: "bg-blood", ghost: "bg-blood" }[variant];
  const hoverText = { blood: "group-hover:text-ink", bone: "group-hover:text-bone", ghost: "group-hover:text-bone" }[variant];

  const inner = (
    <>
      <span
        aria-hidden
        className={`absolute inset-x-[-10%] bottom-0 h-[160%] translate-y-[101%] rounded-[50%_50%_0_0] ${fill} transition-transform duration-700 ease-[cubic-bezier(.16,1,.3,1)] group-hover:translate-y-[18%]`}
      />
      <span className={`relative flex items-center gap-3 transition-colors duration-500 ${hoverText}`}>
        <span className="relative block overflow-hidden">
          <span className="block transition-transform duration-500 ease-[cubic-bezier(.16,1,.3,1)] group-hover:-translate-y-full">
            {children}
          </span>
          <span
            aria-hidden
            className="absolute inset-0 block translate-y-full transition-transform duration-500 ease-[cubic-bezier(.16,1,.3,1)] group-hover:translate-y-0"
          >
            {children}
          </span>
        </span>
        {arrow && (
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden
            className="transition-transform duration-500 group-hover:translate-x-1 group-hover:-rotate-45"
          >
            <path d="M4 12h15M13 5l7 7-7 7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="square" />
          </svg>
        )}
      </span>
    </>
  );

  const cls = `${base} ${sizes} ${colors} ${className}`;
  return (
    <Magnetic strength={0.25}>
      {href ? (
        <TLink href={href} className={cls} data-cursor={cursor}>
          {inner}
        </TLink>
      ) : (
        <button type={type} onClick={onClick} disabled={disabled} className={cls} data-cursor={cursor}>
          {inner}
        </button>
      )}
    </Magnetic>
  );
}
