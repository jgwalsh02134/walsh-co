import type { ContractorStatus, Priority, StatusKey } from "./status";

export type Trade =
  | "General"
  | "Demolition"
  | "Framing"
  | "Roofing"
  | "Siding"
  | "Windows"
  | "Plumbing"
  | "Electrical"
  | "HVAC"
  | "Insulation"
  | "Drywall"
  | "Painting"
  | "Flooring"
  | "Tile"
  | "Cabinetry"
  | "Countertops"
  | "Masonry"
  | "Concrete"
  | "Landscape"
  | "Architect"
  | "Engineer"
  | "Inspector"
  | "Other";

export const trades: readonly Trade[] = [
  "General",
  "Demolition",
  "Framing",
  "Roofing",
  "Siding",
  "Windows",
  "Plumbing",
  "Electrical",
  "HVAC",
  "Insulation",
  "Drywall",
  "Painting",
  "Flooring",
  "Tile",
  "Cabinetry",
  "Countertops",
  "Masonry",
  "Concrete",
  "Landscape",
  "Architect",
  "Engineer",
  "Inspector",
  "Other",
] as const;

export type Qualifications = {
  insurance: boolean;
  workersComp: boolean;
  license: boolean;
  w9: boolean;
  references: boolean;
};

export type Contractor = {
  id: string;
  name: string;
  organization: string;
  trade: Trade;
  status: ContractorStatus;
  qualifications: Qualifications;
  email: string;
  phone: string;
  notes: string;
};

export type Bid = {
  id: string;
  contractorId: string;
  contractor: string;
  trade: Trade;
  amount: number;
  startDate: string;
  durationDays: number;
  includes: string[];
  excludes: string[];
  insuranceOk: boolean;
  risk: "low" | "medium" | "high";
  score: number;
  award: "pending" | "shortlisted" | "awarded" | "declined";
};

export type Task = {
  id: string;
  title: string;
  status: StatusKey;
  priority: Priority;
  dueDate: string;
  owner: string;
  context: "Office" | "Field" | "Punch list";
};

export type DocumentRecord = {
  id: string;
  title: string;
  category: "Contract" | "COI" | "Proposal" | "Permit" | "Plan" | "Photo" | "Inspection" | "Other";
  contractor?: string;
  status: StatusKey;
  updated: string;
  size: string;
};

export type BudgetCategory = {
  id: string;
  name: string;
  estimate: number;
  committed: number;
  actual: number;
};

export type ChangeOrder = {
  id: string;
  number: string;
  description: string;
  contractor: string;
  amount: number;
  status: "pending" | "approved" | "rejected";
  submitted: string;
};

export type Permit = {
  id: string;
  type: string;
  number: string;
  authority: string;
  status: StatusKey;
  filed: string;
  inspectionDate?: string;
  notes: string;
};

export type ActivityItem = {
  id: string;
  label: string;
  context: string;
  timestamp: string;
  tone: "info" | "success" | "warning" | "review" | "neutral";
};

