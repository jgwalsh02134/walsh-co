import type {
  BidStatus,
  ContractorStatus,
  InsuranceStatus,
  Priority,
  RiskLevel,
} from "./status";

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
  | "Engineer";

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
] as const;

export type Contractor = {
  id: string;
  company: string;
  contact: string;
  trade: Trade;
  phone: string;
  email: string;
  status: ContractorStatus;
  insurance: InsuranceStatus;
  bidStatus: BidStatus;
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
  risk: RiskLevel;
  status: BidStatus;
  decision: "pending" | "approved" | "rejected";
};

export type TaskLane = "today" | "this_week" | "waiting" | "done";

export const taskLaneLabels: Record<TaskLane, string> = {
  today: "Today",
  this_week: "This week",
  waiting: "Waiting",
  done: "Done",
};

export type Task = {
  id: string;
  title: string;
  lane: TaskLane;
  priority: Priority;
  dueDate: string;
  owner: string;
  context: "Office" | "Field" | "Punch list";
  notes?: string;
};

export type DocumentRecord = {
  id: string;
  name: string;
  type:
    | "Contract"
    | "COI"
    | "Proposal"
    | "Permit"
    | "Plan"
    | "Photo"
    | "Inspection"
    | "Report";
  linkedTo: string;
  verified: "verified" | "needs_verification" | "not_required";
  date: string;
};

export type BudgetCategory = {
  id: string;
  name: string;
  estimated: number;
  quoted: number;
  committed: number;
  paid: number;
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
    company: "Northline Roofing Co.",
    contact: "Pat Lawson",
    trade: "Roofing",
    phone: "(518) 555-0142",
    email: "estimating@northline.example",
    status: "qualified",
    insurance: "verified",
    bidStatus: "received",
    notes: "Bid received; scope review pending decking allowance.",
  },
  {
    id: "ctr-roof-2",
    company: "Capital Roofing & Sheet Metal",
    contact: "Dana Powell",
    trade: "Roofing",
    phone: "(518) 555-0167",
    email: "bids@capitalroofing.example",
    status: "prequalification_needed",
    insurance: "verified",
    bidStatus: "received",
    notes: "Awaiting W-9 and references.",
  },
  {
    id: "ctr-elec-1",
    company: "Mohawk Electric LLC",
    contact: "Jordan Reilly",
    trade: "Electrical",
    phone: "(518) 555-0119",
    email: "office@mohawkelectric.example",
    status: "preferred",
    insurance: "verified",
    bidStatus: "awarded",
    notes: "200A panel upgrade scope confirmed and awarded.",
  },
  {
    id: "ctr-plumb-1",
    company: "Adirondack Plumbing",
    contact: "Sam Whitley",
    trade: "Plumbing",
    phone: "(518) 555-0188",
    email: "office@adirondackplumbing.example",
    status: "qualified",
    insurance: "expired",
    bidStatus: "received",
    notes: "Workers comp certificate expired — block until updated.",
  },
  {
    id: "ctr-hvac-1",
    company: "Pinebush HVAC",
    contact: "Riley Chen",
    trade: "HVAC",
    phone: "(518) 555-0102",
    email: "service@pinebush.example",
    status: "prequalification_needed",
    insurance: "missing",
    bidStatus: "requested",
    notes: "New prospect; no qualification documents on file yet.",
  },
  {
    id: "ctr-fram-1",
    company: "Hudson Carpentry",
    contact: "Alex Vega",
    trade: "Framing",
    phone: "(518) 555-0156",
    email: "shop@hudsoncarpentry.example",
    status: "preferred",
    insurance: "verified",
    bidStatus: "shortlisted",
    notes: "Preferred trade partner across prior projects.",
  },
  {
    id: "ctr-arch-1",
    company: "Loudonville Architecture",
    contact: "Morgan Hale",
    trade: "Architect",
    phone: "(518) 555-0173",
    email: "studio@loudonvillearch.example",
    status: "preferred",
    insurance: "verified",
    bidStatus: "awarded",
    notes: "Permit set issued; punch list AOR through closeout.",
  },
  {
    id: "ctr-paint-1",
    company: "Crescent Painting",
    contact: "Jamie Ortiz",
    trade: "Painting",
    phone: "(518) 555-0134",
    email: "estimates@crescentpaint.example",
    status: "prospect",
    insurance: "missing",
    bidStatus: "none",
    notes: "Referral from architect; not yet qualified.",
  },
  {
    id: "ctr-floor-1",
    company: "Riverbend Flooring",
    contact: "Taylor Brooks",
    trade: "Flooring",
    phone: "(518) 555-0181",
    email: "sales@riverbendfloor.example",
    status: "backup",
    insurance: "verified",
    bidStatus: "requested",
    notes: "Backup if preferred installer is unavailable.",
  },
  {
    id: "ctr-demo-1",
    company: "Eastline Demo",
    contact: "Casey Doyle",
    trade: "Demolition",
    phone: "(518) 555-0163",
    email: "office@eastlinedemo.example",
    status: "do_not_use",
    insurance: "verified",
    bidStatus: "none",
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
    risk: "low",
    status: "shortlisted",
    decision: "pending",
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
    risk: "medium",
    status: "received",
    decision: "pending",
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
    risk: "high",
    status: "received",
    decision: "pending",
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
    risk: "low",
    status: "awarded",
    decision: "approved",
  },
  {
    id: "bid-fram-1",
    contractorId: "ctr-fram-1",
    contractor: "Hudson Carpentry",
    trade: "Framing",
    amount: 36500,
    startDate: "May 19",
    durationDays: 18,
    includes: ["Demo support", "Sill plate replacement", "New partitions"],
    excludes: ["Steel beams", "Concrete pads"],
    risk: "low",
    status: "shortlisted",
    decision: "pending",
  },
];

