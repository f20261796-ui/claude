"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, useReducedMotion, useScroll, useSpring, useTransform } from "motion/react";
import type { PortfolioData } from "@/lib/portfolio-types";
import { THEMES, onAccent, type Theme } from "./themes";
import Marquee from "@/components/motion/Marquee";
import MeltImage from "@/components/gl/MeltImage";
import Magnetic from "@/components/motion/Magnetic";

const EASE = [0.16, 1, 0.3, 1] as const;

/* ───────────── small building blocks ───────────── */

function Scramble({ text, className = "" }: { text: string; className?: string }) {
  const [out, setOut] = useState(text);
  const reduce = useReducedMotion();
  useEffect(() => {
    if (reduce) return;
    const chars = "!<>-_\\/[]{}=+*^?#01";
    let frame = 0;
    const total = 38;
    const id = window.setInterval(() => {
      frame++;
      setOut(
        text
          .split("")
          .map((c, i) => (c === " " ? " " : i < (frame / total) * text.length ? c : chars[Math.floor(Math.random() * chars.length)]))
          .join(""),
      );
      if (frame >= total) window.clearInterval(id);
    }, 32);
    return () => window.clearInterval(id);
  }, [text, reduce]);
  return <span className={className}>{out}</span>;
}

function SectionTitle({ index, title, t, accent }: { index: string; title: string; t: Theme; accent: string }) {
  return (
    <div className="mb-10 flex items-end justify-between gap-6 border-b pb-5 md:mb-16" style={{ borderColor: t.line }}>
      <motion.h2
        className={`${t.heading} text-[13vw] md:text-[6vw]`}
        initial={{ opacity: 0, y: 60 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "0px 0px -10% 0px" }}
        transition={{ duration: 1, ease: EASE }}
      >
        {title}
        <span style={{ color: accent }}>.</span>
      </motion.h2>
      <span className={`${t.label} shrink-0 pb-2`} style={{ color: t.muted }}>
        ({index})
      </span>
    </div>
  );
}

function Appear({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: reduce ? 0 : 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "0px 0px -8% 0px" }}
      transition={{ duration: 0.9, ease: EASE, delay }}
    >
      {children}
    </motion.div>
  );
}

const linkHost = (u: string) => {
  try {
    return new URL(u).hostname.replace(/^www\./, "");
  } catch {
    return u;
  }
};

/* ───────────── HERO ───────────── */

