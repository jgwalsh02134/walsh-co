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

export const primaryNav: NavItem[] = [
  {
    label: "Home",
    shortLabel: "Home",
    href: "/",
    icon: (
      <svg {...iconProps}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 12 12 3l9 9M5 10v10h4v-6h6v6h4V10" />
      </svg>
    ),
  },
  {
    label: "Properties",
    href: "/properties",
    icon: (
      <svg {...iconProps}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 10.5 12 3l9 7.5V21h-6v-7H9v7H3V10.5Z" />
      </svg>
    ),
  },
  {
    label: "Projects",
    href: "/projects",
    icon: (
      <svg {...iconProps}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 6.5A2.5 2.5 0 0 1 6.5 4h3l1.5 1.5H17.5A2.5 2.5 0 0 1 20 8v9.5A2.5 2.5 0 0 1 17.5 20h-11A2.5 2.5 0 0 1 4 17.5v-11Z" />
      </svg>
    ),
  },
  {
    label: "Tasks",
    href: "/tasks",
    icon: (
      <svg {...iconProps}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h10" />
      </svg>
    ),
  },
  {
    label: "Contacts",
    href: "/contacts",
    icon: (
      <svg {...iconProps}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16 11a4 4 0 1 0-8 0 4 4 0 0 0 8 0ZM4 20a8 8 0 0 1 16 0" />
      </svg>
    ),
  },
  {
    label: "Documents",
    shortLabel: "Docs",
    href: "/documents",
    icon: (
      <svg {...iconProps}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M7 4h7l4 4v12a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M14 4v4h4" />
      </svg>
    ),
  },
  {
    label: "Budget",
    href: "/budget",
    icon: (
      <svg {...iconProps}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 19h16M6 19v-7m4 7V8m4 11v-5m4 5V5" />
      </svg>
    ),
  },
];

export const secondaryNav: NavItem[] = [
  {
    label: "Settings",
    href: "/settings",
    icon: (
      <svg {...iconProps}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.6 3.6c.2-.9 1.6-.9 1.8 0l.2 1c.1.4.4.7.8.8.4 0 .7-.1 1-.3l.8-.6c.7-.6 1.7.4 1.1 1.1l-.6.8c-.2.3-.3.6-.3 1 .1.4.4.7.8.8l1 .2c.9.2.9 1.6 0 1.8l-1 .2c-.4.1-.7.4-.8.8 0 .4.1.7.3 1l.6.8c.6.7-.4 1.7-1.1 1.1l-.8-.6c-.3-.2-.6-.3-1-.3-.4.1-.7.4-.8.8l-.2 1c-.2.9-1.6.9-1.8 0l-.2-1c-.1-.4-.4-.7-.8-.8-.4 0-.7.1-1 .3l-.8.6c-.7.6-1.7-.4-1.1-1.1l.6-.8c.2-.3.3-.6.3-1-.1-.4-.4-.7-.8-.8l-1-.2c-.9-.2-.9-1.6 0-1.8l1-.2c.4-.1.7-.4.8-.8 0-.4-.1-.7-.3-1l-.6-.8c-.6-.7.4-1.7 1.1-1.1l.8.6c.3.2.6.3 1 .3.4-.1.7-.4.8-.8l.2-1Z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    ),
  },
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
    label: "Properties",
    description: "Manage property records, status, and linked work.",
    href: "/properties",
    icon: primaryNav[1].icon,
  },
  {
    label: "Projects",
    description: "Track renovation and development workstreams.",
    href: "/projects",
    icon: primaryNav[2].icon,
  },
  {
    label: "Tasks",
    description: "See what needs action, review, or completion.",
    href: "/tasks",
    icon: primaryNav[3].icon,
  },
  {
    label: "Contacts",
    description: "Keep contractors, vendors, and partners organized.",
    href: "/contacts",
    icon: primaryNav[4].icon,
  },
  {
    label: "Documents",
    description: "Store, classify, and verify important files.",
    href: "/documents",
    icon: primaryNav[5].icon,
  },
  {
    label: "Budget",
    description: "Track estimates, costs, variance, and exposure.",
    href: "/budget",
    icon: primaryNav[6].icon,
  },
  {
    label: "Settings",
    description: "Configure workspace, integrations, and preferences.",
    href: "/settings",
    icon: secondaryNav[0].icon,
  },
];
