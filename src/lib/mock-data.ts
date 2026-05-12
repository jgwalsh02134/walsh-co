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

/**
 * User-facing lifecycle status for the contractor-comparison workspace.
 * Distinct from the legacy `BidStatus` (which is consumed by
 * `Contractor.bidStatus` and the existing `bidStatusLabels` map). New
 * UI prefers `lifecycle`; existing UI stays on `status`.
 */
export type BidLifecycleStatus =
  | "draft"
  | "requested"
  | "received"
  | "under_review"
  | "needs_clarification"
  | "accepted"
  | "rejected"
  | "archived";

/**
 * User-facing trade category for the contractor-comparison workspace.
 * Wider grouping than `Trade` (which is the fine-grained classification
 * kept for the renovation page's existing usage).
 */
export type BidTradeCategory =
  | "general_contractor"
  | "electrical"
  | "plumbing"
  | "hvac"
  | "masonry"
  | "roofing"
  | "painting"
  | "flooring"
  | "windows_doors"
  | "sitework_drainage"
  | "inspection_testing"
  | "other";

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

  /** New optional fields for the contractor-comparison workspace. All
   *  optional so existing /renovation rendering keeps type-checking. */
  lifecycle?: BidLifecycleStatus;
  tradeCategory?: BidTradeCategory;
  /** Slug of a tracked property (src/lib/market-data.ts). */
  propertySlug?: string;
  /** Free-form date string for when the bid was received (e.g. "Apr 27"). */
  dateReceived?: string;
  /** 0–100 completeness signal — how much of the requested scope the
   *  bid actually addresses. Higher is better. */
  completenessPct?: number;
  /** Optional document id (in `documents`) representing the bid PDF. */
  linkedDocumentId?: string;
  /** Short next-action note shown on the comparison row. */
  nextAction?: string;
};

export type TaskLane = "today" | "this_week" | "waiting" | "done";

/**
 * Renovation execution lane — used by /tasks to bucket work by where it
 * is in the field/office flow. Independent of the legacy `TaskLane` so
 * /renovation rendering keeps working without changes. Tasks may set
 * both; the new /tasks UI reads `executionLane` first and falls back to
 * a mapping derived from the legacy `lane` + state when absent.
 */
export type TaskExecutionLane =
  | "blocked"
  | "needs_decision"
  | "ready"
  | "in_progress"
  | "waiting_on_vendor"
  | "done";

export const taskExecutionLaneLabels: Record<
  TaskExecutionLane,
  { label: string; description: string }
> = {
  blocked: {
    label: "Blocked",
    description: "Cannot move forward until something resolves.",
  },
  needs_decision: {
    label: "Needs decision",
    description: "Waiting on a call from you before work can proceed.",
  },
  ready: { label: "Ready", description: "Queued and ready to start." },
  in_progress: {
    label: "In progress",
    description: "Active right now — being worked on.",
  },
  waiting_on_vendor: {
    label: "Waiting on vendor",
    description: "Pending response from a contractor or third party.",
  },
  done: { label: "Done", description: "Recently closed." },
};

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

  /** Renovation execution lane — drives /tasks board. Optional so older
   *  rows that don't set it fall back to a derived value. */
  executionLane?: TaskExecutionLane;
  /** Slug of the tracked property this task belongs to. */
  propertySlug?: string;
  /** Optional bid id (placeholder linkage to `bids`). */
  linkedBidId?: string;
  /** Optional document id (placeholder linkage to `documents`). */
  linkedDocumentId?: string;
  /** Optional budget category id (placeholder linkage to
   *  `budgetCategories`). */
  linkedBudgetCategoryId?: string;
  /** Optional contact email for follow-up drafts. */
  contactEmail?: string;
  /** Optional contact name shown on the Gmail draft. */
  contactName?: string;
};

/**
 * Document category — user-facing taxonomy for the document workspace
 * filter chips. Wider than `DocumentRecord.type` (which is the legacy
 * fine-grained classification kept for the renovation page).
 */
export type DocumentCategory =
  | "inspection"
  | "contractor_bid"
  | "survey"
  | "deed_title"
  | "tax_assessment"
  | "permit"
  | "insurance"
  | "lease_rental"
  | "receipt_invoice"
  | "photo_media"
  | "other";

export type DocumentExtractionStatus =
  | "not_started"
  | "draft_ready"
  | "reviewed";

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
  /** New optional fields for the document workspace foundation. */
  category?: DocumentCategory;
  /** Slug of a tracked property in src/lib/market-data.ts, when this
   *  document belongs to a specific property. */
  propertySlug?: string;
  extractionStatus?: DocumentExtractionStatus;
  /** Free-form last-reviewed string (e.g. "Apr 24"). */
  lastReviewed?: string;
};