function Hero({ d, t }: { d: PortfolioData; t: Theme }) {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], ["0%", "30%"]);
  const nameY = useTransform(scrollYProgress, [0, 1], ["0%", "-40%"]);
  const parts = d.name.trim().split(/\s+/);
  const first = parts[0];
  const rest = parts.slice(1).join(" ");
  const letters = (word: string, delay: number) =>
    word.split("").map((c, i) => (
      <motion.span
        key={i}
        className="inline-block"
        initial={{ y: "110%", rotate: 8 }}
        animate={{ y: "0%", rotate: 0 }}
        transition={{ duration: 1.1, ease: EASE, delay: delay + i * 0.035 }}
      >
        {c}
      </motion.span>
    ));

  const photo = d.photoUrl ? (
    d.style === "cinematic" ? (
      <MeltImage src={d.photoUrl} alt={d.name} className="h-full w-full" revealSpan={0.2} />
    ) : (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={d.photoUrl} alt={d.name} className="h-full w-full object-cover" />
    )
  ) : (
    <div className="flex h-full w-full items-center justify-center" style={{ background: d.accent, color: onAccent(d.accent) }}>
      <span className={`${t.display} text-[30vw] md:text-[12vw]`}>
        {parts
          .map((p) => p[0])
          .join("")
          .slice(0, 2)}
      </span>
    </div>
  );

  const photoFrame = {
    cinematic: "aspect-[4/5] w-[62vw] md:w-[26vw]",
    minimalist: "aspect-square w-full rounded-xl md:w-[30vw]",
    futuristic: "aspect-[4/5] w-[62vw] md:w-[24vw] rounded-md",
    colourful: "aspect-square w-[70vw] md:w-[28vw] rounded-full",
  }[d.style];

  return (
    <section ref={ref} className="relative flex min-h-[100svh] flex-col justify-end overflow-hidden px-5 pb-10 pt-28 md:px-10 md:pb-14">
      {d.style === "colourful" && (
        <motion.div
          aria-hidden
          className="absolute -right-[20vw] -top-[10vw] h-[80vw] w-[80vw] rounded-full md:h-[50vw] md:w-[50vw]"
          style={{ background: d.accent }}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ duration: 1.4, ease: EASE }}
        />
      )}
      {d.style === "futuristic" && (
        <div aria-hidden className="pointer-events-none absolute inset-6 border md:inset-10" style={{ borderColor: t.line }}>
          {["left-0 top-0 border-l-2 border-t-2", "right-0 top-0 border-r-2 border-t-2", "left-0 bottom-0 border-l-2 border-b-2", "right-0 bottom-0 border-r-2 border-b-2"].map((c) => (
            <span key={c} className={`absolute h-5 w-5 ${c}`} style={{ borderColor: d.accent }} />
          ))}
        </div>
      )}

      <motion.div
        style={{ y, borderColor: t.fg }}
        className={`relative z-0 mb-8 self-end overflow-hidden md:absolute md:right-10 md:top-28 md:mb-0 ${photoFrame} ${
          d.style === "colourful" ? "border-[6px]" : ""
        }`}
        initial={{ clipPath: "inset(100% 0 0 0)" }}
        animate={{ clipPath: "inset(0% 0 0 0)" }}
        transition={{ duration: 1.5, ease: [0.83, 0, 0.17, 1], delay: 0.2 }}
      >
        <div className="h-full w-full">{photo}</div>
      </motion.div>

      <motion.div style={{ y: nameY }} className="relative z-10">
        <motion.p
          className={`${t.label} mb-6 flex flex-wrap items-center gap-3`}
          style={{ color: t.muted }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9 }}
        >
          <span className="h-2 w-2 rounded-full" style={{ background: d.accent }} />
          {d.style === "futuristic" ? "// portfolio.init()" : "Portfolio"}
          {d.city && <span>— {d.city}</span>}
        </motion.p>
        <h1 className={`${t.display} text-[17vw] md:text-[11vw]`}>
          {d.style === "futuristic" ? (
            <>
              <Scramble text={first} className="block" />
              {rest && <Scramble text={rest} className="block" />}
            </>
          ) : (
            <>
              <span className="block overflow-hidden pb-[0.06em]">{letters(first, 0.3)}</span>
              {rest && (
                <span
                  className={`block overflow-hidden pb-[0.06em] ${d.style === "cinematic" ? "pl-[8vw]" : ""}`}
                  style={d.style === "cinematic" || d.style === "colourful" ? { color: d.accent } : undefined}
                >
                  {letters(rest, 0.45)}
                </span>
              )}
            </>
          )}
        </h1>
        <div className="mt-8 grid gap-6 md:grid-cols-12">
          {d.headline && (
            <motion.p
              className={`md:col-span-6 ${d.style === "cinematic" ? "font-display uppercase tracking-tight" : ""} text-xl md:text-3xl`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, ease: EASE, delay: 0.8 }}
            >
              {d.headline}
            </motion.p>
          )}
          {d.intro && (
            <motion.p
              className="text-base leading-relaxed md:col-span-4 md:col-start-9"
              style={{ color: t.muted }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, ease: EASE, delay: 1 }}
            >
              {d.intro}
            </motion.p>
          )}
        </div>
      </motion.div>
    </section>
  );
}

/* ───────────── ABOUT ───────────── */

