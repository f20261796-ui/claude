"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useScroll, useTransform, type MotionValue } from "motion/react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Marquee from "@/components/motion/Marquee";
import { FadeUp, RevealLines, RevealWords } from "@/components/motion/Reveal";
import Button from "@/components/brand/Button";
import MeltImage from "@/components/gl/MeltImage";
import { TLink } from "@/components/motion/PageTransition";
import { siteConfig } from "@/lib/config";
import { DEMOS } from "@/lib/demos";

gsap.registerPlugin(ScrollTrigger);
const EASE = [0.16, 1, 0.3, 1] as const;

/* ─────────────────────────── Marquee band ─────────────────────────── */
export function IdentityStrip() {
  return (
    <section aria-label="Your name. Your work. Your digital identity." className="relative z-10 -mt-[8svh] overflow-hidden py-16 md:py-24">
      <div className="-rotate-[4deg] scale-110 bg-blood py-3 md:py-5">
        <Marquee
          items={["Your name.", "Your work.", "Your digital identity."]}
          itemClassName="display text-[11vw] text-ink md:text-[6.5vw]"
          duration={22}
        />
      </div>
      <div className="mt-[-1.5rem] rotate-[3deg] scale-110 border-y border-bone/20 bg-ink py-2 md:py-3">
        <Marquee
          items={["Designed around you", "Mobile ready", "Shareable link", "Recruiter ready", `₹${siteConfig.price} only`]}
          itemClassName="label text-sm text-bone md:text-base"
          duration={30}
          reverse
          separator="●"
        />
      </div>
    </section>
  );
}

/* ─────────────────────────── Manifesto ─────────────────────────── */
function ScrubWord({ word, progress, range }: { word: string; progress: MotionValue<number>; range: [number, number] }) {
  const opacity = useTransform(progress, range, [0.12, 1]);
  const color = useTransform(progress, [range[0], range[1]], ["#f2ede4", word.startsWith("*") ? "#e1121b" : "#f2ede4"]);
  return (
    <motion.span style={{ opacity, color }} className={word.startsWith("*") ? "editorial" : ""}>
      {word.replace("*", "")}{" "}
    </motion.span>
  );
}

export function Manifesto() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 80%", "end 45%"] });
  const words =
    "A resume is a list. A portfolio is a *story. Recruiters skim hundreds of PDFs a day — give them a *place to remember you by. Your projects, your skills, your journey, *beautifully told on a link that is *yours.".split(
      " ",
    );
  return (
    <section className="relative px-5 py-24 md:px-10 md:py-40">
      <p className="label mb-10 text-ash">
        <span className="text-blood">(02)</span> Why it matters
      </p>
      <div ref={ref} className="font-display text-[8.4vw] font-medium leading-[1.02] tracking-[-0.04em] md:text-[4.6vw]">
        {words.map((w, i) => (
          <ScrubWord key={i} word={w} progress={scrollYProgress} range={[i / words.length, (i + 1) / words.length]} />
        ))}
      </div>
    </section>
  );
}

/* ─────────────────────────── Process ─────────────────────────── */
function FormIllustration() {
  const rows = ["Full name", "Headline", "Projects", "Skills"];
  return (
    <div className="w-full max-w-sm space-y-4">
      {rows.map((r, i) => (
        <motion.div
          key={r}
          initial={{ opacity: 0, x: -30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: false, amount: 0.6 }}
          transition={{ delay: i * 0.12, duration: 0.8, ease: EASE }}
          className="border-b border-ink/30 pb-2"
        >
          <span className="label text-[10px] text-ink/60">{r}</span>
          <motion.div
            className="mt-2 h-3 origin-left rounded-full bg-ink"
            initial={{ scaleX: 0 }}
            whileInView={{ scaleX: [0.3, 0.55, 0.8, 0.65][i] }}
            viewport={{ once: false, amount: 0.6 }}
            transition={{ delay: 0.4 + i * 0.15, duration: 1, ease: EASE }}
          />
        </motion.div>
      ))}
    </div>
  );
}

