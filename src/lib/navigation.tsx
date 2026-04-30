import type { ReactNode } from "react";

export type NavItem = {
  label: string;
  href: string;
  icon: ReactNode;
  shortLabel?: string;
};

const iconProps = {
  className: "h-5 w-5",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.7,
  viewBox: "0 0 24 24",
  "aria-hidden": true,
} as const;

const icons = {
  home: (
    <svg {...iconProps}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 12 12 3l9 9M5 10v10h4v-6h6v6h4V10" />
    </svg>
  ),
  workbench: (
    <svg {...iconProps}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 21V8l8-5 8 5v13M4 21h16M9 21v-6h6v6" />
    </svg>
  ),
  construction: (
    <svg {...iconProps}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 21h18M5 21V10l7-5 7 5v11M9 21v-7h6v7M9 14h6" />
    </svg>
  ),
  contractors: (
    <svg {...iconProps}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 11a4 4 0 1 0-8 0 4 4 0 0 0 8 0ZM4 20a8 8 0 0 1 16 0" />
    </svg>
  ),
  bids: (
    <svg {...iconProps}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 6h18M3 12h12M3 18h7M17 14l4 4-4 4M21 18h-4" />
    </svg>
  ),
  tasks: (
    <svg {...iconProps}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h7M4 12h7M4 18h7M14 6l2 2 4-4M14 12l2 2 4-4M14 18l2 2 4-4" />
    </svg>
  ),
  permits: (
    <svg {...iconProps}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 11l2 2 4-4M5 4h14a1 1 0 0 1 1 1v15l-4-2-4 2-4-2-4 2V5a1 1 0 0 1 1-1Z" />
    </svg>
  ),
  documents: (
    <svg {...iconProps}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 4h7l4 4v12a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M14 4v4h4" />
    </svg>
  ),
  budget: (
    <svg {...iconProps}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 19h16M6 19v-7m4 7V8m4 11v-5m4 5V5" />
    </svg>
  ),
  reports: (
    <svg {...iconProps}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 4h12l4 4v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 11h10M7 15h10M7 7h6" />
    </svg>
  ),
  settings: (
    <svg {...iconProps}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.6 3.6c.2-.9 1.6-.9 1.8 0l.2 1c.1.4.4.7.8.8.4 0 .7-.1 1-.3l.8-.6c.7-.6 1.7.4 1.1 1.1l-.6.8c-.2.3-.3.6-.3 1 .1.4.4.7.8.8l1 .2c.9.2.9 1.6 0 1.8l-1 .2c-.4.1-.7.4-.8.8 0 .4.1.7.3 1l.6.8c.6.7-.4 1.7-1.1 1.1l-.8-.6c-.3-.2-.6-.3-1-.3-.4.1-.7.4-.8.8l-.2 1c-.2.9-1.6.9-1.8 0l-.2-1c-.1-.4-.4-.7-.8-.8-.4 0-.7.1-1 .3l-.8.6c-.7.6-1.7-.4-1.1-1.1l.6-.8c.2-.3.3-.6.3-1-.1-.4-.4-.7-.8-.8l-1-.2c-.9-.2-.9-1.6 0-1.8l1-.2c.4-.1.7-.4.8-.8 0-.4-.1-.7-.3-1l-.6-.8c-.6-.7.4-1.7 1.1-1.1l.8.6c.3.2.6.3 1 .3.4-.1.7-.4.8-.8l.2-1Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ),
} as const;

export const desktopNav: NavItem[] = [
  { label: "Home", href: "/", icon: icons.home },
  { label: "Workbench", href: "/workbench", icon: icons.workbench },
  { label: "Construction", href: "/construction", icon: icons.construction },
  { label: "Contractors", href: "/contractors", icon: icons.contractors },
  { label: "Bids", href: "/bids", icon: icons.bids },
  { label: "Tasks", href: "/tasks", icon: icons.tasks },
  { label: "Permits", href: "/permits", icon: icons.permits },
  { label: "Documents", shortLabel: "Docs", href: "/documents", icon: icons.documents },
  { label: "Budget", href: "/budget", icon: icons.budget },
  { label: "Reports", href: "/reports", icon: icons.reports },
];

export const mobileFieldNav: NavItem[] = [
  { label: "Today", shortLabel: "Today", href: "/workbench", icon: icons.workbench },
  { label: "Tasks", href: "/tasks", icon: icons.tasks },
  { label: "Contractors", shortLabel: "Trades", href: "/contractors", icon: icons.contractors },
  { label: "Photos", shortLabel: "Photos", href: "/documents", icon: icons.documents },
  { label: "Permits", href: "/permits", icon: icons.permits },
];

export const secondaryNav: NavItem[] = [
  { label: "Settings", href: "/settings", icon: icons.settings },
];

export function isActiveHref(currentPath: string, href: string): boolean {
  if (href === "/") return currentPath === "/";
  return currentPath === href || currentPath.startsWith(`${href}/`);
}

export type LandingCard = {
  label: string;
  description: string;
  href: string;
  icon: ReactNode;
};

export const landingCards: LandingCard[] = [
  {
    label: "Property Workbench",
    description: "Open the 322 Osborne renovation command center.",
    href: "/workbench",
    icon: icons.workbench,
  },
  {
    label: "Contractors",
    description: "Source, qualify, and manage trades and professionals.",
    href: "/contractors",
    icon: icons.contractors,
  },
  {
    label: "Bids",
    description: "Compare proposals, exclusions, schedules, and awards.",
    href: "/bids",
    icon: icons.bids,
  },
  {
    label: "Tasks",
    description: "Track office work, field work, and punch list items.",
    href: "/tasks",
    icon: icons.tasks,
  },
  {
    label: "Permits",
    description: "Monitor permit, inspection, and municipal requirements.",
    href: "/permits",
    icon: icons.permits,
  },
  {
    label: "Documents",
    description: "Organize contracts, COIs, proposals, permits, and photos.",
    href: "/documents",
    icon: icons.documents,
  },
  {
    label: "Budget",
    description: "Track estimates, commitments, variance, and change orders.",
    href: "/budget",
    icon: icons.budget,
  },
];