function About({ d, t, index }: { d: PortfolioData; t: Theme; index: string }) {
  const facts = [
    d.projects.length && { n: d.projects.length, l: d.projects.length === 1 ? "Project" : "Projects" },
    d.skills.length && { n: d.skills.length, l: "Skills" },
    d.experience.length && { n: d.experience.length, l: d.experience.length === 1 ? "Role" : "Roles" },
    d.achievements.length + d.certifications.length && {
      n: d.achievements.length + d.certifications.length,
      l: "Recognitions",
    },
  ].filter(Boolean) as { n: number; l: string }[];
  if (!d.about && !facts.length) return null;
  return (
    <section id="about" className="px-5 py-24 md:px-10 md:py-36">
      <SectionTitle index={index} title="About" t={t} accent={d.accent} />
      <div className="grid gap-12 md:grid-cols-12">
        <div className="md:col-span-7">
          {d.about.split(/\n+/).map((p, i) => (
            <Appear key={i} delay={i * 0.08}>
              <p className={`mb-6 ${i === 0 ? "text-2xl leading-snug md:text-4xl" : "text-lg leading-relaxed"}`} style={i ? { color: t.muted } : undefined}>
                {p}
              </p>
            </Appear>
          ))}
        </div>
        {facts.length > 0 && (
          <div className="grid grid-cols-2 gap-3 self-start md:col-span-4 md:col-start-9">
            {facts.map((f, i) => (
              <Appear key={f.l} delay={i * 0.08}>
                <div className={`${t.radius} border p-5`} style={{ borderColor: t.line, background: t.card }}>
                  <span className={`${t.heading} block text-5xl md:text-6xl`} style={{ color: d.accent }}>
                    {String(f.n).padStart(2, "0")}
                  </span>
                  <span className={`${t.label} mt-2 block`} style={{ color: t.muted }}>
                    {f.l}
                  </span>
                </div>
              </Appear>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

/* ───────────── SKILLS ───────────── */

function Skills({ d, t, index }: { d: PortfolioData; t: Theme; index: string }) {
  if (!d.skills.length) return null;
  return (
    <section id="skills" className="px-5 py-24 md:px-10 md:py-36">
      <SectionTitle index={index} title="Skills" t={t} accent={d.accent} />
      {d.style === "futuristic" ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {d.skills.map((s, i) => {
            const c = 2 * Math.PI * 42;
            return (
              <Appear key={s.name} delay={(i % 6) * 0.06}>
                <div className={`${t.radius} flex flex-col items-center border p-5 text-center`} style={{ borderColor: t.line, background: t.card }}>
                  <svg viewBox="0 0 100 100" className="h-24 w-24 -rotate-90">
                    <circle cx="50" cy="50" r="42" fill="none" stroke={t.line} strokeWidth="6" />
                    <motion.circle
                      cx="50"
                      cy="50"
                      r="42"
                      fill="none"
                      stroke={d.accent}
                      strokeWidth="6"
                      strokeLinecap="round"
                      strokeDasharray={c}
                      initial={{ strokeDashoffset: c }}
                      whileInView={{ strokeDashoffset: c * (1 - s.level / 5) }}
                      viewport={{ once: true }}
                      transition={{ duration: 1.6, ease: EASE, delay: 0.2 }}
                      style={{ filter: `drop-shadow(0 0 6px ${d.accent})` }}
                    />
                  </svg>
                  <span className="mt-3 font-mono text-sm uppercase">{s.name}</span>
                  <span className={`${t.label} mt-1`} style={{ color: d.accent }}>
                    lvl {s.level}/5
                  </span>
                </div>
              </Appear>
            );
          })}
        </div>
      ) : d.style === "colourful" ? (
        <div className="flex flex-wrap gap-3 md:gap-4">
          {d.skills.map((s, i) => (
            <motion.span
              key={s.name}
              className="font-display rounded-full border-2 font-bold"
              style={{
                borderColor: t.fg,
                background: i % 3 === 0 ? d.accent : i % 3 === 1 ? t.card : t.fg,
                color: i % 3 === 0 ? onAccent(d.accent) : i % 3 === 1 ? t.fg : t.bg,
                fontSize: `${0.95 + s.level * 0.28}rem`,
                padding: `${0.4 + s.level * 0.12}em ${0.9 + s.level * 0.15}em`,
              }}
              initial={{ opacity: 0, scale: 0.5, rotate: (i % 2 ? 1 : -1) * 12 }}
              whileInView={{ opacity: 1, scale: 1, rotate: (i % 2 ? 1 : -1) * (i % 4) }}
              whileHover={{ scale: 1.08, rotate: 0 }}
              viewport={{ once: true }}
              transition={{ type: "spring", stiffness: 200, damping: 14, delay: (i % 8) * 0.05 }}
            >
              {s.name}
            </motion.span>
          ))}
        </div>
      ) : (
        <div className="grid gap-x-12 md:grid-cols-2">
          {d.skills.map((s, i) => (
            <Appear key={s.name} delay={(i % 2) * 0.06}>
              <div className="border-b py-5" style={{ borderColor: t.line }}>
                <div className="mb-3 flex items-baseline justify-between">
                  <span className={`${d.style === "cinematic" ? "font-display uppercase tracking-tight" : "font-medium"} text-xl md:text-2xl`}>
                    {s.name}
                  </span>
                  <span className={t.label} style={{ color: t.muted }}>
                    {["Beginner", "Familiar", "Proficient", "Advanced", "Expert"][s.level - 1]}
                  </span>
                </div>
                <div className="flex gap-1.5">
                  {Array.from({ length: 5 }).map((_, k) => (
                    <motion.span
                      key={k}
                      className="h-1.5 flex-1 origin-left"
                      style={{ background: k < s.level ? d.accent : t.line }}
                      initial={{ scaleX: 0 }}
                      whileInView={{ scaleX: 1 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.6, ease: EASE, delay: 0.15 + k * 0.08 }}
                    />
                  ))}
                </div>
              </div>
            </Appear>
          ))}
        </div>
      )}
    </section>
  );
}

/* ───────────── PROJECTS ───────────── */

function ProjectCard({ p, i, d, t }: { p: PortfolioData["projects"][number]; i: number; d: PortfolioData; t: Theme }) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const imgY = useTransform(scrollYProgress, [0, 1], ["-8%", "8%"]);
  const flip = i % 2 === 1;
  return (
    <div ref={ref} className="grid items-center gap-8 py-10 md:grid-cols-12 md:gap-12 md:py-16">
      <motion.div
        className={`group relative overflow-hidden ${t.radius} md:col-span-7 ${flip ? "md:order-2 md:col-start-6" : ""}`}
        style={{ background: t.card }}
        initial={{ clipPath: "inset(12% 12% 12% 12%)", opacity: 0 }}
        whileInView={{ clipPath: "inset(0% 0% 0% 0%)", opacity: 1 }}
        viewport={{ once: true, margin: "0px 0px -10% 0px" }}
        transition={{ duration: 1.3, ease: EASE }}
        data-cursor={p.liveUrl || p.githubUrl ? "Open" : undefined}
      >
        <div className="relative aspect-[4/3] overflow-hidden">
          {p.imageUrl ? (
            <motion.img
              src={p.imageUrl}
              alt={p.title}
              loading="lazy"
              style={{ y: imgY, scale: 1.18 }}
              className="absolute inset-0 h-full w-full object-cover transition-[filter] duration-700 group-hover:brightness-110"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center" style={{ background: d.accent }}>
              <span className={`${t.heading} px-6 text-center text-[9vw] md:text-[4vw]`} style={{ color: onAccent(d.accent) }}>
                {p.title}
              </span>
            </div>
          )}
          <span
            className={`${t.label} absolute left-4 top-4 rounded-full px-3 py-1.5`}
            style={{ background: t.bg, color: t.fg }}
          >
            {String(i + 1).padStart(2, "0")}
          </span>
        </div>
      </motion.div>
      <div className={`md:col-span-5 ${flip ? "md:order-1 md:col-start-1" : ""}`}>
        <Appear>
          <h3 className={`${t.heading} text-4xl md:text-5xl`}>{p.title}</h3>
        </Appear>
        {p.description && (
          <Appear delay={0.08}>
            <p className="mt-5 text-lg leading-relaxed" style={{ color: t.muted }}>
              {p.description}
            </p>
          </Appear>
        )}
        {p.tech.length > 0 && (
          <Appear delay={0.14}>
            <div className="mt-6 flex flex-wrap gap-2">
              {p.tech.map((x) => (
                <span key={x} className={`${t.label} rounded-full border px-3 py-1.5`} style={{ borderColor: t.line }}>
                  {x}
                </span>
              ))}
            </div>
          </Appear>
        )}
        {(p.liveUrl || p.githubUrl) && (
          <Appear delay={0.2}>
            <div className="mt-8 flex flex-wrap gap-3">
              {p.liveUrl && (
                <a
                  href={p.liveUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-12 items-center gap-2 rounded-full px-6 font-display text-sm font-bold uppercase transition-transform hover:scale-105"
                  style={{ background: d.accent, color: onAccent(d.accent) }}
                >
                  Live demo ↗
                </a>
              )}
              {p.githubUrl && (
                <a
                  href={p.githubUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-12 items-center gap-2 rounded-full border px-6 font-display text-sm font-bold uppercase transition-colors hover:opacity-70"
                  style={{ borderColor: t.fg }}
                >
                  GitHub ↗
                </a>
              )}
            </div>
          </Appear>
        )}
      </div>
    </div>
  );
}

function Projects({ d, t, index }: { d: PortfolioData; t: Theme; index: string }) {
  if (!d.projects.length) return null;
  return (
    <section id="projects" className="px-5 py-24 md:px-10 md:py-36">
      <SectionTitle index={index} title="Projects" t={t} accent={d.accent} />
      {d.projects.map((p, i) => (
        <ProjectCard key={i} p={p} i={i} d={d} t={t} />
      ))}
    </section>
  );
}

/* ───────────── TIMELINE (experience / education) ───────────── */

function Timeline({
  id,
  title,
  index,
  items,
  d,
  t,
}: {
  id: string;
  title: string;
  index: string;
  items: { top: string; title: string; sub: string; meta: string; body: string; tag?: string }[];
  d: PortfolioData;
  t: Theme;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 75%", "end 60%"] });
  const line = useSpring(scrollYProgress, { stiffness: 100, damping: 30 });
  if (!items.length) return null;
  return (
    <section id={id} className="px-5 py-24 md:px-10 md:py-36">
      <SectionTitle index={index} title={title} t={t} accent={d.accent} />
      <div ref={ref} className="relative pl-8 md:pl-0">
        <div className="absolute bottom-0 left-[7px] top-0 w-px md:left-1/2" style={{ background: t.line }} />
        <motion.div
          className="absolute left-[7px] top-0 h-full w-px origin-top md:left-1/2"
          style={{ background: d.accent, scaleY: line }}
        />
        {items.map((it, i) => (
          <div key={i} className={`relative mb-14 md:mb-20 md:grid md:grid-cols-2 md:gap-16 ${i % 2 ? "" : ""}`}>
            <motion.span
              className="absolute -left-8 top-2 h-[15px] w-[15px] rounded-full border-2 md:left-1/2 md:-translate-x-1/2"
              style={{ borderColor: d.accent, background: t.bg }}
              initial={{ scale: 0 }}
              whileInView={{ scale: 1 }}
              viewport={{ once: true, margin: "0px 0px -20% 0px" }}
              transition={{ type: "spring", stiffness: 300, damping: 15 }}
            />
            <div className={i % 2 ? "md:col-start-2" : "md:text-right"}>
              <Appear>
                <p className={t.label} style={{ color: d.accent }}>
                  {it.top}
                </p>
                <h3 className={`${t.heading} mt-3 text-3xl md:text-4xl`}>{it.title}</h3>
                {it.sub && <p className="mt-2 text-lg">{it.sub}</p>}
                {(it.meta || it.tag) && (
                  <p className={`${t.label} mt-3`} style={{ color: t.muted }}>
                    {[it.tag, it.meta].filter(Boolean).join(" · ")}
                  </p>
                )}
                {it.body && (
                  <p className={`mt-4 leading-relaxed ${i % 2 ? "" : "md:ml-auto"} max-w-md`} style={{ color: t.muted }}>
                    {it.body}
                  </p>
                )}
              </Appear>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ───────────── RECOGNITION ───────────── */

function Recognition({
  id,
  title,
  index,
  items,
  d,
  t,
}: {
  id: string;
  title: string;
  index: string;
  items: PortfolioData["achievements"];
  d: PortfolioData;
  t: Theme;
}) {
  if (!items.length) return null;
  return (
    <section id={id} className="px-5 py-24 md:px-10 md:py-32">
      <SectionTitle index={index} title={title} t={t} accent={d.accent} />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {items.map((a, i) => (
          <Appear key={i} delay={(i % 3) * 0.07}>
            <motion.div
              whileHover={{ y: -6 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className={`${t.radius} group relative flex h-full flex-col justify-between overflow-hidden border p-6 md:p-8`}
              style={{ borderColor: t.line, background: t.card }}
            >
              <span
                className="absolute -right-10 -top-10 h-28 w-28 rounded-full opacity-0 blur-2xl transition-opacity duration-700 group-hover:opacity-60"
                style={{ background: d.accent }}
              />
              <div className="relative">
                <span className={`${t.label}`} style={{ color: d.accent }}>
                  {[a.issuer, a.date].filter(Boolean).join(" — ") || "—"}
                </span>
                <h3 className={`${t.heading} mt-4 text-2xl md:text-3xl`}>{a.title}</h3>
                {a.description && (
                  <p className="mt-3 leading-relaxed" style={{ color: t.muted }}>
                    {a.description}
                  </p>
                )}
              </div>
              {a.link && (
                <a
                  href={a.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`${t.label} relative mt-6 inline-flex items-center gap-2 underline-offset-4 hover:underline`}
                >
                  View credential ↗
                </a>
              )}
            </motion.div>
          </Appear>
        ))}
      </div>
    </section>
  );
}

/* ───────────── CONTACT ───────────── */

function Contact({ d, t, index }: { d: PortfolioData; t: Theme; index: string }) {
  return (
    <section id="contact" className="relative overflow-hidden px-5 py-24 md:px-10 md:py-40" style={{ background: d.accent, color: onAccent(d.accent) }}>
      {d.style === "cinematic" && <div aria-hidden className="streaks pointer-events-none absolute inset-0 opacity-25" />}
      <div className="relative">
        <p className={`${t.label} mb-8 opacity-70`}>({index}) Contact</p>
        <motion.h2
          className={`${t.display} text-[18vw] md:text-[12vw]`}
          initial={{ opacity: 0, y: 80 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 1.2, ease: EASE }}
        >
          Let&apos;s talk.
        </motion.h2>
        <div className="mt-12 grid gap-10 md:grid-cols-12">
          <div className="space-y-4 md:col-span-7">
            {d.email && (
              <a href={`mailto:${d.email}`} className="group block break-all font-display text-2xl font-medium tracking-tight md:text-5xl">
                <span className="bg-[linear-gradient(currentColor,currentColor)] bg-[length:0%_2px] bg-left-bottom bg-no-repeat transition-[background-size] duration-500 group-hover:bg-[length:100%_2px]">
                  {d.email}
                </span>{" "}
                ↗
              </a>
            )}
            {d.phone && (
              <a href={`tel:${d.phone.replace(/\s/g, "")}`} className="block font-display text-xl md:text-3xl">
                {d.phone}
              </a>
            )}
            {d.resumeUrl && (
              <div className="pt-6">
                <Magnetic>
                  <a
                    href={d.resumeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    download
                    data-cursor="Download"
                    className="inline-flex h-16 items-center gap-3 rounded-full px-8 font-display text-base font-bold uppercase transition-transform hover:scale-105"
                    style={{ background: t.bg, color: t.fg }}
                  >
                    Download resume
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                      <path d="M12 4v13M5 11l7 7 7-7M4 21h16" stroke="currentColor" strokeWidth="2.2" />
                    </svg>
                  </a>
                </Magnetic>
              </div>
            )}
          </div>
          {d.socials.length > 0 && (
            <ul className="md:col-span-4 md:col-start-9">
              {d.socials.map((s) => (
                <li key={s.url} className="border-b border-current/20" style={{ borderColor: "currentColor" }}>
                  <a
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-center justify-between py-4 opacity-90 transition-opacity hover:opacity-100"
                  >
                    <span className="font-display text-xl font-bold uppercase tracking-tight transition-transform duration-500 group-hover:translate-x-2">
                      {s.label}
                    </span>
                    <span className="text-sm opacity-60">{linkHost(s.url)} ↗</span>
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}

/* ───────────── PAGE ───────────── */

export default function Portfolio({ data: d, brandUrl = "/" }: { data: PortfolioData; brandUrl?: string }) {
  const t = THEMES[d.style] ?? THEMES.cinematic;

  const sections = useMemo(() => {
    const list: { id: string; label: string }[] = [];
    if (d.about) list.push({ id: "about", label: "About" });
    if (d.skills.length) list.push({ id: "skills", label: "Skills" });
    if (d.projects.length) list.push({ id: "projects", label: "Work" });
    if (d.experience.length) list.push({ id: "experience", label: "Experience" });
    if (d.education.length) list.push({ id: "education", label: "Education" });
    if (d.achievements.length) list.push({ id: "achievements", label: "Awards" });
    if (d.certifications.length) list.push({ id: "certifications", label: "Certs" });
    list.push({ id: "contact", label: "Contact" });
    return list;
  }, [d]);

  // numbering only counts sections that actually render
  const idx = (id: string) => String(sections.findIndex((s) => s.id === id) + 1).padStart(2, "0");

  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 30 });

  const marquee = [d.headline, ...d.skills.slice(0, 6).map((s) => s.name), d.city].filter(Boolean) as string[];

  return (
    <div
      className={`relative min-h-screen overflow-x-clip ${d.style === "minimalist" || d.style === "colourful" ? "selection:bg-black selection:text-white" : ""}`}
      style={{ background: t.bg, color: t.fg, ["--accent" as string]: d.accent }}
    >
      {t.grid && (
        <div
          aria-hidden
          className="pointer-events-none fixed inset-0 opacity-[0.35]"
          style={{
            backgroundImage: `linear-gradient(${t.line} 1px, transparent 1px), linear-gradient(90deg, ${t.line} 1px, transparent 1px)`,
            backgroundSize: "64px 64px",
            maskImage: "radial-gradient(ellipse at center, black 30%, transparent 80%)",
          }}
        />
      )}
      {d.style === "futuristic" && (
        <div aria-hidden className="pointer-events-none fixed -left-[20vw] top-[20vh] h-[50vw] w-[50vw] rounded-full opacity-20 blur-[120px]" style={{ background: d.accent }} />
      )}

      <motion.div className="fixed inset-x-0 top-0 z-50 h-[3px] origin-left" style={{ scaleX: progress, background: d.accent }} />

      <header className="fixed inset-x-0 top-0 z-40 flex items-center justify-between px-5 py-4 md:px-10 md:py-6">
        <a href="#top" className={`${t.label} rounded-full px-3 py-2 backdrop-blur-md`} style={{ background: `${t.bg}cc` }}>
          {d.name
            .split(/\s+/)
            .map((p) => p[0])
            .join("")
            .slice(0, 3)}
          <span style={{ color: d.accent }}>.</span>
        </a>
        <nav className="no-scrollbar hidden max-w-[70vw] gap-1 overflow-x-auto rounded-full border p-1 backdrop-blur-md md:flex" style={{ borderColor: t.line, background: `${t.bg}b3` }}>
          {sections.map((s) => (
            <a key={s.id} href={`#${s.id}`} className={`${t.label} whitespace-nowrap rounded-full px-4 py-2 transition-opacity hover:opacity-60`}>
              {s.label}
            </a>
          ))}
        </nav>
        <a
          href="#contact"
          className="rounded-full px-5 py-2.5 font-display text-xs font-bold uppercase md:hidden"
          style={{ background: d.accent, color: onAccent(d.accent) }}
        >
          Contact
        </a>
      </header>

      <main id="top" className="relative">
        <Hero d={d} t={t} />
        {marquee.length > 1 && (
          <div className="border-y py-5" style={{ borderColor: t.line }}>
            <Marquee
              items={marquee}
              itemClassName={`${t.heading} text-4xl md:text-6xl`}
              duration={30}
              separator={d.style === "futuristic" ? "/" : "✦"}
            />
          </div>
        )}
        <About d={d} t={t} index={idx("about")} />
        <Skills d={d} t={t} index={idx("skills")} />
        <Projects d={d} t={t} index={idx("projects")} />
        <Timeline
          id="experience"
          title="Experience"
          index={idx("experience")}
          d={d}
          t={t}
          items={d.experience.map((e) => ({ top: e.duration, title: e.role || e.company, sub: e.role ? e.company : "", meta: "", tag: e.kind, body: e.description }))}
        />
        <Timeline
          id="education"
          title="Education"
          index={idx("education")}
          d={d}
          t={t}
          items={d.education.map((e) => ({
            top: [e.startYear, e.endYear].filter(Boolean).join(" — "),
            title: e.institution,
            sub: [e.degree, e.field].filter(Boolean).join(", "),
            meta: e.grade,
            body: "",
          }))}
        />
        <Recognition id="achievements" title="Achievements" index={idx("achievements")} items={d.achievements} d={d} t={t} />
        <Recognition id="certifications" title="Certifications" index={idx("certifications")} items={d.certifications} d={d} t={t} />
        <Contact d={d} t={t} index={idx("contact")} />
      </main>

      <footer className="flex flex-col items-center justify-between gap-2 px-5 py-6 md:flex-row md:px-10" style={{ color: t.muted }}>
        <span className={t.label}>
          © {new Date().getFullYear()} {d.name}
        </span>
        <a href={brandUrl} className={`${t.label} transition-opacity hover:opacity-60`}>
          Made with IDENTITY.
        </a>
      </footer>
    </div>
  );
}
