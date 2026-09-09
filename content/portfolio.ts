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
