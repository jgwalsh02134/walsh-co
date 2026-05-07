import type { ReactNode } from "react";
import {
  ArrowRight,
  BadgeCheck,
  BookUser,
  CalendarDays,
  ChartCandlestick,
  CircleDollarSign,
  FolderOpen,
  Handshake,
  HardHat,
  Home,
  House,
  Landmark,
  ListTodo,
  type LucideIcon,
  type LucideProps,
  Mail,
  MapPin,
  Menu,
  Pencil,
  Phone,
  PlusCircle,
  Search,
  Settings,
  Trash2,
  TrendingDown,
  TrendingUp,
  TriangleAlert,
  Upload,
  WalletCards,
  X,
} from "lucide-react";

export type NavItem = {
  label: string;
  href: string;
  icon: ReactNode;
  description?: string;
};

/**
 * Centralized icon registry. Edit this map to swap icons across the app.
 * Each entry returns a configured Lucide React component so a callsite
 * can simply render {icons.portfolio} as a ReactNode.
 *
 * Sizes follow the project icon-system rules:
 *   - sidebar/nav rows: 20px (preserves existing 9-row height)
 *   - landing cards / section headers: 24px
 *   - inline within text/inputs: 16px
 *   - hero: 32px (caller must size explicitly)
 *
 * Stroke width is 1.75 for a calm, premium look.
 */
const baseProps: LucideProps = {
  strokeWidth: 1.75,
  "aria-hidden": true,
};

function makeIcon(
  Component: LucideIcon,
  className: string,
  extra: LucideProps = {}
) {
  return <Component {...baseProps} {...extra} className={className} />;
}

const NAV = "h-5 w-5"; // 20px — sidebar/nav rows
const CARD = "h-6 w-6"; // 24px — landing cards / panel headers
const INLINE = "h-4 w-4"; // 16px — inline within text/inputs

export const icons = {
  // Navigation
  home: makeIcon(Home, NAV),
  portfolio: makeIcon(Landmark, NAV),
  market: makeIcon(ChartCandlestick, NAV),
  properties: makeIcon(House, NAV),
  renovation: makeIcon(HardHat, NAV),
  contacts: makeIcon(BookUser, NAV),
  bids: makeIcon(Handshake, NAV),
  documents: makeIcon(FolderOpen, NAV),
  budget: makeIcon(CircleDollarSign, NAV),
  tasks: makeIcon(ListTodo, NAV),
  settings: makeIcon(Settings, NAV),

  // Inline / utility
  arrowRight: makeIcon(ArrowRight, INLINE),
  search: makeIcon(Search, INLINE),
  menu: makeIcon(Menu, NAV),
  close: makeIcon(X, NAV),
} as const;

/**
 * Larger card-sized variants for the landing page where icons sit inside
 * a 44px badge. Re-uses the same registry but at CARD size.
 */
export const cardIcons = {
  portfolio: makeIcon(Landmark, CARD),
  market: makeIcon(ChartCandlestick, CARD),
  properties: makeIcon(House, CARD),
  renovation: makeIcon(HardHat, CARD),
  contacts: makeIcon(BookUser, CARD),
  documents: makeIcon(FolderOpen, CARD),
  budget: makeIcon(CircleDollarSign, CARD),
  tasks: makeIcon(ListTodo, CARD),
} as const;

/**
 * General-purpose icon registry for ad-hoc use across pages.
 * Pre-sized (mostly inline). Callers can override className when needed.
 */
export const utilityIcons = {
  add: (className = INLINE) => makeIcon(PlusCircle, className),
  edit: (className = INLINE) => makeIcon(Pencil, className),
  delete: (className = INLINE) => makeIcon(Trash2, className),
  warning: (className = INLINE) => makeIcon(TriangleAlert, className),
  verified: (className = INLINE) => makeIcon(BadgeCheck, className),
  calendar: (className = INLINE) => makeIcon(CalendarDays, className),
  phone: (className = INLINE) => makeIcon(Phone, className),
  email: (className = INLINE) => makeIcon(Mail, className),
  upload: (className = INLINE) => makeIcon(Upload, className),
  location: (className = INLINE) => makeIcon(MapPin, className),
  wallet: (className = INLINE) => makeIcon(WalletCards, className),
  marketUp: (className = INLINE) => makeIcon(TrendingUp, className),
  marketDown: (className = INLINE) => makeIcon(TrendingDown, className),
} as const;

