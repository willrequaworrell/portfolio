export type NavigationItem = {
  label: string;
  href: `#${string}`;
};

export type ProfileLink = {
  label: "Résumé" | "GitHub" | "LinkedIn";
  href: string;
};

export type PortfolioIdentity = {
  firstName: string;
  lastName: string;
  role: string;
  statement: readonly [string, string];
};

export type ProjectSlug = "finderly" | "haas" | "er-404";

export type ProjectLink = {
  label: "Visit project";
  href: `https://${string}`;
};

export type ProjectEntry = {
  slug: ProjectSlug;
  name: "FinderlyFix" | "HaaS" | "ER-404";
  summary: string;
  role: string;
  contributions: readonly [string, string, string];
  technologies: readonly string[];
  status: string;
  canonicalFacts: readonly string[];
  image: {
    src: `/assets/projects/${string}.svg`;
    alt: string;
  };
  publicDestination?: ProjectLink;
};

export const identity = {
  firstName: "Will",
  lastName: "Worrell",
  role: "Software Engineer",
  statement: ["I build thoughtful,", "reliable products."],
} as const satisfies PortfolioIdentity;

export const navigation = [
  { label: "Projects", href: "#projects" },
  { label: "Experience", href: "#experience" },
  { label: "About", href: "#about" },
  { label: "Contact", href: "#contact" },
] as const satisfies readonly NavigationItem[];

export const profileLinks = [
  { label: "Résumé", href: "/resume.pdf" },
  { label: "GitHub", href: "https://github.com/willrequaworrell" },
  { label: "LinkedIn", href: "https://linkedin.com/in/wrw" },
] as const satisfies readonly ProfileLink[];

export const projects = [
  {
    slug: "finderly",
    name: "FinderlyFix",
    summary:
      "An AI home-repair assistant that carries diagnosis and project context across photos, text, sound, and live video.",
    role: "Founding Engineer · Part time",
    contributions: [
      "Owns the AI conversation, memory, and project-synchronization experience.",
      "Built real-time video chat and shared project memory across communication modes.",
      "Shapes product design, usability direction, manual QA, and response performance.",
    ],
    technologies: ["React Native", "Expo", "TypeScript", "LiveKit", "Vercel AI SDK"],
    status: "Active product",
    canonicalFacts: [
      "Will is a part-time founding engineer at FinderlyFix.",
      "FinderlyFix helps people diagnose home-repair problems and decide whether to fix them or hire a professional.",
      "Will owns major parts of its multimodal AI conversation and project-memory experience.",
    ],
    image: {
      src: "/assets/projects/finderly.svg",
      alt: "FinderlyFix product interface placeholder",
    },
    publicDestination: {
      label: "Visit project",
      href: "https://www.finderlyfix.com/",
    },
  },
  {
    slug: "haas",
    name: "HaaS",
    summary:
      "A subscription-funnel and analytics product following the full feedback loop from discovery through activation and replay.",
    role: "Product Engineer · Solo build",
    contributions: [
      "Designed the product journey from plan selection through checkout and activation.",
      "Connected behavioral analytics and replay to product decisions across the funnel.",
      "Built the customer-facing experience and the underlying subscription workflow.",
    ],
    technologies: ["Next.js", "TypeScript", "Stripe", "PostHog", "Recharts"],
    status: "Public prototype",
    canonicalFacts: [
      "HaaS is a primarily solo project by Will.",
      "The project covers the complete subscription and product-feedback loop.",
      "HaaS is publicly accessible.",
    ],
    image: {
      src: "/assets/projects/haas.svg",
      alt: "HaaS subscription experience placeholder",
    },
    publicDestination: {
      label: "Visit project",
      href: "https://tryhaas.vercel.app",
    },
  },
  {
    slug: "er-404",
    name: "ER-404",
    summary:
      "An interactive browser drum machine that keeps a dense control surface legible while audio and interface state move together.",
    role: "Creative Developer · Solo build",
    contributions: [
      "Synchronized real-time audio playback and signal processing with interface state.",
      "Designed a complete control surface without burying the core beat-making flow.",
      "Built responsive sequencing, effects, and live control feedback for the browser.",
    ],
    technologies: ["React", "TypeScript", "Tone.js", "Vite", "Motion"],
    status: "Live experiment",
    canonicalFacts: [
      "ER-404 is a primarily solo project by Will.",
      "Its central engineering challenge is keeping real-time audio and interface state synchronized.",
      "ER-404 is publicly accessible and interactive.",
    ],
    image: {
      src: "/assets/projects/er-404.svg",
      alt: "ER-404 drum machine interface placeholder",
    },
    publicDestination: {
      label: "Visit project",
      href: "https://er-404.com",
    },
  },
] as const satisfies readonly ProjectEntry[];

export const defaultProjectSlug: ProjectSlug = projects[0].slug;
