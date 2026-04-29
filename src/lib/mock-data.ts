import type { Priority, StatusKey } from "./status";

export type Property = {
  id: string;
  name: string;
  region: string;
  type: "Residential" | "Mixed-use" | "Commercial" | "Land";
  status: StatusKey;
  units: number;
  squareFeet: number;
  lastReviewed: string;
  notes: string;
};

export type Project = {
  id: string;
  name: string;
  propertyId: string;
  phase: "planning" | "in_progress" | "review" | "complete";
  priority: Priority;
  progress: number;
  dueDate: string;
  owner: string;
  description: string;
};

export type Task = {
  id: string;
  title: string;
  status: StatusKey;
  priority: Priority;
  dueDate: string;
  owner: string;
  context: string;
};

export type Contact = {
  id: string;
  name: string;
  role: "Architect" | "Contractor" | "Inspector" | "Realtor" | "Vendor" | "Other";
  organization: string;
  email: string;
  phone: string;
};

export type Document = {
  id: string;
  title: string;
  category: "Legal" | "Financial" | "Plans" | "Permits" | "Photos" | "Other";
  property: string;
  status: StatusKey;
  updated: string;
  size: string;
};

export type BudgetCategory = {
  id: string;
  name: string;
  estimate: number;
  actual: number;
};

export type ActivityItem = {
  id: string;
  label: string;
  context: string;
  timestamp: string;
  tone: "info" | "success" | "warning" | "review" | "neutral";
};

export type Deadline = {
  id: string;
  label: string;
  due: string;
  context: string;
};

export type RiskItem = {
  id: string;
  label: string;
  severity: "high" | "medium" | "low";
  context: string;
};

export type ContinueItem = {
  id: string;
  label: string;
  href: string;
  context: string;
};

export const properties: Property[] = [
  {
    id: "p1",
    name: "Property One",
    region: "Region A",
    type: "Residential",
    status: "active",
    units: 4,
    squareFeet: 3200,
    lastReviewed: "Apr 24",
    notes: "Generic placeholder description. Needs verification.",
  },
  {
    id: "p2",
    name: "Property Two",
    region: "Region B",
    type: "Mixed-use",
    status: "in_progress",
    units: 6,
    squareFeet: 5400,
    lastReviewed: "Apr 22",
    notes: "Phase plan in draft.",
  },
  {
    id: "p3",
    name: "Property Three",
    region: "Region A",
    type: "Land",
    status: "needs_verification",
    units: 0,
    squareFeet: 0,
    lastReviewed: "Apr 12",
    notes: "Title and zoning placeholders. Needs verification.",
  },
  {
    id: "p4",
    name: "Property Four",
    region: "Region C",
    type: "Commercial",
    status: "planning",
    units: 2,
    squareFeet: 8800,
    lastReviewed: "Apr 18",
    notes: "Scoping draft only.",
  },
  {
    id: "p5",
    name: "Property Five",
    region: "Region B",
    type: "Residential",
    status: "on_hold",
    units: 3,
    squareFeet: 2400,
    lastReviewed: "Mar 30",
    notes: "Awaiting decision.",
  },
  {
    id: "p6",
    name: "Property Six",
    region: "Region D",
    type: "Residential",
    status: "review",
    units: 1,
    squareFeet: 1900,
    lastReviewed: "Apr 27",
    notes: "Walkthrough scheduled.",
  },
];

export const projects: Project[] = [
  {
    id: "j1",
    name: "Roof and envelope refresh",
    propertyId: "p1",
    phase: "in_progress",
    priority: "high",
    progress: 62,
    dueDate: "May 22",
    owner: "Generic owner",
    description: "Generic scope placeholder.",
  },
  {
    id: "j2",
    name: "Interior repaint, common areas",
    propertyId: "p2",
    phase: "planning",
    priority: "medium",
    progress: 12,
    dueDate: "Jun 03",
    owner: "Generic owner",
    description: "Generic scope placeholder.",
  },
  {
    id: "j3",
    name: "HVAC service review",
    propertyId: "p4",
    phase: "review",
    priority: "medium",
    progress: 90,
    dueDate: "May 05",
    owner: "Generic owner",
    description: "Awaiting vendor confirmation.",
  },
  {
    id: "j4",
    name: "Landscape concept",
    propertyId: "p3",
    phase: "planning",
    priority: "low",
    progress: 5,
    dueDate: "Jun 30",
    owner: "Generic owner",
    description: "Concept-only placeholder.",
  },
  {
    id: "j5",
    name: "Tenant fit-out punch list",
    propertyId: "p2",
    phase: "in_progress",
    priority: "high",
    progress: 48,
    dueDate: "May 14",
    owner: "Generic owner",
    description: "Punch list draft.",
  },
  {
    id: "j6",
    name: "Storage build-out",
    propertyId: "p6",
    phase: "complete",
    priority: "low",
    progress: 100,
    dueDate: "Apr 18",
    owner: "Generic owner",
    description: "Closed out for documentation.",
  },
  {
    id: "j7",
    name: "Permit package draft",
    propertyId: "p4",
    phase: "review",
    priority: "high",
    progress: 70,
    dueDate: "May 09",
    owner: "Generic owner",
    description: "Internal review pending.",
  },
];