/**
 * Renovation budget taxonomy. Provides a stable, user-facing grouping
 * across the 13 categories the budget workspace recognizes. Existing
 * mock rows fall back to "other" when `kind` is unset.
 */
export type BudgetCategoryKind =
  | "acquisition"
  | "permits_municipal"
  | "structural"
  | "electrical"
  | "plumbing"
  | "hvac"
  | "exterior"
  | "interior"
  | "sitework_drainage"
  | "appliances_fixtures"
  | "insurance_legal"
  | "contingency"
  | "other";

export const budgetCategoryKindLabels: Record<BudgetCategoryKind, string> = {
  acquisition: "Acquisition",
  permits_municipal: "Permits / municipal",
  structural: "Structural",
  electrical: "Electrical",
  plumbing: "Plumbing",
  hvac: "HVAC",
  exterior: "Exterior",
  interior: "Interior",
  sitework_drainage: "Sitework / drainage",
  appliances_fixtures: "Appliances / fixtures",
  insurance_legal: "Insurance / legal",
  contingency: "Contingency",
  other: "Other",
};

/** Lightweight "open issue" annotation surfaced on /budget. Pure UI;
 *  not a database concept. */
export type BudgetIssueKind =
  | "over_budget"
  | "missing_quote"
  | "scope_pending"
  | "contingency_low";