function TransformIllustration() {
  return (
    <div className="relative grid h-56 w-full max-w-sm grid-cols-6 grid-rows-4 gap-2">
      {[
        "col-span-4 row-span-2 bg-bone",
        "col-span-2 row-span-2 bg-blood",
        "col-span-2 row-span-2 bg-ink-3 border border-bone/10",
        "col-span-2 row-span-1 bg-bone/80",
        "col-span-2 row-span-1 bg-blood/70",
        "col-span-4 row-span-1 bg-bone/30",
      ].map((c, i) => (
        <motion.div
          key={i}
          className={`rounded-md ${c}`}
          initial={{ opacity: 0, scale: 0.4, rotate: i % 2 ? 12 : -12 }}
          whileInView={{ opacity: 1, scale: 1, rotate: 0 }}
          viewport={{ once: false, amount: 0.5 }}
          transition={{ delay: i * 0.08, duration: 0.9, ease: EASE }}
        />
      ))}
    </div>
  );
}

function LinkIllustration() {
  return (
    <div className="w-full max-w-sm">
      <motion.div
        className="flex items-center gap-3 rounded-full border border-bone/20 bg-ink-2 p-2 pl-5"
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: false, amount: 0.6 }}
        transition={{ duration: 0.9, ease: EASE }}
      >
        <span className="truncate font-mono text-sm text-bone/80">
          {siteConfig.siteUrl.replace(/^https?:\/\//, "")}/p/<span className="text-blood">you</span>
        </span>
        <span className="ml-auto rounded-full bg-blood px-4 py-2 font-display text-xs font-bold uppercase text-bone">Copy</span>
      </motion.div>
      <div className="mt-6 flex flex-wrap gap-2">
        {["LinkedIn", "Recruiters", "WhatsApp", "Instagram bio", "Resume"].map((t, i) => (
          <motion.span
            key={t}
            className="rounded-full border border-bone/20 px-4 py-2 text-sm text-bone/80"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: false, amount: 0.6 }}
            transition={{ delay: 0.3 + i * 0.08, duration: 0.7, ease: EASE }}
          >
            {t} ↗
          </motion.span>
        ))}
      </div>
    </div>
  );
}

const STEPS = [
  {
    n: "01",
    title: ["Tell us", "about yourself"],
    body: "Fill in a short form with your details. Everything except your name and email is optional — add what you have.",
    art: <FormIllustration />,
    tone: "bg-bone text-ink",
  },
  {
    n: "02",
    title: ["Make it", "yours"],
    body: "We transform your information into a personalized portfolio — choose a mood, pick your accent colour.",
    art: <TransformIllustration />,
    tone: "bg-ink-2 text-bone",
  },
  {
    n: "03",
    title: ["Own your", "space"],
    body: "Get your personal website link and share it anywhere — with recruiters, friends and companies.",
    art: <LinkIllustration />,
    tone: "bg-blood text-bone",
  },
];

export function Process() {
  const wrap = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mm = gsap.matchMedia();
    mm.add("(min-width: 768px) and (prefers-reduced-motion: no-preference)", () => {
      const el = track.current!;
      const distance = () => el.scrollWidth - window.innerWidth;
      const tween = gsap.to(el, {
        x: () => -distance(),
        ease: "none",
        scrollTrigger: {
          trigger: wrap.current,
          start: "top top",
          end: () => `+=${distance()}`,
          scrub: 0.8,
          pin: true,
          invalidateOnRefresh: true,
          anticipatePin: 1,
        },
      });
      // skew panels with scroll velocity
      const skew = gsap.quickTo(el, "skewX", { duration: 0.5, ease: "power3" });
      const st = ScrollTrigger.create({
        trigger: wrap.current,
        start: "top top",
        end: () => `+=${distance()}`,
        onUpdate: (s) => skew(gsap.utils.clamp(-6, 6, s.getVelocity() / -400)),
      });
      return () => {
        tween.kill();
        st.kill();
      };
    });
    return () => mm.revert();
  }, []);

  return (
    <section id="process" ref={wrap} className="relative overflow-hidden md:h-[100svh]">
      <div ref={track} className="flex flex-col gap-4 px-4 md:h-full md:w-max md:flex-row md:items-stretch md:gap-6 md:px-10 md:py-[9vh]">
        <div className="flex flex-col justify-between py-10 md:w-[34vw] md:py-0">
          <p className="label text-ash">
            <span className="text-blood">(03)</span> How it works
          </p>
          <RevealLines
            lines={["Three", "steps.", <span key="e" className="editorial normal-case text-blood">One link.</span>]}
            className="display mt-8 text-[17vw] md:text-[8vw]"
          />
          <p className="mt-8 max-w-xs text-bone/60">
            From your phone to a live website — no code, no design skills, no subscriptions.
          </p>
        </div>
        {STEPS.map((s) => (
          <article
            key={s.n}
            className={`relative flex min-h-[78svh] flex-col justify-between overflow-hidden rounded-[1.5rem] p-6 md:h-full md:min-h-0 md:w-[58vw] md:p-10 lg:w-[46vw] ${s.tone}`}
          >
            <div className="flex items-start justify-between">
              <span className="display text-[28vw] leading-[0.7] opacity-90 md:text-[12vw]">{s.n}</span>
              <span className="label opacity-60">Step {s.n}</span>
            </div>
            <div className="my-8 flex justify-center md:my-0">{s.art}</div>
            <div className="grid gap-4 md:grid-cols-2 md:items-end">
              <h3 className="display text-[11vw] md:text-[3.8vw]">
                {s.title[0]}
                <br />
                {s.title[1]}
              </h3>
              <p className="max-w-sm text-base leading-relaxed opacity-75">{s.body}</p>
            </div>
          </article>
        ))}
        <div className="md:w-[6vw]" />
      </div>
    </section>
  );
}