export const tasks: Task[] = [
  {
    id: "t1",
    title: "Confirm roofing decking allowance with Northline",
    lane: "today",
    priority: "high",
    dueDate: "Today",
    owner: "JW",
    context: "Office",
  },
  {
    id: "t2",
    title: "Collect updated workers comp from Adirondack Plumbing",
    lane: "today",
    priority: "high",
    dueDate: "Today",
    owner: "JW",
    context: "Office",
  },
  {
    id: "t3",
    title: "Photograph existing kitchen conditions (full coverage)",
    lane: "today",
    priority: "medium",
    dueDate: "Today",
    owner: "JW",
    context: "Field",
  },
  {
    id: "t4",
    title: "Award roofing trade",
    lane: "this_week",
    priority: "high",
    dueDate: "Fri",
    owner: "JW",
    context: "Office",
  },
  {
    id: "t5",
    title: "Walk roof access and dumpster placement",
    lane: "this_week",
    priority: "medium",
    dueDate: "Wed",
    owner: "JW",
    context: "Field",
  },
  {
    id: "t6",
    title: "Issue permit set to electrical bidders",
    lane: "this_week",
    priority: "medium",
    dueDate: "Thu",
    owner: "JW",
    context: "Office",
  },
  {
    id: "t7",
    title: "Confirm tile selection for primary bath (lead time risk)",
    lane: "this_week",
    priority: "high",
    dueDate: "Fri",
    owner: "JW",
    context: "Office",
  },
  {
    id: "t8",
    title: "Building permit response from Town of Loudonville",
    lane: "waiting",
    priority: "medium",
    dueDate: "May 06",
    owner: "Town",
    context: "Office",
    notes: "Plan review in progress.",
  },
  {
    id: "t9",
    title: "Pinebush HVAC qualification documents",
    lane: "waiting",
    priority: "medium",
    dueDate: "May 09",
    owner: "Pinebush",
    context: "Office",
  },
  {
    id: "t10",
    title: "Punch: replace damaged sill plate, NW corner",
    lane: "waiting",
    priority: "low",
    dueDate: "May 24",
    owner: "Hudson",
    context: "Punch list",
  },
  {
    id: "t11",
    title: "Demolition permit closed out",
    lane: "done",
    priority: "medium",
    dueDate: "Apr 09",
    owner: "JW",
    context: "Office",
  },
  {
    id: "t12",
    title: "Architect agreement executed",
    lane: "done",
    priority: "medium",
    dueDate: "Apr 09",
    owner: "JW",
    context: "Office",
  },
];