export const sidebarNav: NavItem[] = [
  { label: "Home", href: "/", icon: icons.home },
  { label: "Portfolio", href: "/portfolio", icon: icons.portfolio },
  { label: "Market Tracker", href: "/market", icon: icons.market },
  { label: "Properties", href: "/properties", icon: icons.properties },
  { label: "322 Osborne Workspace", href: "/renovation", icon: icons.renovation },
  { label: "Contacts", href: "/contacts", icon: icons.contacts },
  { label: "Bids", href: "/bids", icon: icons.bids },
  { label: "Documents", href: "/documents", icon: icons.documents },
  { label: "Budget", href: "/budget", icon: icons.budget },
  { label: "Tasks", href: "/tasks", icon: icons.tasks },
];

export const settingsNav: NavItem[] = [
  { label: "Settings", href: "/settings", icon: icons.settings },
];

export type LandingCard = {
  title: string;
  description: string;
  href: string;
  /** Lucide fallback icon — rendered when `blueprintIcon` is absent or the
   *  static asset fails to load. Stays a small, currentColor-driven icon. */
  icon: ReactNode;
  /** Optional public path to a static Icons8-blueprint-style SVG. The page
   *  renders this as a larger, fixed-color illustration and falls back to
   *  `icon` when this is undefined. Only used on the landing cards — never
   *  on inline UI controls (search, edit, archive, etc. stay Lucide). */
  blueprintIcon?: string;
};

const BLUEPRINT_DIR = "/icons/landing/blueprint";

export const landingCards: LandingCard[] = [
  {
    title: "Portfolio",
    description:
      "View company holdings, property status, and portfolio-level summaries.",
    href: "/portfolio",
    icon: cardIcons.portfolio,
    blueprintIcon: `${BLUEPRINT_DIR}/portfolio.svg`,
  },
  {
    title: "Market Tracker",
    description:
      "Track values, rent estimates, comps, market trends, and data sources.",
    href: "/market",
    icon: cardIcons.market,
    blueprintIcon: `${BLUEPRINT_DIR}/market-tracker.svg`,
  },
  {
    title: "Properties",
    description:
      "Open individual property records, documents, tasks, and financial details.",
    href: "/properties",
    icon: cardIcons.properties,
    blueprintIcon: `${BLUEPRINT_DIR}/properties.svg`,
  },
  {
    title: "322 Osborne Workspace",
    description:
      "Manage renovation scope, contractors, bids, tasks, budget, and documents.",
    href: "/renovation",
    icon: cardIcons.renovation,
    blueprintIcon: `${BLUEPRINT_DIR}/renovation.svg`,
  },
  {
    title: "Contacts",
    description:
      "Organize contractors, professionals, municipal contacts, vendors, and key relationships.",
    href: "/contacts",
    icon: cardIcons.contacts,
    blueprintIcon: `${BLUEPRINT_DIR}/contacts.svg`,
  },
  {
    title: "Documents",
    description:
      "Organize deeds, insurance, permits, contracts, COIs, bids, and photos.",
    href: "/documents",
    icon: cardIcons.documents,
    blueprintIcon: `${BLUEPRINT_DIR}/documents.svg`,
  },
  {
    title: "Budget & Financials",
    description:
      "Track estimates, committed costs, actuals, variance, and exposure.",
    href: "/budget",
    icon: cardIcons.budget,
    blueprintIcon: `${BLUEPRINT_DIR}/budget.svg`,
  },
  {
    title: "Tasks & Follow-ups",
    description:
      "Manage project work, punch items, deadlines, and open decisions.",
    href: "/tasks",
    icon: cardIcons.tasks,
    blueprintIcon: `${BLUEPRINT_DIR}/tasks.svg`,
  },
];

export const productName = "J.G. Walsh & Co.";
export const productTitle = "J.G. Walsh & Co. Workspace";
export const productSubtitle =
  "Private portfolio, market intelligence, and renovation operations workspace for J.G. Walsh & Co.";

export function isActiveHref(currentPath: string, href: string): boolean {
  if (href === "/") return currentPath === "/";
  return currentPath === href || currentPath.startsWith(`${href}/`);
}
