import type { DesignStyle } from "./schema";

/** Exactly what a public portfolio page is allowed to see. Stored as `published_portfolios.snapshot`. */
export type PortfolioData = {
  slug: string;
  name: string;
  headline: string;
  city: string;
  intro: string;
  about: string;
  photoUrl: string;
  resumeUrl: string;
  email: string;
  phone: string; // empty unless the customer opted to show it
  style: DesignStyle;
  accent: string;
  education: { institution: string; degree: string; field: string; startYear: string; endYear: string; grade: string }[];
  skills: { name: string; level: number }[];
  projects: {
    title: string;
    description: string;
    tech: string[];
    imageUrl: string;
    githubUrl: string;
    liveUrl: string;
  }[];
  experience: { company: string; role: string; kind: string; duration: string; description: string }[];
  achievements: { title: string; description: string; issuer: string; date: string; link: string }[];
  certifications: { title: string; description: string; issuer: string; date: string; link: string }[];
  socials: { label: string; url: string }[];
  isDemo?: boolean;
};
