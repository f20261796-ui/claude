"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { z } from "zod";
import {
  EXPERIENCE_KINDS,
  STYLES,
  designSchema,
  educationSchema,
  experienceSchema,
  flattenErrors,
  personalSchema,
  projectSchema,
  recognitionSchema,
  skillSchema,
  socialsSchema,
  submissionSchema,
  type DesignStyle,
  type SubmissionInput,
} from "@/lib/schema";
import { AddButton, EntryCard, SelectField, TagInput, TextArea, TextField, Toggle } from "./fields";
import Uploader from "./Uploader";
import Button from "@/components/brand/Button";
import { useTransitionNav } from "@/components/motion/PageTransition";
import { useLenis } from "@/components/motion/SmoothScroll";
import { THEMES } from "@/components/portfolio/themes";
import { siteConfig } from "@/lib/config";

/* ───────────── state ───────────── */

export type FormState = Omit<SubmissionInput, "consent"> & { consent: boolean };
type Ed = NonNullable<FormState["education"]>[number];
type Pr = NonNullable<FormState["projects"]>[number];
type Ex = NonNullable<FormState["experience"]>[number];
type Rc = NonNullable<FormState["achievements"]>[number];

const STORAGE_KEY = "identity:draft:v1";

export function emptyForm(): FormState {
  return {
    draftId: crypto.randomUUID(),
    personal: { fullName: "", headline: "", email: "", phone: "", showPhone: false, city: "", intro: "", about: "", photoPath: "" },
    education: [],
    skills: [],
    projects: [],
    experience: [],
    achievements: [],
    certifications: [],
    socials: { linkedin: "", github: "", instagram: "", x: "", behance: "", website: "", extra: [] },
    resumePath: "",
    design: { style: "cinematic", accent: "#e1121b" },
    consent: false,
  };
}

export const emptyEdu = (): Ed => ({ institution: "", degree: "", field: "", startYear: "", endYear: "", grade: "" });
export const emptyProject = (): Pr => ({ title: "", description: "", tech: [], imagePath: "", githubUrl: "", liveUrl: "" });
export const emptyExp = (): Ex => ({ company: "", role: "", kind: "", duration: "", description: "" });
export const emptyRec = (): Rc => ({ title: "", description: "", issuer: "", date: "", link: "" });

const STEPS = [
  { key: "personal", title: "About you", lead: "Let's start with the basics — who you are and how people can reach you." },
  { key: "education", title: "Education", lead: "Where you studied. Add as many as you like, or skip ahead." },
  { key: "skills", title: "Skills", lead: "What you're good at. Rate yourself honestly — it shows on your site." },
  { key: "projects", title: "Projects", lead: "Show your work. College projects, side projects, anything you're proud of." },
  { key: "experience", title: "Experience", lead: "Internships, jobs, freelance gigs, volunteering. No experience yet? Totally fine — skip it." },
  { key: "recognition", title: "Wins", lead: "Achievements and certifications worth bragging about." },
  { key: "socials", title: "Links", lead: "Where else can people find you online?" },
  { key: "resume", title: "Resume", lead: "Upload your resume so recruiters can download it in one tap." },
  { key: "design", title: "Style", lead: "Pick a mood and an accent colour. We'll design around it." },
  { key: "review", title: "Review", lead: "Check everything. You can jump back to any step to edit." },
] as const;

const SKILL_SUGGESTIONS = [
  "Python", "Java", "JavaScript", "React", "SQL", "C++", "UI/UX", "Figma", "Canva", "Excel",
  "Marketing", "Financial analysis", "Communication", "Leadership", "Data analysis", "Machine learning",
  "Content writing", "Public speaking", "Photoshop", "Video editing",
];

const ACCENTS = ["#e1121b", "#ff5c39", "#ffb703", "#00e0a4", "#2743ff", "#7c5cff", "#ff3d9a", "#f2ede4"];

const STYLE_META: Record<DesignStyle, { name: string; desc: string }> = {
  cinematic: { name: "Dark cinematic", desc: "Black, editorial serif, dramatic." },
  minimalist: { name: "Minimalist", desc: "Light, calm, lots of space." },
  futuristic: { name: "Futuristic", desc: "Dark grid, mono type, glow." },
  colourful: { name: "Creative & colourful", desc: "Bold colour, playful shapes." },
};

/* ───────────── validation per step ───────────── */