/* ─────────────────────────── Work / examples ─────────────────────────── */
export function Work() {
  const layout = [
    { col: "md:col-span-7", aspect: "aspect-[4/3]" },
    { col: "md:col-span-5 md:mt-40", aspect: "aspect-[4/5]" },
    { col: "md:col-span-5", aspect: "aspect-[4/5]" },
    { col: "md:col-span-7 md:-mt-24", aspect: "aspect-[4/3]" },
  ];
  return (
    <section id="work" className="relative px-4 py-24 md:px-10 md:py-40">
      <div className="mb-16 grid gap-6 md:mb-28 md:grid-cols-12">
        <p className="label text-ash md:col-span-3">
          <span className="text-blood">(04)</span> Portfolio examples
        </p>
        <RevealLines
          lines={["Four people.", <span key="b"><span className="editorial normal-case text-blood">four</span> different worlds.</span>]}
          className="display text-[12vw] md:col-span-9 md:text-[6.4vw]"
        />
      </div>
      <div className="grid gap-x-8 gap-y-16 md:grid-cols-12">
        {DEMOS.map((d, i) => (
          <FadeUp key={d.slug} className={`group ${layout[i].col}`} delay={i % 2 ? 0.1 : 0}>
            <TLink href={`/demo/${d.slug}`} data-cursor="Open demo" className="block">
              <div className={`relative overflow-hidden rounded-2xl bg-ink-2 ${layout[i].aspect}`}>
                <MeltImage
                  src={`/demos/${d.slug}.jpg`}
                  alt={`Demo portfolio of ${d.name}`}
                  className="absolute inset-0 transition-transform duration-[1.4s] ease-[cubic-bezier(.16,1,.3,1)] group-hover:scale-[1.04]"
                />
                <div className="pointer-events-none absolute left-4 top-4 flex gap-2">
                  <span className="label rounded-full bg-ink/70 px-3 py-1.5 text-[10px] text-bone backdrop-blur">{d.styleLabel}</span>
                  <span className="h-7 w-7 rounded-full border-2 border-bone/60" style={{ background: d.accent }} />
                </div>
              </div>
              <div className="mt-5 flex items-end justify-between gap-4 border-b border-line pb-5">
                <div>
                  <h3 className="display text-3xl md:text-5xl">
                    <span className="inline-block transition-transform duration-700 group-hover:translate-x-3">{d.name}</span>
                  </h3>
                  <p className="mt-2 text-bone/60">{d.headline}</p>
                </div>
                <span className="label shrink-0 text-bone/60 transition-colors group-hover:text-blood">View demo ↗</span>
              </div>
            </TLink>
          </FadeUp>
        ))}
      </div>
      <p className="mt-14 text-center text-sm text-ash">These are sample portfolios with fictional people, built to show what yours could look like.</p>
    </section>
  );
}