export const tasks: Task[] = [
  {
    id: "t1",
    title: "Confirm vendor quote, roofing scope",
    status: "in_progress",
    priority: "high",
    dueDate: "Apr 30",
    owner: "Unassigned",
    context: "Property One",
  },
  {
    id: "t2",
    title: "Upload latest survey draft",
    status: "needs_verification",
    priority: "medium",
    dueDate: "May 02",
    owner: "Unassigned",
    context: "Property Three",
  },
  {
    id: "t3",
    title: "Schedule envelope walkthrough",
    status: "planning",
    priority: "medium",
    dueDate: "May 05",
    owner: "Unassigned",
    context: "Property One",
  },
  {
    id: "t4",
    title: "Review HVAC service proposal",
    status: "review",
    priority: "medium",
    dueDate: "May 06",
    owner: "Unassigned",
    context: "Property Four",
  },
  {
    id: "t5",
    title: "Tag closed photos for archive",
    status: "complete",
    priority: "low",
    dueDate: "Apr 22",
    owner: "Unassigned",
    context: "Property Six",
  },
  {
    id: "t6",
    title: "Flag insurance coverage gap",
    status: "risk",
    priority: "high",
    dueDate: "May 01",
    owner: "Unassigned",
    context: "Property Two",
  },
  {
    id: "t7",
    title: "Review repaint color palette",
    status: "in_progress",
    priority: "low",
    dueDate: "May 12",
    owner: "Unassigned",
    context: "Property Two",
  },
  {
    id: "t8",
    title: "Draft landscape RFP outline",
    status: "planning",
    priority: "low",
    dueDate: "May 20",
    owner: "Unassigned",
    context: "Property Three",
  },
];

export const contacts: Contact[] = [
  {
    id: "c1",
    name: "Generic Architect",
    role: "Architect",
    organization: "Studio Placeholder",
    email: "architect@example.com",
    phone: "(000) 000-0000",
  },
  {
    id: "c2",
    name: "Generic GC",
    role: "Contractor",
    organization: "Generic Build Co.",
    email: "gc@example.com",
    phone: "(000) 000-0000",
  },
  {
    id: "c3",
    name: "Generic Inspector",
    role: "Inspector",
    organization: "Inspections Placeholder",
    email: "inspect@example.com",
    phone: "(000) 000-0000",
  },
  {
    id: "c4",
    name: "Generic Realtor",
    role: "Realtor",
    organization: "Realty Placeholder",
    email: "realtor@example.com",
    phone: "(000) 000-0000",
  },
  {
    id: "c5",
    name: "Generic Roofer",
    role: "Vendor",
    organization: "Roofing Placeholder",
    email: "roof@example.com",
    phone: "(000) 000-0000",
  },
  {
    id: "c6",
    name: "Generic HVAC",
    role: "Vendor",
    organization: "HVAC Placeholder",
    email: "hvac@example.com",
    phone: "(000) 000-0000",
  },
  {
    id: "c7",
    name: "Generic Counsel",
    role: "Other",
    organization: "Counsel Placeholder",
    email: "counsel@example.com",
    phone: "(000) 000-0000",
  },
  {
    id: "c8",
    name: "Generic Surveyor",
    role: "Vendor",
    organization: "Survey Placeholder",
    email: "survey@example.com",
    phone: "(000) 000-0000",
  },
];