export type BudgetCategory = {
  id: string;
  name: string;
  estimated: number;
  quoted: number;
  committed: number;
  paid: number;
  /** Taxonomy bucket — optional so existing rows don't error. */
  kind?: BudgetCategoryKind;
  /** Slug of the property this category belongs to. */
  propertySlug?: string;
  /** Placeholder linkage to one or more bids in `bids`. */
  linkedBidIds?: string[];
  /** Plain-language note used by the Open Issues panel. */
  issue?: { kind: BudgetIssueKind; note: string };
  /** Free-form planning note. */
  notes?: string;
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
    lifecycle: "under_review",
    tradeCategory: "roofing",
    propertySlug: "322-osborne",
    dateReceived: "Apr 27",
    completenessPct: 85,
    linkedDocumentId: "d3",
    nextAction: "Confirm decking allowance",
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
    lifecycle: "needs_clarification",
    tradeCategory: "roofing",
    propertySlug: "322-osborne",
    dateReceived: "May 02",
    completenessPct: 70,
    nextAction: "Ask about gutter line item",
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
    lifecycle: "needs_clarification",
    tradeCategory: "plumbing",
    propertySlug: "322-osborne",
    dateReceived: "May 04",
    completenessPct: 60,
    nextAction: "Trench-work scope unclear; request clarification",
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
    lifecycle: "accepted",
    tradeCategory: "electrical",
    propertySlug: "322-osborne",
    dateReceived: "Apr 21",
    completenessPct: 95,
    linkedDocumentId: "d2",
    nextAction: "Schedule kickoff",
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
    lifecycle: "under_review",
    tradeCategory: "general_contractor",
    propertySlug: "322-osborne",
    dateReceived: "May 06",
    completenessPct: 80,
    nextAction: "Compare against framing-only bid",
  },
  {
    id: "bid-hvac-1",
    contractorId: "ctr-hvac-1",
    contractor: "Empire HVAC Services",
    trade: "HVAC",
    amount: 26000,
    startDate: "Jun 16",
    durationDays: 10,
    includes: ["Equipment", "Ductwork", "Thermostats"],
    excludes: ["Gas line work"],
    risk: "medium",
    status: "requested",
    decision: "pending",
    lifecycle: "requested",
    tradeCategory: "hvac",
    propertySlug: "322-osborne",
    completenessPct: 0,
    nextAction: "Awaiting proposal",
  },
  {
    id: "bid-mason-1",
    contractorId: "ctr-mason-1",
    contractor: "Albany Masonry & Stone",
    trade: "Masonry",
    amount: 18750,
    startDate: "May 26",
    durationDays: 8,
    includes: ["Foundation patch", "Chimney crown rebuild"],
    excludes: ["Structural underpinning"],
    risk: "medium",
    status: "received",
    decision: "pending",
    lifecycle: "received",
    tradeCategory: "masonry",
    propertySlug: "322-osborne",
    dateReceived: "May 09",
    completenessPct: 75,
    nextAction: "Site walkthrough scheduled",
  },
  {
    id: "bid-paint-1",
    contractorId: "ctr-paint-1",
    contractor: "True North Painting",
    trade: "Painting",
    amount: 14200,
    startDate: "Jul 07",
    durationDays: 6,
    includes: ["Interior prep", "Two coats premium", "Trim & doors"],
    excludes: ["Exterior", "Wallpaper removal"],
    risk: "low",
    status: "declined",
    decision: "rejected",
    lifecycle: "rejected",
    tradeCategory: "painting",
    propertySlug: "322-osborne",
    dateReceived: "May 03",
    completenessPct: 90,
    nextAction: "Bid declined — over budget",
  },
  {
    id: "bid-site-1",
    contractorId: "ctr-site-1",
    contractor: "Adirondack Excavation",
    trade: "Concrete",
    amount: 0,
    startDate: "—",
    durationDays: 0,
    includes: ["Drainage scope TBD"],
    excludes: [],
    risk: "medium",
    status: "none",
    decision: "pending",
    lifecycle: "draft",
    tradeCategory: "sitework_drainage",
    propertySlug: "322-osborne",
    completenessPct: 0,
    nextAction: "Draft RFP — site grading + french drain",
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
    executionLane: "in_progress",
    propertySlug: "322-osborne",
    linkedBidId: "bid-roof-1",
    linkedBudgetCategoryId: "b3",
    contactName: "Pat Lawson",
    contactEmail: "estimating@northline.example",
  },
  {
    id: "t2",
    title: "Collect updated workers comp from Adirondack Plumbing",
    lane: "today",
    priority: "high",
    dueDate: "Today",
    owner: "JW",
    context: "Office",
    executionLane: "blocked",
    propertySlug: "322-osborne",
    linkedBidId: "bid-plumb-1",
    linkedBudgetCategoryId: "b4",
    linkedDocumentId: "d4",
    contactName: "Sam Whitley",
    contactEmail: "office@adirondackplumbing.example",
  },
  {
    id: "t3",
    title: "Photograph existing kitchen conditions (full coverage)",
    lane: "today",
    priority: "medium",
    dueDate: "Today",
    owner: "JW",
    context: "Field",
    executionLane: "ready",
    propertySlug: "322-osborne",
    linkedDocumentId: "d7",
  },
  {
    id: "t4",
    title: "Award roofing trade",
    lane: "this_week",
    priority: "high",
    dueDate: "Fri",
    owner: "JW",
    context: "Office",
    executionLane: "needs_decision",
    propertySlug: "322-osborne",
    linkedBidId: "bid-roof-1",
    linkedBudgetCategoryId: "b3",
  },
  {
    id: "t5",
    title: "Walk roof access and dumpster placement",
    lane: "this_week",
    priority: "medium",
    dueDate: "Wed",
    owner: "JW",
    context: "Field",
    executionLane: "ready",
    propertySlug: "322-osborne",
    linkedBudgetCategoryId: "b1",
  },
  {
    id: "t6",
    title: "Issue permit set to electrical bidders",
    lane: "this_week",
    priority: "medium",
    dueDate: "Thu",
    owner: "JW",
    context: "Office",
    executionLane: "ready",
    propertySlug: "322-osborne",
    linkedBidId: "bid-elec-1",
    linkedBudgetCategoryId: "b9",
    linkedDocumentId: "d6",
  },
  {
    id: "t7",
    title: "Confirm tile selection for primary bath (lead time risk)",
    lane: "this_week",
    priority: "high",
    dueDate: "Fri",
    owner: "JW",
    context: "Office",
    executionLane: "needs_decision",
    propertySlug: "322-osborne",
    linkedBudgetCategoryId: "b7",
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
    executionLane: "waiting_on_vendor",
    propertySlug: "322-osborne",
    linkedBudgetCategoryId: "b9",
    linkedDocumentId: "d5",
  },
  {
    id: "t9",
    title: "Pinebush HVAC qualification documents",
    lane: "waiting",
    priority: "medium",
    dueDate: "May 09",
    owner: "Pinebush",
    context: "Office",
    executionLane: "waiting_on_vendor",
    propertySlug: "322-osborne",
    linkedBidId: "bid-hvac-1",
    linkedBudgetCategoryId: "b6",
  },
  {
    id: "t10",
    title: "Punch: replace damaged sill plate, NW corner",
    lane: "waiting",
    priority: "low",
    dueDate: "May 24",
    owner: "Hudson",
    context: "Punch list",
    executionLane: "ready",
    propertySlug: "322-osborne",
    linkedBidId: "bid-fram-1",
    linkedBudgetCategoryId: "b2",
  },
  {
    id: "t11",
    title: "Demolition permit closed out",
    lane: "done",
    priority: "medium",
    dueDate: "Apr 09",
    owner: "JW",
    context: "Office",
    executionLane: "done",
    propertySlug: "322-osborne",
    linkedBudgetCategoryId: "b9",
  },
  {
    id: "t12",
    title: "Architect agreement executed",
    lane: "done",
    priority: "medium",
    dueDate: "Apr 09",
    owner: "JW",
    context: "Office",
    executionLane: "done",
    propertySlug: "322-osborne",
    linkedBudgetCategoryId: "b8",
    linkedDocumentId: "d1",
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
    category: "other",
    propertySlug: "322-osborne",
    extractionStatus: "reviewed",
    lastReviewed: "Apr 11",
  },
  {
    id: "d2",
    name: "Mohawk Electric — Certificate of Insurance",
    type: "COI",
    linkedTo: "Mohawk Electric LLC",
    verified: "verified",
    date: "Apr 24",
    category: "insurance",
    propertySlug: "322-osborne",
    extractionStatus: "draft_ready",
    lastReviewed: "Apr 25",
  },
  {
    id: "d3",
    name: "Northline Roofing proposal v2",
    type: "Proposal",
    linkedTo: "Northline Roofing Co.",
    verified: "needs_verification",
    date: "Apr 27",
    category: "contractor_bid",
    propertySlug: "322-osborne",
    extractionStatus: "draft_ready",
  },
  {
    id: "d4",
    name: "Adirondack Plumbing — workers comp",
    type: "COI",
    linkedTo: "Adirondack Plumbing",
    verified: "needs_verification",
    date: "Apr 18",
    category: "insurance",
    propertySlug: "322-osborne",
    extractionStatus: "not_started",
  },
  {
    id: "d5",
    name: "Building permit application",
    type: "Permit",
    linkedTo: "Town of Loudonville",
    verified: "needs_verification",
    date: "Apr 22",
    category: "permit",
    propertySlug: "322-osborne",
    extractionStatus: "not_started",
  },
  {
    id: "d6",
    name: "Permit set (issued)",
    type: "Plan",
    linkedTo: "Loudonville Architecture",
    verified: "verified",
    date: "Apr 26",
    category: "permit",
    propertySlug: "322-osborne",
    extractionStatus: "reviewed",
    lastReviewed: "Apr 27",
  },
  {
    id: "d7",
    name: "Existing conditions photos — kitchen",
    type: "Photo",
    linkedTo: "322 Osborne Rd",
    verified: "not_required",
    date: "Apr 28",
    category: "photo_media",
    propertySlug: "322-osborne",
    extractionStatus: "not_started",
  },
  {
    id: "d8",
    name: "Pre-construction inspection notes",
    type: "Inspection",
    linkedTo: "322 Osborne Rd",
    verified: "needs_verification",
    date: "Apr 25",
    category: "inspection",
    propertySlug: "322-osborne",
    extractionStatus: "draft_ready",
  },
  {
    id: "d9",
    name: "51 Loudonwood — homeowner deed",
    type: "Report",
    linkedTo: "51 Loudonwood E",
    verified: "verified",
    date: "Mar 02",
    category: "deed_title",
    propertySlug: "51-loudonwood",
    extractionStatus: "reviewed",
    lastReviewed: "Mar 03",
  },
  {
    id: "d10",
    name: "16 Momrow — 2025 tax bill",
    type: "Report",
    linkedTo: "Town of Menands",
    verified: "needs_verification",
    date: "Apr 14",
    category: "tax_assessment",
    propertySlug: "16-momrow",
    extractionStatus: "draft_ready",
  },
  {
    id: "d11",
    name: "16 Momrow — current lease (tenant)",
    type: "Contract",
    linkedTo: "16 Momrow Ct",
    verified: "verified",
    date: "Jan 15",
    category: "lease_rental",
    propertySlug: "16-momrow",
    extractionStatus: "reviewed",
    lastReviewed: "Jan 17",
  },
  {
    id: "d12",
    name: "51 Loudonwood — boundary survey",
    type: "Report",
    linkedTo: "Albany County Surveyors",
    verified: "verified",
    date: "Feb 28",
    category: "survey",
    propertySlug: "51-loudonwood",
    extractionStatus: "reviewed",
    lastReviewed: "Mar 01",
  },
  {
    id: "d13",
    name: "Adirondack Plumbing — invoice #2041",
    type: "Report",
    linkedTo: "Adirondack Plumbing",
    verified: "needs_verification",
    date: "Apr 30",
    category: "receipt_invoice",
    propertySlug: "322-osborne",
    extractionStatus: "not_started",
  },
];

