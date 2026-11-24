import type { PortfolioData } from "./portfolio-types";

/**
 * Sample portfolios for the landing page. Fictional people, realistic data —
 * rendered by exactly the same component as real customer portfolios.
 */
const a = (f: string) => `/demos/art/${f}`;

export const DEMOS: (PortfolioData & { styleLabel: string })[] = [
  {
    slug: "aarav-mehta",
    styleLabel: "Dark cinematic",
    isDemo: true,
    name: "Aarav Mehta",
    headline: "Product designer crafting calm interfaces",
    city: "Mumbai, India",
    intro: "I design products that feel quiet, confident and human — from first sketch to shipped pixels.",
    about:
      "Final-year B.Des student at NID with two internships in product design. I care about the small moments: the way a button responds, the pause before a page loads, the words on an empty state.\n\nOutside of work I photograph Mumbai's monsoon streets and design type specimens for fun.",
    photoUrl: a("aarav.svg"),
    resumeUrl: "#",
    email: "aarav.demo@example.com",
    phone: "",
    style: "cinematic",
    accent: "#e1121b",
    education: [
      { institution: "National Institute of Design", degree: "B.Des", field: "Interaction Design", startYear: "2022", endYear: "2026", grade: "8.9 CGPA" },
      { institution: "St. Xavier's High School", degree: "HSC", field: "Science", startYear: "2020", endYear: "2022", grade: "91%" },
    ],
    skills: [
      { name: "Figma", level: 5 },
      { name: "UI/UX", level: 5 },
      { name: "Prototyping", level: 4 },
      { name: "User research", level: 4 },
      { name: "Motion design", level: 3 },
      { name: "HTML & CSS", level: 3 },
    ],
    projects: [
      { title: "Pulse — habit app redesign", description: "Reworked onboarding and streak mechanics for a habit tracker; prototype tests showed a 34% faster first-habit setup.", tech: ["Figma", "Protopie", "User testing"], imageUrl: a("aarav-1.svg"), githubUrl: "", liveUrl: "https://example.com" },
      { title: "Metro ticket kiosk", description: "A touch kiosk flow for Mumbai Metro designed for first-time riders and three languages.", tech: ["Service design", "Accessibility"], imageUrl: a("aarav-2.svg"), githubUrl: "", liveUrl: "" },
      { title: "Monsoon — type specimen", description: "An experimental specimen site for a display typeface inspired by rain-soaked signage.", tech: ["Type design", "Web"], imageUrl: a("aarav-3.svg"), githubUrl: "", liveUrl: "https://example.com" },
    ],
    experience: [
      { company: "Fintech startup (Bengaluru)", role: "Product Design Intern", kind: "Internship", duration: "May — Jul 2025", description: "Designed the KYC flow and a new design-system button set used across 40+ screens." },
      { company: "Freelance", role: "UI designer", kind: "Freelance", duration: "2023 — Present", description: "Websites and app screens for small studios and cafés." },
    ],
    achievements: [{ title: "Winner, campus UX hackathon", description: "Best accessibility-first concept out of 60 teams.", issuer: "NID Design Week", date: "2024", link: "" }],
    certifications: [{ title: "Google UX Design Certificate", description: "", issuer: "Google / Coursera", date: "2023", link: "https://example.com" }],
    socials: [
      { label: "LinkedIn", url: "https://linkedin.com" },
      { label: "Behance", url: "https://behance.net" },
      { label: "Instagram", url: "https://instagram.com" },
    ],
  },
  {
    slug: "meera-iyer",
    styleLabel: "Minimalist",
    isDemo: true,
    name: "Meera Iyer",
    headline: "Data scientist turning messy data into decisions",
    city: "Chennai, India",
    intro: "I build models people actually use — and explain them so everyone else can trust them.",
    about:
      "M.Sc. Statistics graduate with a soft spot for agriculture and climate data. I enjoy the unglamorous parts of data science: cleaning, validating, and asking 'are we sure?'.\n\nCurrently exploring causal inference and teaching Python to first-year students on weekends.",
    photoUrl: a("meera.svg"),
    resumeUrl: "#",
    email: "meera.demo@example.com",
    phone: "",
    style: "minimalist",
    accent: "#2743ff",
    education: [
      { institution: "University of Madras", degree: "M.Sc.", field: "Statistics", startYear: "2023", endYear: "2025", grade: "First class" },
      { institution: "Stella Maris College", degree: "B.Sc.", field: "Mathematics", startYear: "2020", endYear: "2023", grade: "8.4 CGPA" },
    ],
    skills: [
      { name: "Python", level: 5 },
      { name: "SQL", level: 4 },
      { name: "Machine learning", level: 4 },
      { name: "Data visualisation", level: 4 },
      { name: "Statistics", level: 5 },
      { name: "Communication", level: 4 },
    ],
    projects: [
      { title: "Crop yield forecaster", description: "Gradient-boosted model forecasting district-level rice yield from rainfall and soil data; MAPE 8.2%.", tech: ["Python", "XGBoost", "Pandas"], imageUrl: a("meera-1.svg"), githubUrl: "https://github.com", liveUrl: "" },
      { title: "Air quality, Pune", description: "Interactive dashboard of PM2.5 trends with anomaly alerts for 12 monitoring stations.", tech: ["Streamlit", "Plotly"], imageUrl: a("meera-2.svg"), githubUrl: "https://github.com", liveUrl: "https://example.com" },
      { title: "Churn model", description: "Survival analysis for a subscription app, translated into three retention experiments.", tech: ["R", "Lifelines"], imageUrl: a("meera-3.svg"), githubUrl: "", liveUrl: "" },
    ],
    experience: [
      { company: "Agri-analytics company", role: "Data Science Intern", kind: "Internship", duration: "Jan — Jun 2025", description: "Built the feature pipeline for yield forecasting across 4 states." },
      { company: "Code for Chennai", role: "Volunteer mentor", kind: "Volunteering", duration: "2024 — Present", description: "Teaching Python basics to first-generation college students." },
    ],
    achievements: [{ title: "Top 3%, Kaggle tabular competition", description: "", issuer: "Kaggle", date: "2024", link: "" }],
    certifications: [{ title: "TensorFlow Developer", description: "", issuer: "Google", date: "2024", link: "https://example.com" }],
    socials: [
      { label: "LinkedIn", url: "https://linkedin.com" },
      { label: "GitHub", url: "https://github.com" },
    ],
  },
  {
    slug: "kabir-rao",
    styleLabel: "Futuristic",
    isDemo: true,
    name: "Kabir Rao",
    headline: "Full-stack developer · systems & web",
    city: "Hyderabad, India",
    intro: "I ship fast, typed, well-tested software — and I love a good terminal.",
    about:
      "Computer science undergrad building web apps since class 10. I like owning things end-to-end: schema, API, UI, deployment and the 2 a.m. bug fix.\n\nOpen-source contributor and organiser of my college's developer club.",
    photoUrl: a("kabir.svg"),
    resumeUrl: "#",
    email: "kabir.demo@example.com",
    phone: "",
    style: "futuristic",
    accent: "#00e0a4",
    education: [{ institution: "IIIT Hyderabad", degree: "B.Tech", field: "Computer Science", startYear: "2023", endYear: "2027", grade: "9.1 CGPA" }],
    skills: [
      { name: "TypeScript", level: 5 },
      { name: "React / Next.js", level: 5 },
      { name: "Node.js", level: 4 },
      { name: "PostgreSQL", level: 4 },
      { name: "Go", level: 3 },
      { name: "Docker", level: 3 },
      { name: "Java", level: 3 },
    ],
    projects: [
      { title: "Ledger", description: "Split-expenses app with offline sync and UPI settle-up links. 2k+ students use it across 3 hostels.", tech: ["Next.js", "Postgres", "tRPC"], imageUrl: a("kabir-1.svg"), githubUrl: "https://github.com", liveUrl: "https://example.com" },
      { title: "Campus OS", description: "One app for timetables, mess menus and room bookings, built with the student council.", tech: ["React Native", "Supabase"], imageUrl: a("kabir-2.svg"), githubUrl: "https://github.com", liveUrl: "" },
      { title: "kit — CLI toolkit", description: "A Go CLI that scaffolds, lints and deploys student projects in one command.", tech: ["Go", "Cobra"], imageUrl: a("kabir-3.svg"), githubUrl: "https://github.com", liveUrl: "" },
    ],
    experience: [
      { company: "SaaS startup (remote)", role: "Software Engineering Intern", kind: "Internship", duration: "Summer 2025", description: "Built the billing webhooks service and cut p95 latency of the dashboard by 40%." },
      { company: "Developer Club, IIIT-H", role: "Lead organiser", kind: "Volunteering", duration: "2024 — Present", description: "Running weekly build nights and a 300-person hackathon." },
    ],
    achievements: [
      { title: "Smart India Hackathon — finalist", description: "", issuer: "Govt. of India", date: "2024", link: "" },
      { title: "Merged PRs to 6 open-source projects", description: "", issuer: "GitHub", date: "2025", link: "" },
    ],
    certifications: [],
    socials: [
      { label: "GitHub", url: "https://github.com" },
      { label: "LinkedIn", url: "https://linkedin.com" },
      { label: "X", url: "https://x.com" },
    ],
  },
  {
    slug: "zoya-khan",
    styleLabel: "Creative & colourful",
    isDemo: true,
    name: "Zoya Khan",
    headline: "Brand & marketing strategist with a loud imagination",
    city: "Delhi, India",
    intro: "I help small brands sound like themselves — and get noticed for it.",
    about:
      "BBA graduate and content creator. I've grown two Instagram pages past 50k and run campaigns for cafés, NGOs and indie labels.\n\nI think in moodboards, write in hooks and measure everything.",
    photoUrl: a("zoya.svg"),
    resumeUrl: "#",
    email: "zoya.demo@example.com",
    phone: "",
    style: "colourful",
    accent: "#ff5c39",
    education: [{ institution: "Delhi University", degree: "BBA", field: "Marketing", startYear: "2021", endYear: "2024", grade: "" }],
    skills: [
      { name: "Brand strategy", level: 5 },
      { name: "Content writing", level: 5 },
      { name: "Instagram growth", level: 5 },
      { name: "Canva & Figma", level: 4 },
      { name: "Marketing analytics", level: 3 },
      { name: "Public speaking", level: 4 },
    ],
    projects: [
      { title: "Chai Co. rebrand", description: "New voice, packaging direction and launch reels for a neighbourhood tea brand; footfall up 22% in a month.", tech: ["Brand", "Reels", "Packaging"], imageUrl: a("zoya-1.svg"), githubUrl: "", liveUrl: "https://example.com" },
      { title: "Seedlings — NGO campaign", description: "Donation drive for a children's library, raised ₹3.2L from 900+ donors.", tech: ["Campaign", "Copywriting"], imageUrl: a("zoya-2.svg"), githubUrl: "", liveUrl: "" },
      { title: "Reels growth playbook", description: "12-week experiment growing a food page from 4k to 51k followers, documented as a public case study.", tech: ["Analytics", "Content"], imageUrl: a("zoya-3.svg"), githubUrl: "", liveUrl: "https://example.com" },
    ],
    experience: [
      { company: "Independent", role: "Brand consultant", kind: "Freelance", duration: "2024 — Present", description: "Strategy and content for 9 small businesses." },
      { company: "D2C skincare brand", role: "Marketing Intern", kind: "Internship", duration: "2023", description: "Planned influencer collaborations and weekly content calendars." },
    ],
    achievements: [{ title: "Best Marketing Plan", description: "Inter-college business fest", issuer: "SRCC", date: "2023", link: "" }],
    certifications: [{ title: "Meta Social Media Marketing", description: "", issuer: "Meta", date: "2023", link: "https://example.com" }],
    socials: [
      { label: "Instagram", url: "https://instagram.com" },
      { label: "LinkedIn", url: "https://linkedin.com" },
    ],
  },
];

export const getDemo = (slug: string) => DEMOS.find((d) => d.slug === slug) ?? null;
