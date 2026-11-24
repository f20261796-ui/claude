"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { CopyButton } from "./PaymentClient";

/** Re-fetches the server-rendered status every 30s while verification is pending. */
export function AutoRefresh({ active }: { active: boolean }) {
  const router = useRouter();
  useEffect(() => {
    if (!active) return;
    const id = window.setInterval(() => router.refresh(), 30_000);
    return () => window.clearInterval(id);
  }, [active, router]);
  return null;
}

export function ShareBar({ url, name }: { url: string; name: string }) {
  const text = `Check out my portfolio — ${name}`;
  const e = encodeURIComponent;
  const links = [
    { label: "WhatsApp", href: `https://wa.me/?text=${e(`${text} ${url}`)}` },
    { label: "LinkedIn", href: `https://www.linkedin.com/sharing/share-offsite/?url=${e(url)}` },
    { label: "X", href: `https://twitter.com/intent/tweet?text=${e(text)}&url=${e(url)}` },
    { label: "Email", href: `mailto:?subject=${e(text)}&body=${e(url)}` },
  ];
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 rounded-full border border-bone/20 bg-ink p-1.5 pl-5">
        <a href={url} target="_blank" rel="noreferrer" className="truncate font-mono text-sm text-bone hover:text-blood md:text-base">
          {url.replace(/^https?:\/\//, "")}
        </a>
        <span className="ml-auto">
          <CopyButton text={url} label="Copy link" />
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        {links.map((l) => (
          <a
            key={l.label}
            href={l.href}
            target="_blank"
            rel="noopener noreferrer"
            className="label rounded-full border border-bone/20 px-4 py-2.5 text-[10px] text-bone/80 transition-colors hover:border-blood hover:bg-blood hover:text-bone"
          >
            {l.label} ↗
          </a>
        ))}
        <button
          type="button"
          onClick={() => navigator.share?.({ title: name, text, url }).catch(() => {})}
          className="label rounded-full border border-bone/20 px-4 py-2.5 text-[10px] text-bone/80 transition-colors hover:border-blood hover:bg-blood md:hidden"
        >
          More…
        </button>
      </div>
    </div>
  );
}