export const documents: Document[] = [
  {
    id: "d1",
    title: "Title summary draft",
    category: "Legal",
    property: "Property One",
    status: "needs_verification",
    updated: "Apr 24",
    size: "1.2 MB",
  },
  {
    id: "d2",
    title: "Roofing proposal (vendor draft)",
    category: "Financial",
    property: "Property One",
    status: "in_progress",
    updated: "Apr 26",
    size: "640 KB",
  },
  {
    id: "d3",
    title: "Site plan (concept)",
    category: "Plans",
    property: "Property Two",
    status: "planning",
    updated: "Apr 22",
    size: "3.4 MB",
  },
  {
    id: "d4",
    title: "Permit checklist (placeholder)",
    category: "Permits",
    property: "Property Four",
    status: "needs_verification",
    updated: "Apr 18",
    size: "210 KB",
  },
  {
    id: "d5",
    title: "Walkthrough photos, batch 4",
    category: "Photos",
    property: "Property Six",
    status: "complete",
    updated: "Apr 27",
    size: "12.8 MB",
  },
  {
    id: "d6",
    title: "Coverage notes",
    category: "Legal",
    property: "Property Two",
    status: "risk",
    updated: "Apr 28",
    size: "98 KB",
  },
];

export const budgetCategories: BudgetCategory[] = [
  { id: "b1", name: "Construction", estimate: 184000, actual: 162400 },
  { id: "b2", name: "Architecture & design", estimate: 32000, actual: 31200 },
  { id: "b3", name: "Permits & filings", estimate: 12500, actual: 9800 },
  { id: "b4", name: "Inspections", estimate: 6500, actual: 7100 },
  { id: "b5", name: "Vendor services", estimate: 28000, actual: 24650 },
  { id: "b6", name: "Contingency", estimate: 18000, actual: 4200 },
];

export const recentActivity: ActivityItem[] = [
  {
    id: "a1",
    label: "Vendor quote received",
    context: "Roof and envelope refresh • Property One",
    timestamp: "2h ago",
    tone: "info",
  },
  {
    id: "a2",
    label: "Walkthrough notes added",
    context: "Property Six",
    timestamp: "5h ago",
    tone: "neutral",
  },
  {
    id: "a3",
    label: "Coverage gap flagged",
    context: "Property Two",
    timestamp: "Yesterday",
    tone: "warning",
  },
  {
    id: "a4",
    label: "Photo batch archived",
    context: "Property Six",
    timestamp: "Yesterday",
    tone: "success",
  },
  {
    id: "a5",
    label: "Permit package sent for review",
    context: "Property Four",
    timestamp: "2d ago",
    tone: "review",
  },
];

export const upcomingDeadlines: Deadline[] = [
  { id: "u1", label: "Insurance coverage review", due: "May 01", context: "Property Two" },
  { id: "u2", label: "Vendor quote confirmation", due: "Apr 30", context: "Property One" },
  { id: "u3", label: "HVAC proposal review", due: "May 06", context: "Property Four" },
  { id: "u4", label: "Survey upload", due: "May 02", context: "Property Three" },
];

export const riskItems: RiskItem[] = [
  {
    id: "r1",
    label: "Coverage gap flagged",
    severity: "high",
    context: "Property Two — needs verification",
  },
  {
    id: "r2",
    label: "Permit checklist incomplete",
    severity: "medium",
    context: "Property Four — placeholder file",
  },
  {
    id: "r3",
    label: "Title summary unverified",
    severity: "medium",
    context: "Property One",
  },
];

export const continueItems: ContinueItem[] = [
  {
    id: "k1",
    label: "Roof and envelope refresh",
    href: "/projects",
    context: "Last opened 2h ago",
  },
  {
    id: "k2",
    label: "Title summary draft",
    href: "/documents",
    context: "Last opened yesterday",
  },
];

export const dashboardStats = [
  { label: "Active properties", value: "4", delta: "+1 this month" },
  { label: "Active projects", value: "5", delta: "2 in review" },
  { label: "Open tasks", value: "12", delta: "3 high priority" },
  { label: "Documents pending review", value: "6", delta: "Needs verification" },
];

export const propertyTypes = ["All", "Residential", "Mixed-use", "Commercial", "Land"] as const;
export const propertyStatuses = ["All", "Active", "Planning", "In progress", "Review", "On hold", "Needs verification"] as const;
export const taskFilters = ["All", "Today", "This week", "High priority", "In review", "At risk"] as const;
export const contactRoles = ["All", "Architect", "Contractor", "Inspector", "Realtor", "Vendor", "Other"] as const;
export const documentCategories = ["All", "Legal", "Financial", "Plans", "Permits", "Photos", "Other"] as const;