export const documents: DocumentRecord[] = [
  {
    id: "d1",
    name: "Architect agreement (executed)",
    type: "Contract",
    linkedTo: "Loudonville Architecture",
    verified: "verified",
    date: "Apr 09",
  },
  {
    id: "d2",
    name: "Mohawk Electric — Certificate of Insurance",
    type: "COI",
    linkedTo: "Mohawk Electric LLC",
    verified: "verified",
    date: "Apr 24",
  },
  {
    id: "d3",
    name: "Northline Roofing proposal v2",
    type: "Proposal",
    linkedTo: "Northline Roofing Co.",
    verified: "needs_verification",
    date: "Apr 27",
  },
  {
    id: "d4",
    name: "Adirondack Plumbing — workers comp",
    type: "COI",
    linkedTo: "Adirondack Plumbing",
    verified: "needs_verification",
    date: "Apr 18",
  },
  {
    id: "d5",
    name: "Building permit application",
    type: "Permit",
    linkedTo: "Town of Loudonville",
    verified: "needs_verification",
    date: "Apr 22",
  },
  {
    id: "d6",
    name: "Permit set (issued)",
    type: "Plan",
    linkedTo: "Loudonville Architecture",
    verified: "verified",
    date: "Apr 26",
  },
  {
    id: "d7",
    name: "Existing conditions photos — kitchen",
    type: "Photo",
    linkedTo: "322 Osborne Rd",
    verified: "not_required",
    date: "Apr 28",
  },
  {
    id: "d8",
    name: "Pre-construction inspection notes",
    type: "Inspection",
    linkedTo: "322 Osborne Rd",
    verified: "needs_verification",
    date: "Apr 25",
  },
];

export const budgetCategories: BudgetCategory[] = [
  { id: "b1", name: "Site & demolition", estimated: 14000, quoted: 13500, committed: 12500, paid: 9200 },
  { id: "b2", name: "Framing & structure", estimated: 38000, quoted: 36500, committed: 36000, paid: 0 },
  { id: "b3", name: "Roofing", estimated: 42000, quoted: 39800, committed: 0, paid: 0 },
  { id: "b4", name: "Plumbing", estimated: 28000, quoted: 26500, committed: 0, paid: 0 },
  { id: "b5", name: "Electrical", estimated: 33000, quoted: 32100, committed: 32100, paid: 6500 },
  { id: "b6", name: "HVAC", estimated: 26000, quoted: 0, committed: 0, paid: 0 },
  { id: "b7", name: "Finishes", estimated: 48000, quoted: 0, committed: 0, paid: 0 },
  { id: "b8", name: "Architecture & engineering", estimated: 22000, quoted: 22000, committed: 22000, paid: 18400 },
  { id: "b9", name: "Permits & inspections", estimated: 8500, quoted: 4200, committed: 4200, paid: 4200 },
  { id: "b10", name: "Contingency (10%)", estimated: 26000, quoted: 0, committed: 0, paid: 0 },
];

export type DecisionItem = {
  id: string;
  label: string;
  context: string;
  due: string;
};

export const nextDecisions: DecisionItem[] = [
  {
    id: "dc1",
    label: "Award roofing trade",
    context: "Two bids in, decking allowance variance to resolve.",
    due: "May 02",
  },
  {
    id: "dc2",
    label: "Confirm tile selection",
    context: "Primary bath — lead time risk.",
    due: "May 09",
  },
  {
    id: "dc3",
    label: "Resolve Adirondack workers comp",
    context: "Cannot award plumbing until updated certificate received.",
    due: "May 03",
  },
];
