import { z } from "zod";

/* ──────────────────────────────────────────────────────────────
 * Shared validation for the onboarding form.
 * The same schema runs in the browser (per-step feedback) and on
 * the server (authoritative validation before any DB write).
 * ────────────────────────────────────────────────────────────── */

export const STYLES = ["cinematic", "minimalist", "futuristic", "colourful"] as const;
export type DesignStyle = (typeof STYLES)[number];

export const EXPERIENCE_KINDS = ["Full-time", "Internship", "Freelance", "Volunteering", "Part-time", "Other"] as const;

/** Adds https:// when the user typed a bare domain. */
export function normalizeUrl(v: string): string {
  const s = v.trim();
  if (!s) return "";
  if (/^https?:\/\//i.test(s)) return s;
  if (/^mailto:/i.test(s)) return s;
  return `https://${s}`;
}

const text = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Keep it under ${max} characters`)
    .optional()
    .default("");

const url = z
  .string()
  .trim()
  .max(500)
  .optional()
  .default("")
  .transform((v) => normalizeUrl(v ?? ""))
  .refine((v) => {
    if (!v) return true;
    try {
      const u = new URL(v);
      return (u.protocol === "https:" || u.protocol === "http:") && u.hostname.includes(".");
    } catch {
      return false;
    }
  }, "That doesn't look like a valid link");

const storagePath = z.string().max(300).optional().default("");

export const personalSchema = z.object({
  fullName: z.string().trim().min(2, "Tell us your name").max(120),
  headline: text(160),
  email: z.string().trim().toLowerCase().pipe(z.email("Enter a valid email address")),
  phone: z
    .string()
    .trim()
    .max(32)
    .optional()
    .default("")
    .refine((v) => !v || /^[+()\-\s0-9]{7,20}$/.test(v), "Enter a valid phone number"),
  showPhone: z.boolean().optional().default(false),
  city: text(120),
  intro: text(400),
  about: text(4000),
  photoPath: storagePath,
});

export const educationSchema = z.object({
  institution: z.string().trim().min(1, "Institution is required").max(200),
  degree: text(160),
  field: text(160),
  startYear: text(20),
  endYear: text(20),
  grade: text(40),
});

export const skillSchema = z.object({
  name: z.string().trim().min(1).max(60),
  level: z.number().int().min(1).max(5).default(3),
});

export const projectSchema = z.object({
  title: z.string().trim().min(1, "Give your project a title").max(160),
  description: text(1500),
  tech: z.array(z.string().trim().min(1).max(40)).max(20).default([]),
  imagePath: storagePath,
  githubUrl: url,
  liveUrl: url,
});

export const experienceSchema = z.object({
  company: z.string().trim().min(1, "Organisation is required").max(160),
  role: text(160),
  kind: text(40),
  duration: text(80),
  description: text(1500),
});

export const recognitionSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200),
  description: text(800),
  issuer: text(160),
  date: text(40),
  link: url,
});

export const socialsSchema = z.object({
  linkedin: url,
  github: url,
  instagram: url,
  x: url,
  behance: url,
  website: url,
  extra: z
    .array(z.object({ label: z.string().trim().min(1, "Label required").max(40), url: url.refine((v) => !!v, "Link required") }))
    .max(8)
    .default([]),
});

export const designSchema = z.object({
  style: z.enum(STYLES).default("cinematic"),
  accent: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Pick a colour")
    .default("#e1121b"),
});

export const submissionSchema = z.object({
  draftId: z.uuid(),
  personal: personalSchema,
  education: z.array(educationSchema).max(10).default([]),
  skills: z.array(skillSchema).max(40).default([]),
  projects: z.array(projectSchema).max(12).default([]),
  experience: z.array(experienceSchema).max(12).default([]),
  achievements: z.array(recognitionSchema).max(15).default([]),
  certifications: z.array(recognitionSchema).max(15).default([]),
  socials: socialsSchema,
  resumePath: storagePath,
  design: designSchema,
  consent: z.literal(true, { error: "Please confirm so we can publish your portfolio" }),
});

export type SubmissionInput = z.input<typeof submissionSchema>;
export type Submission = z.output<typeof submissionSchema>;

export const paymentSchema = z.object({
  customerId: z.uuid(),
  reference: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9]{6,40}$/, "Enter the transaction / UTR reference shown in your UPI app (letters and digits only)"),
  screenshotPath: z.string().max(300).optional().default(""),
});

export const UPLOAD_KINDS = {
  photo: { mimes: ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"], maxMB: 8 },
  project: { mimes: ["image/jpeg", "image/png", "image/webp", "image/gif"], maxMB: 8 },
  resume: { mimes: ["application/pdf"], maxMB: 8 },
  payment: { mimes: ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"], maxMB: 8 },
} as const;
export type UploadKind = keyof typeof UPLOAD_KINDS;

/** First error message for every field path, e.g. { "personal.email": "..." } */
export function flattenErrors(err: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of err.issues) {
    const key = issue.path.join(".");
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