function validateStep(i: number, f: FormState): Record<string, string> {
  const run = (schema: z.ZodType, value: unknown, prefix: string) => {
    const r = schema.safeParse(value);
    if (r.success) return {};
    const flat = flattenErrors(r.error);
    return Object.fromEntries(Object.entries(flat).map(([k, v]) => [k ? `${prefix}.${k}` : prefix, v]));
  };
  switch (STEPS[i].key) {
    case "personal":
      return run(personalSchema, f.personal, "personal");
    case "education":
      return run(z.array(educationSchema), f.education, "education");
    case "skills":
      return run(z.array(skillSchema), f.skills, "skills");
    case "projects":
      return run(z.array(projectSchema), f.projects, "projects");
    case "experience":
      return run(z.array(experienceSchema), f.experience, "experience");
    case "recognition":
      return { ...run(z.array(recognitionSchema), f.achievements, "achievements"), ...run(z.array(recognitionSchema), f.certifications, "certifications") };
    case "socials":
      return run(socialsSchema, f.socials, "socials");
    case "design":
      return run(designSchema, f.design, "design");
    case "review": {
      const r = submissionSchema.safeParse(f);
      return r.success ? {} : flattenErrors(r.error);
    }
    default:
      return {};
  }
}

function stepOfError(key: string): number {
  const head = key.split(".")[0];
  const map: Record<string, string> = { achievements: "recognition", certifications: "recognition", resumePath: "resume", consent: "review" };
  return Math.max(0, STEPS.findIndex((s) => s.key === (map[head] ?? head)));
}

/* ───────────── component ───────────── */