/* ─────────────────────────── Included ─────────────────────────── */
const INCLUDED: [string, string][] = [
  ["Personalized URL", "Your own link — /p/your-name"],
  ["About me", "Your story, told in your words"],
  ["Education", "A clean timeline of where you studied"],
  ["Skills", "Visualised, not just listed"],
  ["Projects", "Images, descriptions, GitHub and live links"],
  ["Experience", "Internships, freelance work, volunteering"],
  ["Achievements", "The wins worth bragging about"],
  ["Certifications", "With links to verify them"],
  ["Resume download", "One tap for recruiters"],
  ["Contact", "Email and (optionally) phone"],
  ["Social links", "LinkedIn, GitHub, Instagram, X, Behance"],
  ["Mobile ready", "Looks sharp on every phone"],
];

export function Included() {
  return (
    <section id="included" className="relative px-4 py-24 md:px-10 md:py-40">
      <div className="mb-14 grid gap-6 md:grid-cols-12">
        <p className="label text-ash md:col-span-3">
          <span className="text-blood">(05)</span> What&apos;s included
        </p>
        <RevealLines lines={["Everything", "you need."]} className="display text-[14vw] md:col-span-9 md:text-[7vw]" />
      </div>
      <ul className="border-t border-line">
        {INCLUDED.map(([t, d], i) => (
          <motion.li
            key={t}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "0px 0px -8% 0px" }}
            transition={{ duration: 0.8, ease: EASE, delay: (i % 4) * 0.04 }}
            className="group relative overflow-hidden border-b border-line"
          >
            <span className="absolute inset-0 origin-bottom scale-y-0 bg-blood transition-transform duration-500 ease-[cubic-bezier(.16,1,.3,1)] group-hover:scale-y-100" />
            <div className="relative grid grid-cols-12 items-center gap-2 py-4 md:py-6">
              <span className="col-span-2 font-mono text-xs text-ash transition-colors group-hover:text-ink md:col-span-1">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="display col-span-10 text-[8vw] transition-all duration-500 group-hover:translate-x-2 group-hover:text-ink md:col-span-6 md:text-[3.6vw]">
                {t}
              </span>
              <span className="col-span-10 col-start-3 text-sm text-bone/60 transition-colors group-hover:text-ink md:col-span-4 md:col-start-8 md:text-base">
                {d}
              </span>
              <span className="hidden text-right text-xl transition-transform duration-500 group-hover:-rotate-45 group-hover:text-ink md:col-span-1 md:block">
                →
              </span>
            </div>
          </motion.li>
        ))}
      </ul>
    </section>
  );
}

