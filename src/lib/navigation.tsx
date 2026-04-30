import type { ReactNode } from "react";

export type NavItem = {
  label: string;
  href: string;
  icon: ReactNode;
  description?: string;
};

const iconProps = {
  className: "h-5 w-5",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.7,
  viewBox: "0 0 24 24",
  "aria-hidden": true,
} as const;

export const icons = {
  home: (
    <svg {...iconProps}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 12 12 3l9 9M5 10v10h4v-6h6v6h4V10" />
    </svg>
  ),
  workbench: (
    <svg {...iconProps}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 21h18M5 21V10l7-5 7 5v11M9 21v-7h6v7" />
    </svg>
  ),
  contractors: (
    <svg {...iconProps}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 11a4 4 0 1 0-8 0 4 4 0 0 0 8 0ZM4 20a8 8 0 0 1 16 0" />
    </svg>
  ),
  bids: (
    <svg {...iconProps}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 6h12M3 12h9M3 18h7M16 14h6M16 14l3-3M16 14l3 3" />
    </svg>
  ),
  tasks: (
    <svg {...iconProps}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M5 4h14a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Z" />
    </svg>
  ),
  documents: (
    <svg {...iconProps}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 4h7l4 4v12a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1ZM14 4v4h4" />
    </svg>
  ),
  budget: (
    <svg {...iconProps}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 19h16M6 19v-7m4 7V8m4 11v-5m4 5V5" />
    </svg>
  ),
  settings: (
    <svg {...iconProps}>
      <circle cx="12" cy="12" r="3" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8L4.2 7a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1A2 2 0 1 1 19.7 7l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" />
    </svg>
  ),
  arrowRight: (
    <svg {...iconProps}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M13 5l7 7-7 7" />
    </svg>
  ),
} as const;

export const sidebarNav: NavItem[] = [
  { label: "Home", href: "/", icon: icons.home },
  { label: "322 Osborne Workbench", href: "/workbench", icon: icons.workbench },
  { label: "Contractors", href: "/contractors", icon: icons.contractors },
  { label: "Bids", href: "/bids", icon: icons.bids },
  { label: "Tasks", href: "/tasks", icon: icons.tasks },
  { label: "Documents", href: "/documents", icon: icons.documents },
  { label: "Budget", href: "/budget", icon: icons.budget },
];

export const settingsNav: NavItem[] = [
  { label: "Settings", href: "/settings", icon: icons.settings },
];

export type LandingCard = {
  title: string;
  description: string;
  href: string;
  icon: ReactNode;
};

export const landingCards: LandingCard[] = [
  {
    title: "322 Osborne Workbench",
    description: "See project status, next decisions, and open items.",
    href: "/workbench",
    icon: icons.workbench,
  },
  {
    title: "Contractors",
    description: "Find, qualify, and contact trades and professionals.",
    href: "/contractors",
    icon: icons.contractors,
  },
  {
    title: "Bids",
    description: "Compare proposals, exclusions, pricing, and award status.",
    href: "/bids",
    icon: icons.bids,
  },
  {
    title: "Tasks",
    description: "Track today's work, follow-ups, and punch list items.",
    href: "/tasks",
    icon: icons.tasks,
  },
  {
    title: "Documents",
    description: "Keep contracts, COIs, permits, bids, and photos organized.",
    href: "/documents",
    icon: icons.documents,
  },
  {
    title: "Budget",
    description: "Review estimates, quotes, committed costs, and variance.",
    href: "/budget",
    icon: icons.budget,
  },
];

export function isActiveHref(currentPath: string, href: string): boolean {
  if (href === "/") return currentPath === "/";
  return currentPath === href || currentPath.startsWith(`${href}/`);
}