export default function CreateWizard() {
  const [form, setForm] = useState<FormState | null>(null);
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [restored, setRestored] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const { go } = useTransitionNav();
  const lenis = useLenis();
  const topRef = useRef<HTMLDivElement>(null);

  // restore saved progress
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as { form: FormState; step: number };
        if (saved?.form?.draftId) {
          setForm({ ...emptyForm(), ...saved.form, consent: false });
          setStep(Math.min(saved.step ?? 0, STEPS.length - 1));
          setRestored(true);
          return;
        }
      }
    } catch {}
    setForm(emptyForm());
  }, []);

  // autosave (debounced)
  useEffect(() => {
    if (!form) return;
    const id = window.setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ form, step, savedAt: Date.now() }));
        setSavedAt(Date.now());
      } catch {}
    }, 400);
    return () => window.clearTimeout(id);
  }, [form, step]);

  const update = useCallback(<K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((f) => (f ? { ...f, [key]: value } : f));
  }, []);

  const scrollTop = () => {
    if (lenis) lenis.scrollTo(0, { duration: 0.8 });
    else window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const goTo = (i: number) => {
    setDir(i > step ? 1 : -1);
    setStep(i);
    setErrors({});
    scrollTop();
  };

  const next = () => {
    if (!form) return;
    const errs = validateStep(step, form);
    setErrors(errs);
    if (Object.keys(errs).length) {
      requestAnimationFrame(() => document.querySelector("[aria-invalid=true], [role=alert]")?.scrollIntoView({ block: "center", behavior: "smooth" }));
      return;
    }
    if (step < STEPS.length - 1) goTo(step + 1);
  };

  const submit = async () => {
    if (!form) return;
    const errs = validateStep(STEPS.length - 1, form);
    if (Object.keys(errs).length) {
      setErrors(errs);
      const first = Object.keys(errs)[0];
      const s = stepOfError(first);
      if (s !== step) goTo(s);
      setTimeout(() => setErrors(errs), 50);
      return;
    }
    setSubmitting(true);
    setSubmitError("");
    try {
      const res = await fetch("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (json.fields) {
          const first = Object.keys(json.fields)[0];
          goTo(stepOfError(first));
          setTimeout(() => setErrors(json.fields), 50);
        }
        throw new Error(json.error ?? "Something went wrong.");
      }
      try {
        localStorage.removeItem(STORAGE_KEY);
        localStorage.setItem("identity:last-submission", json.id);
      } catch {}
      go(`/pay/${json.id}`);
    } catch (e) {
      setSubmitError((e as Error).message);
      setSubmitting(false);
    }
  };

  const reset = () => {
    if (!confirm("Start over? This clears everything you've entered.")) return;
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
    setForm(emptyForm());
    setRestored(false);
    goTo(0);
  };

  const preview = (path?: string) => (form && path ? `/api/uploads/view?draft=${form.draftId}&path=${encodeURIComponent(path)}` : "");

  if (!form) return <div className="min-h-[100svh]" />;
  const s = STEPS[step];
  const target = { draftId: form.draftId };
  const optional = !["personal", "review", "design"].includes(s.key);
  const sectionEmpty =
    (s.key === "education" && !form.education?.length) ||
    (s.key === "skills" && !form.skills?.length) ||
    (s.key === "projects" && !form.projects?.length) ||
    (s.key === "experience" && !form.experience?.length) ||
    (s.key === "recognition" && !form.achievements?.length && !form.certifications?.length) ||
    (s.key === "resume" && !form.resumePath);

  return (
    <div ref={topRef} className="relative min-h-[100svh] pb-36 pt-20 md:pt-28">
      {/* progress */}
      <div className="sticky top-0 z-30 border-b border-line bg-ink/80 px-4 pb-3 pt-3 backdrop-blur-xl md:static md:border-0 md:bg-transparent md:px-10 md:backdrop-blur-0">
        <div className="mb-3 flex items-center justify-between">
          <span className="label text-bone/60">
            Step <span className="text-bone">{String(step + 1).padStart(2, "0")}</span> / {STEPS.length}
          </span>
          <span className="label flex items-center gap-2 text-bone/40">
            <span className={`h-1.5 w-1.5 rounded-full ${savedAt ? "bg-emerald-400" : "bg-bone/30"}`} />
            {savedAt ? "Progress saved on this device" : "Autosave on"}
          </span>
        </div>
        <div className="flex gap-1">
          {STEPS.map((st, i) => (
            <button
              key={st.key}
              type="button"
              onClick={() => (i < step ? goTo(i) : undefined)}
              disabled={i > step}
              aria-label={`Step ${i + 1}: ${st.title}`}
              className="group relative h-6 flex-1"
            >
              <span className="absolute inset-x-0 top-1/2 h-[3px] -translate-y-1/2 overflow-hidden rounded-full bg-bone/10">
                <motion.span
                  className="absolute inset-0 origin-left bg-blood"
                  initial={false}
                  animate={{ scaleX: i < step ? 1 : i === step ? 0.5 : 0 }}
                  transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                />
              </span>
              <span className="label absolute left-0 top-6 hidden whitespace-nowrap text-[9px] text-bone/40 group-enabled:group-hover:text-bone lg:block">
                {st.title}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="mt-8 grid grid-cols-[minmax(0,1fr)] gap-10 px-4 md:mt-16 md:grid-cols-12 md:px-10">
        {/* left: step title */}
        <aside className="min-w-0 md:col-span-4">
          <div className="md:sticky md:top-28">
            <AnimatePresence mode="wait">
              <motion.div
                key={s.key}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              >
                <span className="display outline-text block text-[28vw] leading-[0.75] text-blood/80 md:text-[11vw]">
                  {String(step + 1).padStart(2, "0")}
                </span>
                <h1 className="display mt-4 text-[13vw] md:text-[4.6vw]">
                  {s.title}
                  <span className="text-blood">.</span>
                </h1>
                <p className="mt-4 max-w-sm text-bone/60">{s.lead}</p>
              </motion.div>
            </AnimatePresence>
            {restored && step === 0 && (
              <p className="mt-6 max-w-sm rounded-xl border border-line p-4 text-sm text-bone/60">
                Welcome back — we restored your progress.{" "}
                <button type="button" onClick={reset} className="text-blood underline underline-offset-4">
                  Start over
                </button>
              </p>
            )}
          </div>
        </aside>

        {/* right: fields */}
        <section className="min-w-0 md:col-span-7 md:col-start-6">
          <AnimatePresence mode="wait" custom={dir}>
            <motion.div
              key={s.key}
              custom={dir}
              initial={{ opacity: 0, x: dir * 60, filter: "blur(8px)" }}
              animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, x: dir * -60, filter: "blur(8px)" }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="space-y-10"
            >
              {s.key === "personal" && (
                <>
                  <Uploader
                    kind="photo"
                    label="Profile photograph"
                    hint="A clear photo of your face works best"
                    shape="circle"
                    value={form.personal.photoPath ?? ""}
                    previewUrl={preview(form.personal.photoPath)}
                    onChange={(v) => update("personal", { ...form.personal, photoPath: v })}
                    target={target}
                  />
                  <div className="grid gap-8 md:grid-cols-2">
                    <TextField
                      label="Full name"
                      required
                      autoComplete="name"
                      value={form.personal.fullName}
                      onChange={(v) => update("personal", { ...form.personal, fullName: v })}
                      error={errors["personal.fullName"]}
                      placeholder="Ishaan Sharma"
                      maxLength={120}
                    />
                    <TextField
                      label="Professional headline"
                      value={form.personal.headline ?? ""}
                      onChange={(v) => update("personal", { ...form.personal, headline: v })}
                      error={errors["personal.headline"]}
                      placeholder="Computer science student & app developer"
                      maxLength={160}
                    />
                    <TextField
                      label="Email"
                      required
                      type="email"
                      inputMode="email"
                      autoComplete="email"
                      value={form.personal.email}
                      onChange={(v) => update("personal", { ...form.personal, email: v })}
                      error={errors["personal.email"]}
                      placeholder="you@example.com"
                      hint="We'll use this to reach you about your portfolio"
                    />
                    <TextField
                      label="Phone number"
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel"
                      value={form.personal.phone ?? ""}
                      onChange={(v) => update("personal", { ...form.personal, phone: v })}
                      error={errors["personal.phone"]}
                      placeholder="+91 98765 43210"
                    />
                    <TextField
                      label="City"
                      autoComplete="address-level2"
                      value={form.personal.city ?? ""}
                      onChange={(v) => update("personal", { ...form.personal, city: v })}
                      error={errors["personal.city"]}
                      placeholder="Pune, India"
                    />
                    <div className="flex items-end pb-2">
                      <Toggle
                        label="Show phone on my website"
                        hint="Off by default — your email is always shown."
                        checked={!!form.personal.showPhone}
                        onChange={(v) => update("personal", { ...form.personal, showPhone: v })}
                      />
                    </div>
                  </div>
                  <TextArea
                    label="Short introduction"
                    max={400}
                    rows={3}
                    value={form.personal.intro ?? ""}
                    onChange={(v) => update("personal", { ...form.personal, intro: v })}
                    error={errors["personal.intro"]}
                    placeholder="One or two lines that appear right under your name."
                  />
                  <TextArea
                    label="About me"
                    max={4000}
                    rows={6}
                    value={form.personal.about ?? ""}
                    onChange={(v) => update("personal", { ...form.personal, about: v })}
                    error={errors["personal.about"]}
                    placeholder="Your story — what you study, what drives you, what you're looking for."
                  />
                </>
              )}

              {s.key === "education" && (
                <ListEditor
                  items={form.education ?? []}
                  onChange={(v) => update("education", v)}
                  make={emptyEdu}
                  addLabel="Add education"
                  max={10}
                  title={(e) => e.institution || "New entry"}
                  render={(e, set, i) => (
                    <>
                      <TextField className="md:col-span-2" label="Institution name" required value={e.institution} onChange={(v) => set({ ...e, institution: v })} error={errors[`education.${i}.institution`]} placeholder="Delhi University" />
                      <TextField label="Degree / course" value={e.degree ?? ""} onChange={(v) => set({ ...e, degree: v })} placeholder="B.Tech" />
                      <TextField label="Field of study" value={e.field ?? ""} onChange={(v) => set({ ...e, field: v })} placeholder="Computer Science" />
                      <TextField label="Start year" inputMode="numeric" value={e.startYear ?? ""} onChange={(v) => set({ ...e, startYear: v })} placeholder="2022" maxLength={20} />
                      <TextField label="Graduation year" inputMode="numeric" value={e.endYear ?? ""} onChange={(v) => set({ ...e, endYear: v })} placeholder="2026 (expected)" maxLength={20} />
                      <TextField label="Grade / CGPA" value={e.grade ?? ""} onChange={(v) => set({ ...e, grade: v })} placeholder="8.6 CGPA" maxLength={40} />
                    </>
                  )}
                />
              )}

              {s.key === "skills" && <SkillsEditor skills={form.skills ?? []} onChange={(v) => update("skills", v)} />}

              {s.key === "projects" && (
                <ListEditor
                  items={form.projects ?? []}
                  onChange={(v) => update("projects", v)}
                  make={emptyProject}
                  addLabel="Add project"
                  max={12}
                  title={(p) => p.title || "New project"}
                  render={(p, set, i) => (
                    <>
                      <TextField className="md:col-span-2" label="Project title" required value={p.title} onChange={(v) => set({ ...p, title: v })} error={errors[`projects.${i}.title`]} placeholder="Campus marketplace app" />
                      <TextArea className="md:col-span-2" label="Description" max={1500} rows={3} value={p.description ?? ""} onChange={(v) => set({ ...p, description: v })} placeholder="What it does, your role, the result." />
                      <div className="md:col-span-2">
                        <TagInput label="Technologies used" value={p.tech ?? []} onChange={(v) => set({ ...p, tech: v })} placeholder="React, Firebase… press Enter" />
                      </div>
                      <div className="md:col-span-2">
                        <Uploader kind="project" label="Project image" value={p.imagePath ?? ""} previewUrl={preview(p.imagePath)} onChange={(v) => set({ ...p, imagePath: v })} target={target} />
                      </div>
                      <TextField label="GitHub link" inputMode="url" value={p.githubUrl ?? ""} onChange={(v) => set({ ...p, githubUrl: v })} error={errors[`projects.${i}.githubUrl`]} placeholder="github.com/you/project" />
                      <TextField label="Live demo link" inputMode="url" value={p.liveUrl ?? ""} onChange={(v) => set({ ...p, liveUrl: v })} error={errors[`projects.${i}.liveUrl`]} placeholder="project.vercel.app" />
                    </>
                  )}
                />
              )}

              {s.key === "experience" && (
                <ListEditor
                  items={form.experience ?? []}
                  onChange={(v) => update("experience", v)}
                  make={emptyExp}
                  addLabel="Add experience"
                  max={12}
                  title={(e) => e.company || "New experience"}
                  render={(e, set, i) => (
                    <>
                      <TextField label="Company / organisation" required value={e.company} onChange={(v) => set({ ...e, company: v })} error={errors[`experience.${i}.company`]} placeholder="Acme Labs" />
                      <TextField label="Position" value={e.role ?? ""} onChange={(v) => set({ ...e, role: v })} placeholder="Marketing intern" />
                      <TextField className="md:col-span-2" label="Duration" value={e.duration ?? ""} onChange={(v) => set({ ...e, duration: v })} placeholder="May 2025 — Jul 2025" maxLength={80} />
                      <SelectField className="md:col-span-2" label="Type" value={e.kind ?? ""} onChange={(v) => set({ ...e, kind: v })} options={EXPERIENCE_KINDS} />
                      <TextArea className="md:col-span-2" label="Description" max={1500} rows={3} value={e.description ?? ""} onChange={(v) => set({ ...e, description: v })} placeholder="What you did and what changed because of it." />
                    </>
                  )}
                />
              )}

              {s.key === "recognition" && (
                <>
                  <div>
                    <h3 className="display mb-5 text-2xl">Achievements</h3>
                    <ListEditor
                      items={form.achievements ?? []}
                      onChange={(v) => update("achievements", v)}
                      make={emptyRec}
                      addLabel="Add achievement"
                      max={15}
                      title={(a) => a.title || "New achievement"}
                      render={(a, set, i) => <RecognitionFields a={a} set={set} err={(k) => errors[`achievements.${i}.${k}`]} />}
                    />
                  </div>
                  <div>
                    <h3 className="display mb-5 text-2xl">Certifications</h3>
                    <ListEditor
                      items={form.certifications ?? []}
                      onChange={(v) => update("certifications", v)}
                      make={emptyRec}
                      addLabel="Add certification"
                      max={15}
                      title={(a) => a.title || "New certification"}
                      render={(a, set, i) => <RecognitionFields a={a} set={set} err={(k) => errors[`certifications.${i}.${k}`]} cert />}
                    />
                  </div>
                </>
              )}

              {s.key === "socials" && (
                <>
                  <div className="grid gap-8 md:grid-cols-2">
                    {(
                      [
                        ["linkedin", "LinkedIn", "linkedin.com/in/you"],
                        ["github", "GitHub", "github.com/you"],
                        ["instagram", "Instagram", "instagram.com/you"],
                        ["x", "X (Twitter)", "x.com/you"],
                        ["behance", "Behance", "behance.net/you"],
                        ["website", "Personal website", "yourname.com"],
                      ] as const
                    ).map(([k, l, ph]) => (
                      <TextField
                        key={k}
                        label={l}
                        inputMode="url"
                        value={form.socials[k] ?? ""}
                        onChange={(v) => update("socials", { ...form.socials, [k]: v })}
                        error={errors[`socials.${k}`]}
                        placeholder={ph}
                      />
                    ))}
                  </div>
                  <div>
                    <p className="label mb-4 text-bone/55">Other links</p>
                    <div className="space-y-4">
                      {(form.socials.extra ?? []).map((x, i) => (
                        <div key={i} className="grid grid-cols-[1fr_2fr_auto] items-end gap-3">
                          <TextField label="Label" value={x.label} onChange={(v) => update("socials", { ...form.socials, extra: form.socials.extra!.map((e, j) => (j === i ? { ...e, label: v } : e)) })} error={errors[`socials.extra.${i}.label`]} placeholder="Medium" />
                          <TextField label="URL" inputMode="url" value={x.url ?? ""} onChange={(v) => update("socials", { ...form.socials, extra: form.socials.extra!.map((e, j) => (j === i ? { ...e, url: v } : e)) })} error={errors[`socials.extra.${i}.url`]} placeholder="medium.com/@you" />
                          <button type="button" aria-label="Remove link" onClick={() => update("socials", { ...form.socials, extra: form.socials.extra!.filter((_, j) => j !== i) })} className="mb-2 h-10 w-10 rounded-full border border-bone/15 text-bone/60 hover:border-blood hover:text-blood">
                            ×
                          </button>
                        </div>
                      ))}
                      {(form.socials.extra?.length ?? 0) < 8 && (
                        <AddButton label="Add a link" onClick={() => update("socials", { ...form.socials, extra: [...(form.socials.extra ?? []), { label: "", url: "" }] })} />
                      )}
                    </div>
                  </div>
                </>
              )}

              {s.key === "resume" && (
                <Uploader kind="resume" label="Resume (PDF)" value={form.resumePath ?? ""} previewUrl={preview(form.resumePath)} onChange={(v) => update("resumePath", v)} target={target} />
              )}

              {s.key === "design" && <DesignPicker value={form.design} onChange={(v) => update("design", v)} />}

              {s.key === "review" && <Review form={form} goTo={goTo} errors={errors} onConsent={(v) => {
                    update("consent", v);
                    if (v) setErrors(({ consent: _c, ...rest }) => (void _c, rest));
                  }} />}
            </motion.div>
          </AnimatePresence>

          {submitError && (
            <p role="alert" className="mt-8 rounded-xl border border-[#ff6b6f]/40 bg-[#ff6b6f]/10 p-4 text-sm text-[#ffb3b5]">
              {submitError}
            </p>
          )}
        </section>
      </div>

      {/* action bar */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-ink/85 px-4 py-3 backdrop-blur-xl md:px-10 md:py-4" style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}>
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => goTo(step - 1)}
            disabled={step === 0}
            className="label flex h-12 items-center gap-2 rounded-full px-4 text-bone/70 transition-colors hover:text-bone disabled:opacity-0"
          >
            ← Back
          </button>
          <div className="flex items-center gap-3">
            {optional && sectionEmpty && (
              <button type="button" onClick={next} className="label hidden h-12 rounded-full px-4 text-bone/50 hover:text-bone sm:block">
                Skip for now
              </button>
            )}
            {step < STEPS.length - 1 ? (
              <Button onClick={next} size="md" cursor="Next">
                {optional && sectionEmpty ? "Skip" : "Continue"}
              </Button>
            ) : (
              <Button onClick={submit} size="md" disabled={submitting} cursor="Pay">
                {submitting ? "Saving…" : "Continue to payment"}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ───────────── sub-editors ───────────── */

export function ListEditor<T>({
  items,
  onChange,
  make,
  render,
  title,
  addLabel,
  max,
}: {
  items: T[];
  onChange: (v: T[]) => void;
  make: () => T;
  render: (item: T, set: (v: T) => void, i: number) => React.ReactNode;
  title: (item: T) => string;
  addLabel: string;
  max: number;
}) {
  return (
    <div className="space-y-4">
      <AnimatePresence initial={false}>
        {items.map((it, i) => (
          <EntryCard key={i} index={i} title={title(it)} onRemove={() => onChange(items.filter((_, j) => j !== i))}>
            {render(it, (v) => onChange(items.map((x, j) => (j === i ? v : x))), i)}
          </EntryCard>
        ))}
      </AnimatePresence>
      {items.length < max && <AddButton label={items.length ? `${addLabel} (another)` : addLabel} onClick={() => onChange([...items, make()])} />}
    </div>
  );
}

export function RecognitionFields({ a, set, err, cert }: { a: Rc; set: (v: Rc) => void; err: (k: string) => string | undefined; cert?: boolean }) {
  return (
    <>
      <TextField className="md:col-span-2" label="Title" required value={a.title} onChange={(v) => set({ ...a, title: v })} error={err("title")} placeholder={cert ? "AWS Cloud Practitioner" : "Winner, Smart India Hackathon"} />
      <TextField label="Issuing organisation" value={a.issuer ?? ""} onChange={(v) => set({ ...a, issuer: v })} placeholder={cert ? "Amazon Web Services" : "Ministry of Education"} />
      <TextField label="Date" value={a.date ?? ""} onChange={(v) => set({ ...a, date: v })} placeholder="March 2025" maxLength={40} />
      <TextArea className="md:col-span-2" label="Description" max={800} rows={2} value={a.description ?? ""} onChange={(v) => set({ ...a, description: v })} />
      <TextField className="md:col-span-2" label="Certificate link" inputMode="url" value={a.link ?? ""} onChange={(v) => set({ ...a, link: v })} error={err("link")} placeholder="credly.com/badges/…" />
    </>
  );
}

export function SkillsEditor({ skills, onChange }: { skills: { name: string; level?: number }[]; onChange: (v: { name: string; level: number }[]) => void }) {
  const list = skills.map((s) => ({ name: s.name, level: s.level ?? 3 }));
  return (
    <div className="space-y-8">
      <TagInput
        label="Add your skills"
        value={list.map((s) => s.name)}
        max={40}
        onChange={(names) => onChange(names.map((n) => list.find((s) => s.name === n) ?? { name: n, level: 3 }))}
        placeholder="Type a skill and press Enter"
        suggestions={SKILL_SUGGESTIONS}
      />
      {list.length > 0 && (
        <div>
          <p className="label mb-4 text-bone/55">How strong is each one?</p>
          <ul className="divide-y divide-line border-y border-line">
            {list.map((s, i) => (
              <li key={s.name} className="flex items-center justify-between gap-4 py-3">
                <span className="truncate">{s.name}</span>
                <div className="flex shrink-0 items-center gap-1.5" role="radiogroup" aria-label={`${s.name} level`}>
                  {[1, 2, 3, 4, 5].map((l) => (
                    <button
                      key={l}
                      type="button"
                      role="radio"
                      aria-checked={s.level === l}
                      aria-label={`Level ${l}`}
                      onClick={() => onChange(list.map((x, j) => (j === i ? { ...x, level: l } : x)))}
                      className={`h-7 w-7 rounded-full border text-[10px] transition-all md:h-8 md:w-8 ${
                        l <= s.level ? "border-blood bg-blood text-bone" : "border-bone/20 text-bone/40 hover:border-bone/50"
                      }`}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export function DesignPicker({ value, onChange }: { value: { style?: DesignStyle; accent?: string }; onChange: (v: { style: DesignStyle; accent: string }) => void }) {
  const style = value.style ?? "cinematic";
  const accent = value.accent ?? "#e1121b";
  return (
    <div className="space-y-12">
      <div className="grid gap-4 sm:grid-cols-2">
        {STYLES.map((st) => {
          const t = THEMES[st];
          const on = st === style;
          return (
            <button
              type="button"
              key={st}
              onClick={() => onChange({ style: st, accent })}
              aria-pressed={on}
              className={`group relative overflow-hidden rounded-2xl border-2 p-2 text-left transition-all ${on ? "border-blood" : "border-transparent hover:border-bone/20"}`}
            >
              <div className="relative aspect-[16/10] overflow-hidden rounded-xl p-4" style={{ background: t.bg, color: t.fg }}>
                {st === "futuristic" && (
                  <div className="absolute inset-0 opacity-40" style={{ backgroundImage: `linear-gradient(${t.line} 1px, transparent 1px), linear-gradient(90deg, ${t.line} 1px, transparent 1px)`, backgroundSize: "18px 18px" }} />
                )}
                {st === "colourful" && <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full" style={{ background: accent }} />}
                <div className="relative flex h-full flex-col justify-between">
                  <span className={`${t.label} text-[8px] opacity-60`}>Portfolio</span>
                  <div>
                    <span className={`${t.display} block text-3xl`}>Your</span>
                    <span className={`${t.display} block text-3xl`} style={{ color: st === "minimalist" || st === "futuristic" ? t.fg : accent }}>
                      Name
                    </span>
                    <div className="mt-2 flex gap-1">
                      <span className="h-1 w-8" style={{ background: accent }} />
                      <span className="h-1 w-5 opacity-30" style={{ background: t.fg }} />
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between px-2 pb-1 pt-3">
                <div>
                  <p className="font-display font-bold uppercase tracking-tight">{STYLE_META[st].name}</p>
                  <p className="text-sm text-bone/50">{STYLE_META[st].desc}</p>
                </div>
                <span className={`flex h-6 w-6 items-center justify-center rounded-full border ${on ? "border-blood bg-blood" : "border-bone/30"}`}>{on && "✓"}</span>
              </div>
            </button>
          );
        })}
      </div>
      <div>
        <p className="label mb-4 text-bone/55">Accent colour</p>
        <div className="flex flex-wrap items-center gap-3">
          {ACCENTS.map((c) => (
            <button
              type="button"
              key={c}
              aria-label={`Accent ${c}`}
              aria-pressed={accent.toLowerCase() === c}
              onClick={() => onChange({ style, accent: c })}
              className={`h-11 w-11 rounded-full transition-transform hover:scale-110 ${accent.toLowerCase() === c ? "ring-2 ring-bone ring-offset-4 ring-offset-ink" : ""}`}
              style={{ background: c }}
            />
          ))}
          <label className="relative flex h-11 items-center gap-2 rounded-full border border-bone/20 pl-1 pr-4 text-sm text-bone/70">
            <input type="color" value={accent} onChange={(e) => onChange({ style, accent: e.target.value })} className="h-9 w-9 cursor-pointer rounded-full border-0 bg-transparent p-0" aria-label="Custom accent colour" />
            Custom
          </label>
        </div>
      </div>
    </div>
  );
}

function Review({ form, goTo, errors, onConsent }: { form: FormState; goTo: (i: number) => void; errors: Record<string, string>; onConsent: (v: boolean) => void }) {
  const p = form.personal;
  const rows: { step: number; title: string; content: React.ReactNode; empty: boolean }[] = useMemo(
    () => [
      {
        step: 0,
        title: "About you",
        empty: false,
        content: (
          <div className="space-y-1">
            <p className="font-display text-2xl font-bold">{p.fullName || "—"}</p>
            {p.headline && <p className="text-bone/70">{p.headline}</p>}
            <p className="text-sm text-bone/50">{[p.email, p.phone, p.city].filter(Boolean).join(" · ")}</p>
            {p.photoPath && <p className="text-sm text-emerald-400">✓ Photo uploaded</p>}
            {p.intro && <p className="pt-2 text-sm text-bone/60">{p.intro}</p>}
          </div>
        ),
      },
      { step: 1, title: "Education", empty: !form.education?.length, content: form.education?.map((e) => <p key={e.institution}>{e.institution}<span className="text-bone/50"> — {[e.degree, e.field, e.endYear].filter(Boolean).join(", ")}</span></p>) },
      { step: 2, title: "Skills", empty: !form.skills?.length, content: <div className="flex flex-wrap gap-2">{form.skills?.map((s) => <span key={s.name} className="rounded-full bg-bone/10 px-3 py-1 text-sm">{s.name} · {s.level}</span>)}</div> },
      { step: 3, title: "Projects", empty: !form.projects?.length, content: form.projects?.map((x, i) => <p key={i}>{x.title}{x.imagePath && <span className="text-sm text-emerald-400"> · image ✓</span>}</p>) },
      { step: 4, title: "Experience", empty: !form.experience?.length, content: form.experience?.map((x, i) => <p key={i}>{x.role ? `${x.role}, ` : ""}{x.company}<span className="text-bone/50"> {x.duration}</span></p>) },
      { step: 5, title: "Wins", empty: !form.achievements?.length && !form.certifications?.length, content: [...(form.achievements ?? []), ...(form.certifications ?? [])].map((x, i) => <p key={i}>{x.title}</p>) },
      { step: 6, title: "Links", empty: !Object.entries(form.socials).some(([k, v]) => k !== "extra" && v) && !form.socials.extra?.length, content: <p className="break-all text-sm text-bone/70">{[form.socials.linkedin, form.socials.github, form.socials.instagram, form.socials.x, form.socials.behance, form.socials.website, ...(form.socials.extra ?? []).map((e) => e.url)].filter(Boolean).join("  ·  ")}</p> },
      { step: 7, title: "Resume", empty: !form.resumePath, content: <p className="text-emerald-400">✓ Resume uploaded</p> },
      { step: 8, title: "Style", empty: false, content: <p className="flex items-center gap-3"><span className="h-5 w-5 rounded-full" style={{ background: form.design.accent }} />{STYLE_META[form.design.style ?? "cinematic"].name}</p> },
    ],
    [form, p],
  );
  return (
    <div className="space-y-3">
      {rows.map((r) => (
        <div key={r.title} className="rounded-2xl border border-line bg-ink-2/70 p-5">
          <div className="mb-3 flex items-center justify-between">
            <span className="label text-blood">{r.title}</span>
            <button type="button" onClick={() => goTo(r.step)} className="label rounded-full border border-bone/15 px-3 py-1.5 text-[10px] text-bone/70 hover:border-blood hover:text-bone">
              Edit
            </button>
          </div>
          {r.empty ? <p className="text-sm text-bone/35">Not added — this section won&apos;t appear on your site.</p> : r.content}
        </div>
      ))}
      <div className="rounded-2xl border border-blood/40 bg-blood/5 p-5">
        <label className="flex cursor-pointer items-start gap-4">
          <input type="checkbox" checked={form.consent} onChange={(e) => onConsent(e.target.checked)} className="mt-1 h-5 w-5 shrink-0 accent-[#e1121b]" />
          <span className="text-sm leading-relaxed text-bone/80">
            I confirm these details are mine and accurate, and I&apos;m happy for them to be published on my public portfolio website
            {form.personal.showPhone ? " (including my phone number)" : " (my phone number stays private)"}.
          </span>
        </label>
        {errors.consent && <p role="alert" className="mt-3 text-sm text-[#ff6b6f]">{errors.consent}</p>}
      </div>
      <p className="pt-2 text-sm text-bone/45">Next: pay ₹{siteConfig.price} by UPI. Your portfolio is built after we verify the payment.</p>
    </div>
  );
}