export const budgetCategories: BudgetCategory[] = [
  {
    id: "b0",
    name: "Acquisition",
    estimated: 285000,
    quoted: 285000,
    committed: 285000,
    paid: 285000,
    kind: "acquisition",
    propertySlug: "322-osborne",
    notes: "Purchase closed prior to renovation start.",
  },
  {
    id: "b1",
    name: "Site & demolition",
    estimated: 14000,
    quoted: 13500,
    committed: 12500,
    paid: 9200,
    kind: "sitework_drainage",
    propertySlug: "322-osborne",
    linkedBidIds: ["bid-site-1"],
    issue: {
      kind: "scope_pending",
      note: "Drainage scope is still draft RFP — site grading + french drain TBD.",
    },
  },
  {
    id: "b2",
    name: "Framing & structure",
    estimated: 38000,
    quoted: 36500,
    committed: 36000,
    paid: 0,
    kind: "structural",
    propertySlug: "322-osborne",
    linkedBidIds: ["bid-fram-1"],
  },
  {
    id: "b3",
    name: "Roofing",
    estimated: 42000,
    quoted: 39800,
    committed: 0,
    paid: 0,
    kind: "exterior",
    propertySlug: "322-osborne",
    linkedBidIds: ["bid-roof-1", "bid-roof-2"],
    issue: {
      kind: "scope_pending",
      note: "Two bids under review — decking allowance + gutter line item open.",
    },
  },
  {
    id: "b4",
    name: "Plumbing",
    estimated: 28000,
    quoted: 26500,
    committed: 0,
    paid: 0,
    kind: "plumbing",
    propertySlug: "322-osborne",
    linkedBidIds: ["bid-plumb-1"],
    issue: {
      kind: "scope_pending",
      note: "Adirondack workers comp expired — cannot award until updated COI is on file.",
    },
  },
  {
    id: "b5",
    name: "Electrical",
    estimated: 33000,
    quoted: 32100,
    committed: 32100,
    paid: 6500,
    kind: "electrical",
    propertySlug: "322-osborne",
    linkedBidIds: ["bid-elec-1"],
  },
  {
    id: "b6",
    name: "HVAC",
    estimated: 26000,
    quoted: 0,
    committed: 0,
    paid: 0,
    kind: "hvac",
    propertySlug: "322-osborne",
    linkedBidIds: ["bid-hvac-1"],
    issue: { kind: "missing_quote", note: "Empire HVAC proposal not yet received." },
  },
  {
    id: "b7",
    name: "Finishes",
    estimated: 48000,
    quoted: 0,
    committed: 0,
    paid: 0,
    kind: "interior",
    propertySlug: "322-osborne",
    issue: {
      kind: "missing_quote",
      note: "Paint declined; finishes not yet quoted overall.",
    },
  },
  {
    id: "b8",
    name: "Architecture & engineering",
    estimated: 22000,
    quoted: 22000,
    committed: 22000,
    paid: 18400,
    kind: "other",
    propertySlug: "322-osborne",
    notes: "Architect agreement executed.",
  },
  {
    id: "b9",
    name: "Permits & inspections",
    estimated: 8500,
    quoted: 4200,
    committed: 4200,
    paid: 4200,
    kind: "permits_municipal",
    propertySlug: "322-osborne",
  },
  {
    id: "b11",
    name: "Appliances / fixtures",
    estimated: 16000,
    quoted: 0,
    committed: 0,
    paid: 0,
    kind: "appliances_fixtures",
    propertySlug: "322-osborne",
    issue: {
      kind: "missing_quote",
      note: "Appliance package not yet specified.",
    },
  },
  {
    id: "b12",
    name: "Insurance / legal",
    estimated: 6000,
    quoted: 0,
    committed: 0,
    paid: 0,
    kind: "insurance_legal",
    propertySlug: "322-osborne",
    notes: "Builders risk + closing legal — placeholder allowance.",
  },
  {
    id: "b10",
    name: "Contingency reserve (10%)",
    estimated: 26000,
    quoted: 0,
    committed: 0,
    paid: 0,
    kind: "contingency",
    propertySlug: "322-osborne",
  },
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