export type Decision = {
  id: string;
  label: string;
  context: string;
  due: string;
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

export type PropertyProfile = {
  id: string;
  address: string;
  shortName: string;
  type: "Residential" | "Mixed-use" | "Commercial" | "Land";
  squareFeet: number;
  phase: string;
  startDate: string;
  targetCompletion: string;
};

export const propertyProfile: PropertyProfile = {
  id: "osborne-322",
  address: "322 Osborne Rd",
  shortName: "322 Osborne",
  type: "Residential",
  squareFeet: 3200,
  phase: "Bidding & Procurement",
  startDate: "Mar 17",
  targetCompletion: "Sep 30",
};

export const contractors: Contractor[] = [
  {
    id: "ctr-roof-1",
    name: "Generic Placeholder",
    organization: "Northline Roofing Co.",
    trade: "Roofing",
    status: "bid_received",
    qualifications: {
      insurance: true,
      workersComp: true,
      license: true,
      w9: true,
      references: true,
    },
    email: "estimating@example.com",
    phone: "(000) 000-0000",
    notes: "Bid received, scope review pending.",
  },
  {
    id: "ctr-roof-2",
    name: "Generic Placeholder",
    organization: "Capital Roofing & Sheet Metal",
    trade: "Roofing",
    status: "bid_requested",
    qualifications: {
      insurance: true,
      workersComp: true,
      license: true,
      w9: false,
      references: false,
    },
    email: "bids@example.com",
    phone: "(000) 000-0000",
    notes: "Awaiting W-9 and references.",
  },
  {
    id: "ctr-elec-1",
    name: "Generic Placeholder",
    organization: "Mohawk Electric LLC",
    trade: "Electrical",
    status: "shortlisted",
    qualifications: {
      insurance: true,
      workersComp: true,
      license: true,
      w9: true,
      references: true,
    },
    email: "office@example.com",
    phone: "(000) 000-0000",
    notes: "Strong references, panel upgrade scope confirmed.",
  },
  {
    id: "ctr-plumb-1",
    name: "Generic Placeholder",
    organization: "Adirondack Plumbing",
    trade: "Plumbing",
    status: "bid_received",
    qualifications: {
      insurance: true,
      workersComp: false,
      license: true,
      w9: true,
      references: true,
    },
    email: "office@example.com",
    phone: "(000) 000-0000",
    notes: "Workers comp certificate expired — needs update.",
  },
  {
    id: "ctr-hvac-1",
    name: "Generic Placeholder",
    organization: "Pinebush HVAC",
    trade: "HVAC",
    status: "prequalification_needed",
    qualifications: {
      insurance: false,
      workersComp: false,
      license: true,
      w9: false,
      references: false,
    },
    email: "service@example.com",
    phone: "(000) 000-0000",
    notes: "New prospect, no qualification documents on file.",
  },
  {
    id: "ctr-fram-1",
    name: "Generic Placeholder",
    organization: "Hudson Carpentry",
    trade: "Framing",
    status: "preferred",
    qualifications: {
      insurance: true,
      workersComp: true,
      license: true,
      w9: true,
      references: true,
    },
    email: "shop@example.com",
    phone: "(000) 000-0000",
    notes: "Preferred trade partner across prior projects.",
  },
  {
    id: "ctr-arch-1",
    name: "Generic Placeholder",
    organization: "Loudonville Architecture",
    trade: "Architect",
    status: "awarded",
    qualifications: {
      insurance: true,
      workersComp: true,
      license: true,
      w9: true,
      references: true,
    },
    email: "studio@example.com",
    phone: "(000) 000-0000",
    notes: "Drawings issued for permit set.",
  },
  {
    id: "ctr-paint-1",
    name: "Generic Placeholder",
    organization: "Crescent Painting",
    trade: "Painting",
    status: "prospect",
    qualifications: {
      insurance: false,
      workersComp: false,
      license: false,
      w9: false,
      references: false,
    },
    email: "estimates@example.com",
    phone: "(000) 000-0000",
    notes: "Referral, not yet qualified.",
  },
  {
    id: "ctr-floor-1",
    name: "Generic Placeholder",
    organization: "Riverbend Flooring",
    trade: "Flooring",
    status: "backup",
    qualifications: {
      insurance: true,
      workersComp: true,
      license: true,
      w9: true,
      references: true,
    },
    email: "sales@example.com",
    phone: "(000) 000-0000",
    notes: "Backup if preferred installer is unavailable.",
  },
  {
    id: "ctr-demo-1",
    name: "Generic Placeholder",
    organization: "Eastline Demo",
    trade: "Demolition",
    status: "do_not_use",
    qualifications: {
      insurance: true,
      workersComp: true,
      license: true,
      w9: true,
      references: false,
    },
    email: "office@example.com",
    phone: "(000) 000-0000",
    notes: "Prior site safety incident — do not use.",
  },
];

export const bids: Bid[] = [
  {
    id: "bid-roof-1",
    contractorId: "ctr-roof-1",
    contractor: "Northline Roofing Co.",
    trade: "Roofing",
    amount: 38400,
    startDate: "May 12",
    durationDays: 9,
    includes: ["Tear-off", "Underlayment", "Architectural shingles", "Drip edge"],
    excludes: ["Decking replacement", "Skylight reflash"],
    insuranceOk: true,
    risk: "low",
    score: 86,
    award: "shortlisted",
  },
  {
    id: "bid-roof-2",
    contractorId: "ctr-roof-2",
    contractor: "Capital Roofing & Sheet Metal",
    trade: "Roofing",
    amount: 41250,
    startDate: "May 19",
    durationDays: 7,
    includes: ["Tear-off", "Synthetic underlayment", "30-yr shingles", "Ridge vent"],
    excludes: ["Gutter work", "Rotted decking"],
    insuranceOk: true,
    risk: "medium",
    score: 78,
    award: "pending",
  },
  {
    id: "bid-plumb-1",
    contractorId: "ctr-plumb-1",
    contractor: "Adirondack Plumbing",
    trade: "Plumbing",
    amount: 26500,
    startDate: "Jun 02",
    durationDays: 14,
    includes: ["Rough-in", "Water heater", "Fixture set"],
    excludes: ["Permit fees", "Trench work"],
    insuranceOk: false,
    risk: "high",
    score: 64,
    award: "pending",
  },
  {
    id: "bid-elec-1",
    contractorId: "ctr-elec-1",
    contractor: "Mohawk Electric LLC",
    trade: "Electrical",
    amount: 32100,
    startDate: "Jun 09",
    durationDays: 12,
    includes: ["200A service upgrade", "Rough-in", "Trim & devices"],
    excludes: ["Low-voltage", "Generator wiring"],
    insuranceOk: true,
    risk: "low",
    score: 89,
    award: "awarded",
  },
];

export const tasks: Task[] = [
  {
    id: "t1",
    title: "Confirm roofing scope and decking allowance",
    status: "in_progress",
    priority: "high",
    dueDate: "May 02",
    owner: "Unassigned",
    context: "Office",
  },
  {
    id: "t2",
    title: "Collect updated workers comp from Adirondack Plumbing",
    status: "needs_verification",
    priority: "high",
    dueDate: "May 03",
    owner: "Unassigned",
    context: "Office",
  },
  {
    id: "t3",
    title: "Walk roof access and dumpster placement",
    status: "planning",
    priority: "medium",
    dueDate: "May 06",
    owner: "Unassigned",
    context: "Field",
  },
  {
    id: "t4",
    title: "Photograph existing kitchen conditions",
    status: "in_progress",
    priority: "medium",
    dueDate: "May 04",
    owner: "Unassigned",
    context: "Field",
  },
  {
    id: "t5",
    title: "Issue permit set to electrical bidders",
    status: "review",
    priority: "medium",
    dueDate: "May 07",
    owner: "Unassigned",
    context: "Office",
  },
  {
    id: "t6",
    title: "Punch: replace damaged sill plate, NW corner",
    status: "planning",
    priority: "low",
    dueDate: "May 24",
    owner: "Unassigned",
    context: "Punch list",
  },
  {
    id: "t7",
    title: "Punch: re-caulk basement window wells",
    status: "planning",
    priority: "low",
    dueDate: "May 24",
    owner: "Unassigned",
    context: "Punch list",
  },
  {
    id: "t8",
    title: "Flag insurance coverage gap with Adirondack",
    status: "risk",
    priority: "high",
    dueDate: "May 03",
    owner: "Unassigned",
    context: "Office",
  },
];

export const documents: DocumentRecord[] = [
  {
    id: "d1",
    title: "Architect agreement (executed)",
    category: "Contract",
    contractor: "Loudonville Architecture",
    status: "complete",
    updated: "Apr 09",
    size: "1.1 MB",
  },
  {
    id: "d2",
    title: "Mohawk Electric — COI",
    category: "COI",
    contractor: "Mohawk Electric LLC",
    status: "complete",
    updated: "Apr 24",
    size: "210 KB",
  },
  {
    id: "d3",
    title: "Northline Roofing proposal v2",
    category: "Proposal",
    contractor: "Northline Roofing Co.",
    status: "in_progress",
    updated: "Apr 27",
    size: "640 KB",
  },
  {
    id: "d4",
    title: "Adirondack Plumbing — workers comp (expired)",
    category: "COI",
    contractor: "Adirondack Plumbing",
    status: "needs_verification",
    updated: "Apr 18",
    size: "180 KB",
  },
  {
    id: "d5",
    title: "Building permit application draft",
    category: "Permit",
    status: "planning",
    updated: "Apr 22",
    size: "320 KB",
  },
  {
    id: "d6",
    title: "Permit set — issued",
    category: "Plan",
    status: "complete",
    updated: "Apr 26",
    size: "8.4 MB",
  },
  {
    id: "d7",
    title: "Existing conditions photos, kitchen",
    category: "Photo",
    status: "complete",
    updated: "Apr 28",
    size: "12.8 MB",
  },
  {
    id: "d8",
    title: "Pre-construction inspection notes",
    category: "Inspection",
    status: "review",
    updated: "Apr 25",
    size: "98 KB",
  },
];

export const budgetCategories: BudgetCategory[] = [
  { id: "b1", name: "Site & demolition", estimate: 14000, committed: 12500, actual: 9200 },
  { id: "b2", name: "Framing & structure", estimate: 38000, committed: 36000, actual: 0 },
  { id: "b3", name: "Roofing", estimate: 42000, committed: 0, actual: 0 },
  { id: "b4", name: "Plumbing", estimate: 28000, committed: 0, actual: 0 },
  { id: "b5", name: "Electrical", estimate: 33000, committed: 32100, actual: 0 },
  { id: "b6", name: "HVAC", estimate: 26000, committed: 0, actual: 0 },
  { id: "b7", name: "Finishes", estimate: 48000, committed: 0, actual: 0 },
  { id: "b8", name: "Architecture & engineering", estimate: 22000, committed: 22000, actual: 18400 },
  { id: "b9", name: "Permits & inspections", estimate: 8500, committed: 4200, actual: 4200 },
  { id: "b10", name: "Contingency (10%)", estimate: 26000, committed: 0, actual: 0 },
];

export const changeOrders: ChangeOrder[] = [
  {
    id: "co-1",
    number: "CO-001",
    description: "Replace sill plate at NW corner discovered during demo.",
    contractor: "Hudson Carpentry",
    amount: 2400,
    status: "pending",
    submitted: "Apr 27",
  },
  {
    id: "co-2",
    number: "CO-002",
    description: "Upgrade panel from 150A to 200A per inspector recommendation.",
    contractor: "Mohawk Electric LLC",
    amount: 3850,
    status: "approved",
    submitted: "Apr 21",
  },
];

export const permits: Permit[] = [
  {
    id: "pm-1",
    type: "Building",
    number: "B-2026-1184",
    authority: "Town of Loudonville",
    status: "review",
    filed: "Apr 22",
    notes: "Plan review in progress.",
  },
  {
    id: "pm-2",
    type: "Electrical",
    number: "E-2026-0421",
    authority: "Town of Loudonville",
    status: "planning",
    filed: "—",
    notes: "Awaiting awarded contractor to file.",
  },
  {
    id: "pm-3",
    type: "Plumbing",
    number: "P-2026-0412",
    authority: "Town of Loudonville",
    status: "planning",
    filed: "—",
    notes: "Awaiting awarded contractor to file.",
  },
  {
    id: "pm-4",
    type: "Demolition",
    number: "D-2026-0388",
    authority: "Town of Loudonville",
    status: "complete",
    filed: "Apr 02",
    inspectionDate: "Apr 09",
    notes: "Demo complete, signed off.",
  },
];

export const recentActivity: ActivityItem[] = [
  {
    id: "a1",
    label: "Roofing bid received",
    context: "Northline Roofing Co.",
    timestamp: "2h ago",
    tone: "info",
  },
  {
    id: "a2",
    label: "Existing conditions photos uploaded",
    context: "Kitchen, batch 3",
    timestamp: "5h ago",
    tone: "neutral",
  },
  {
    id: "a3",
    label: "Coverage gap flagged",
    context: "Adirondack Plumbing — workers comp expired",
    timestamp: "Yesterday",
    tone: "warning",
  },
  {
    id: "a4",
    label: "Demolition permit closed out",
    context: "D-2026-0388",
    timestamp: "Yesterday",
    tone: "success",
  },
  {
    id: "a5",
    label: "Change order submitted",
    context: "CO-001 — sill plate replacement",
    timestamp: "2d ago",
    tone: "review",
  },
];

export const openDecisions: Decision[] = [
  {
    id: "dc1",
    label: "Award roofing trade",
    context: "Two bids in, scope variance under review",
    due: "May 02",
  },
  {
    id: "dc2",
    label: "Approve CO-001",
    context: "Sill plate replacement, $2,400",
    due: "May 03",
  },
  {
    id: "dc3",
    label: "Confirm tile selection",
    context: "Primary bath, lead time risk",
    due: "May 09",
  },
];

export const upcomingDeadlines: Decision[] = [
  { id: "u1", label: "Building permit response", due: "May 06", context: "Plan review" },
  { id: "u2", label: "Workers comp update — Adirondack", due: "May 03", context: "Compliance" },
  { id: "u3", label: "Roofing award decision", due: "May 02", context: "Trade selection" },
  { id: "u4", label: "Pre-rough-in walkthrough", due: "Jun 01", context: "Field" },
];

export const riskItems: RiskItem[] = [
  {
    id: "r1",
    label: "Adirondack Plumbing workers comp expired",
    severity: "high",
    context: "Cannot award until updated certificate received.",
  },
  {
    id: "r2",
    label: "Tile lead time exceeds finish window",
    severity: "medium",
    context: "Primary bath — alternate selection needed by May 09.",
  },
  {
    id: "r3",
    label: "Decking allowance not yet quantified",
    severity: "medium",
    context: "Roofing scope has placeholder; verify before award.",
  },
];

export const continueItems: ContinueItem[] = [
  {
    id: "k1",
    label: "Roofing bid comparison",
    href: "/bids",
    context: "Last opened 2h ago",
  },
  {
    id: "k2",
    label: "Adirondack Plumbing — qualification gap",
    href: "/contractors",
    context: "Last opened yesterday",
  },
];

export const dashboardStats = [
  { label: "Active contractors", value: "10", delta: "1 do-not-use, 2 prospect" },
  { label: "Open bids", value: "4", delta: "1 awarded, 1 shortlisted" },
  { label: "Open tasks", value: "8", delta: "3 high priority" },
  { label: "Documents pending review", value: "3", delta: "Needs verification" },
];

export const contractorStatusFilters = [
  "All",
  "Prospect",
  "Prequalification needed",
  "Bid requested",
  "Bid received",
  "Shortlisted",
  "Awarded",
  "Preferred",
  "Backup",
  "Do not use",
] as const;

export const tradeFilters = [
  "All",
  "General",
  "Roofing",
  "Framing",
  "Electrical",
  "Plumbing",
  "HVAC",
  "Painting",
  "Flooring",
  "Architect",
] as const;

export const taskFilters = [
  "All",
  "Today",
  "Office",
  "Field",
  "Punch list",
  "High priority",
  "At risk",
] as const;

export const documentCategories = [
  "All",
  "Contract",
  "COI",
  "Proposal",
  "Permit",
  "Plan",
  "Photo",
  "Inspection",
  "Other",
] as const;
