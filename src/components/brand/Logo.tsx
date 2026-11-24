import { TLink } from "@/components/motion/PageTransition";

/** IDENTITY. wordmark — tight grotesk, crimson full stop, a slash "cut" through the I. */
export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`relative inline-flex items-baseline font-display font-bold tracking-[-0.06em] ${className}`}>
      <span className="relative">
        I
        <span aria-hidden className="absolute left-1/2 top-[38%] h-[0.09em] w-[0.5em] -translate-x-1/2 -rotate-[28deg] bg-blood" />
      </span>
      DENTITY<span className="text-blood">.</span>
    </span>
  );
}

export function LogoLink({ className = "" }: { className?: string }) {
  return (
    <TLink href="/" aria-label="IDENTITY. home" data-cursor="Home" className={`inline-block ${className}`}>
      <Wordmark className="text-xl md:text-2xl" />
    </TLink>
  );
}