/* ─────────────────────────── Pricing ─────────────────────────── */
export function Pricing() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const scale = useTransform(scrollYProgress, [0, 0.5], [0.6, 1]);
  const rotate = useTransform(scrollYProgress, [0, 0.5], [-8, 0]);
  return (
    <section id="pricing" ref={ref} className="relative overflow-hidden bg-blood px-4 py-24 text-ink md:px-10 md:py-36">
      <div className="streaks pointer-events-none absolute inset-0 opacity-25" />
      <div className="relative grid gap-12 md:grid-cols-12">
        <div className="md:col-span-7">
          <p className="label mb-8 text-ink/70">(06) Pricing — one offer, no tiers</p>
          <RevealLines
            lines={["Your personal", "website for"]}
            className="display text-[12vw] md:text-[6.2vw]"
          />
          <motion.div style={{ scale, rotate }} className="origin-left">
            <span className="display block text-[46vw] leading-[0.8] text-ink md:text-[24vw]">
              ₹{siteConfig.price}
            </span>
          </motion.div>
        </div>
        <div className="flex flex-col justify-end md:col-span-4 md:col-start-9">
          <div className="rounded-[1.5rem] bg-ink p-7 text-bone md:p-9">
            <div className="flex items-baseline justify-between border-b border-line pb-6">
              <span className="label text-ash">One-time</span>
              <span className="font-display text-4xl font-bold">₹{siteConfig.price}</span>
            </div>
            <ul className="space-y-3 py-6 text-bone/85">
              {["No hidden charges", "No subscription", "Personal shareable URL", "All 12 sections included", "Designed for mobile", "Pay with any UPI app"].map((x) => (
                <li key={x} className="flex items-center gap-3">
                  <span className="h-1.5 w-1.5 rotate-45 bg-blood" />
                  {x}
                </li>
              ))}
            </ul>
            <Button href="/create" size="lg" cursor="Begin" className="w-full">
              Build my website
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────── FAQ ─────────────────────────── */
const FAQS: [string, string][] = [
  [
    `What do I get for ₹${siteConfig.price}?`,
    "A personal portfolio website with its own link — about, education, skills, projects, experience, achievements, certifications, resume download, contact and social links — designed in the style and colour you choose.",
  ],
  [
    "How long does it take?",
    "The form takes about 10 minutes. After you pay, we verify the payment manually and then publish your site. You'll see the expected delivery time on your status page.",
  ],
  [
    "Can I edit my information later?",
    "Yes. Reach out with your submission ID and we'll update your portfolio. Your link stays the same.",
  ],
  ["Will my website work on mobile?", "Absolutely. Every portfolio is designed mobile-first and looks great on iPhone, Android, tablets and desktops."],
  [
    "Can I share my website with recruiters?",
    "That's exactly what it's for. Put the link on your resume, LinkedIn, Instagram bio, emails and job applications.",
  ],
  [
    "How do I receive my website link?",
    "After submitting payment you get a private status page (bookmark it!). Once your payment is verified and your site is published, your link appears right there, ready to copy and share.",
  ],
];

export function FAQ() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section id="faq" className="relative px-4 py-24 md:px-10 md:py-40">
      <div className="grid gap-10 md:grid-cols-12">
        <div className="md:col-span-4">
          <p className="label mb-8 text-ash">
            <span className="text-blood">(07)</span> Questions
          </p>
          <RevealLines lines={["Good", "questions."]} className="display text-[14vw] md:text-[5.6vw]" />
        </div>
        <div className="md:col-span-8">
          {FAQS.map(([q, a], i) => (
            <div key={q} className="border-b border-line">
              <button
                className="flex w-full items-center justify-between gap-6 py-6 text-left md:py-8"
                onClick={() => setOpen(open === i ? null : i)}
                aria-expanded={open === i}
                data-cursor={open === i ? "Close" : "Open"}
              >
                <span className={`font-display text-xl font-medium tracking-tight transition-colors md:text-3xl ${open === i ? "text-blood" : ""}`}>
                  {q}
                </span>
                <span
                  className={`relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full border transition-all duration-500 ${open === i ? "rotate-45 border-blood bg-blood" : "border-bone/30"}`}
                >
                  <span className="absolute h-[1.5px] w-4 bg-bone" />
                  <span className="absolute h-4 w-[1.5px] bg-bone" />
                </span>
              </button>
              <AnimatePresence initial={false}>
                {open === i && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.6, ease: EASE }}
                    className="overflow-hidden"
                  >
                    <p className="max-w-2xl pb-8 text-base leading-relaxed text-bone/70 md:text-lg">{a}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────── Final CTA ─────────────────────────── */
export function FinalCTA() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "center center"] });
  const strike = useTransform(scrollYProgress, [0.35, 0.85], [0, 1]);
  return (
    <section ref={ref} className="relative overflow-hidden px-4 py-28 md:px-10 md:py-48">
      <div aria-hidden className="pointer-events-none absolute inset-0 opacity-40 [background:radial-gradient(60%_50%_at_50%_100%,#8b0008,transparent)]" />
      <h2 className="display relative text-[13.2vw] md:text-[8.6vw]">
        <span className="block">Stop sending</span>
        <span className="relative inline-block text-bone/40">
          just a resume.
          <motion.span
            style={{ scaleX: strike }}
            className="absolute left-0 top-[48%] h-[0.08em] w-full origin-left bg-blood"
          />
        </span>
        <span className="block">Start sending</span>
        <span className="editorial block normal-case text-blood">your story.</span>
      </h2>
      <div className="relative mt-14 flex flex-col items-start gap-6 md:flex-row md:items-center md:justify-between">
        <RevealWords
          text={`Ten minutes, ₹${siteConfig.price}, and a link you'll be proud to share.`}
          className="max-w-md text-lg text-bone/70"
        />
        <Button href="/create" size="xl" cursor="Begin">
          Create your portfolio
        </Button>
      </div>
    </section>
  );
}
