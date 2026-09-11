export type EmployerId =
  | "finderlyfix"
  | "l3harris"
  | "strategic-retirement-partners"
  | "501database";

export type RoleId =
  | "finderlyfix-founding-engineer"
  | "l3harris-business-analyst"
  | "l3harris-associate-project-manager"
  | "l3harris-senior-associate-project-manager"
  | "strategic-retirement-software-engineer"
  | "501database-software-engineer-intern";

type ExperienceLink = {
  label: "View related project" | "View résumé";
  href: `#${string}` | `/${string}`;
};

export type ExperienceRole = {
  id: RoleId;
  title: string;
  dates: string;
  summary: string;
  contributions: readonly string[];
  impacts: readonly { label: string; value: string }[];
  link: ExperienceLink;
};

export type ExperienceEmployer = {
  id: EmployerId;
  company: string;
  commitment: "Part time" | "Full time" | "Freelance" | "Internship";
  dates: string;
  current: boolean;
  scope: string;
  roles: readonly [ExperienceRole, ...ExperienceRole[]];
};

export const defaultExperienceRoleId: RoleId = "finderlyfix-founding-engineer";

export const experienceEmployers = [
  {
    id: "finderlyfix",
    company: "FinderlyFix",
    commitment: "Part time",
    dates: "Sep 2025–Present",
    current: true,
    scope: "Building a coherent AI home-repair experience across text, media, and live video.",
    roles: [
      {
        id: "finderlyfix-founding-engineer",
        title: "Founding Software Engineer",
        dates: "Sep 2025–Present",
        summary:
          "Owns the AI conversation experience while helping shape a clear, reliable product for diagnosing and tracking home repairs.",
        contributions: [
          "Built text and live-video assistance with shared context across communication modes.",
          "Owns conversation memory, project tracking, and synchronization across repeat visits.",
          "Contributes product design, UX direction, manual QA, and response-performance work.",
        ],
        impacts: [],
        link: { label: "View related project", href: "#projects/finderly" },
      },
    ],
  },
  {
    id: "l3harris",
    company: "L3Harris",
    commitment: "Full time",
    dates: "Nov 2021–Present",
    current: true,
    scope: "Progressed from enterprise software operations into technical automation delivery.",
    roles: [
      {
        id: "l3harris-senior-associate-project-manager",
        title: "Senior Associate Project Manager",
        dates: "Apr 2026–Present",
        summary: "Senior Associate Project Manager at L3Harris.",
        contributions: [],
        impacts: [],
        link: { label: "View résumé", href: "/resume.pdf" },
      },
      {
        id: "l3harris-associate-project-manager",
        title: "Associate Project Manager",
        dates: "Aug 2023–Apr 2026",
        summary:
          "Delivered technical automation work spanning enterprise teams and production environments.",
        contributions: [
          "Built AI-enabled project tooling that reduced documentation preparation time by 60%.",
          "Served as technical liaison on automation projects supporting 45,000 employees.",
          "Deployed and monitored Blue Prism processes and application servers across environments.",
        ],
        impacts: [
          { label: "Prep time", value: "60% lower" },
          { label: "Reach", value: "45K employees" },
          { label: "Savings", value: "$300K+ annually" },
        ],
        link: { label: "View résumé", href: "/resume.pdf" },
      },
      {
        id: "l3harris-business-analyst",
        title: "Business Analyst",
        dates: "Nov 2021–Aug 2023",
        summary:
          "Managed the commercial operations behind a large enterprise software portfolio.",
        contributions: [
          "Owned $1.5 million per year in software contract initiations and renewals.",
          "Coordinated purchasing activity across more than 25 software vendors.",
          "Maintained continuity for enterprise software procurement and renewal work.",
        ],
        impacts: [
          { label: "Portfolio", value: "$1.5M annually" },
          { label: "Vendors", value: "25+" },
        ],
        link: { label: "View résumé", href: "/resume.pdf" },
      },
    ],
  },
  {
    id: "strategic-retirement-partners",
    company: "Strategic Retirement Partners",
    commitment: "Freelance",
    dates: "Apr–Oct 2024",
    current: false,
    scope: "Delivered an accessible retirement-income projection product for advisors.",
    roles: [
      {
        id: "strategic-retirement-software-engineer",
        title: "Software Engineer",
        dates: "Apr–Oct 2024",
        summary:
          "Designed and shipped a responsive data-visualization flow for personalized retirement guidance.",
        contributions: [
          "Built the projection experience with TypeScript, React, and Material UI.",
          "Designed an accessible form flow and interactive financial charts.",
          "Enabled advisors to deliver clearer, personalized retirement-income insights.",
        ],
        impacts: [{ label: "Participation", value: "10% increase" }],
        link: { label: "View résumé", href: "/resume.pdf" },
      },
    ],
  },
  {
    id: "501database",
    company: "501Database",
    commitment: "Internship",
    dates: "Apr–Aug 2023",
    current: false,
    scope: "Improved nonprofit intake through a reusable Next.js interface and API integrations.",
    roles: [
      {
        id: "501database-software-engineer-intern",
        title: "Software Engineer Intern",
        dates: "Apr–Aug 2023",
        summary:
          "Owned customer intake and administration experiences used by nonprofit organizations.",
        contributions: [
          "Built a Next.js intake flow and admin tool used by more than 20 nonprofits.",
          "Integrated two REST microservices for dynamic, user-specific form fields.",
          "Delivered seamless submission behavior across the intake platform.",
        ],
        impacts: [
          { label: "Organizations", value: "20+ nonprofits" },
          { label: "Sign-in", value: "20% faster" },
        ],
        link: { label: "View résumé", href: "/resume.pdf" },
      },
    ],
  },
] as const satisfies readonly ExperienceEmployer[];
