/**
 * Company-wide relationship taxonomy.
 *
 * These five concepts are designed to apply across the workspace —
 * Contacts, Bids, Documents, Tasks, Renovation, Properties, Market
 * Tracker — not just the Contacts module. Each is a flat string column
 * on Contact today; future modules can adopt the same allowlists and
 * label maps from this file.
 *
 * Storage: nullable strings on Contact. Validation happens at the
 * server-action boundary against the allowlists below; unknown values
 * are coerced to null so the database never holds untrusted input.
 */

// ---------- 1. Entity Type ----------

export const ENTITY_TYPES = [
  "PERSON",
  "COMPANY",
  "GOVERNMENT_OFFICE",
  "UTILITY_PROVIDER",
  "FINANCIAL_INSTITUTION",
  "PROPERTY",
  "PROJECT",
  "DOCUMENT",
  "TASK",
  "TRANSACTION",
  "DATA_SOURCE",
] as const;

export type EntityType = (typeof ENTITY_TYPES)[number];

export const entityTypeLabels: Record<EntityType, string> = {
  PERSON: "Person",
  COMPANY: "Company",
  GOVERNMENT_OFFICE: "Government office",
  UTILITY_PROVIDER: "Utility provider",
  FINANCIAL_INSTITUTION: "Financial institution",
  PROPERTY: "Property",
  PROJECT: "Project",
  DOCUMENT: "Document",
  TASK: "Task",
  TRANSACTION: "Transaction",
  DATA_SOURCE: "Data source",
};

// ---------- 2. Relationship Type ----------

export const RELATIONSHIP_TYPES = [
  "INTERNAL",
  "OWNER_PRINCIPAL",
  "RELATED_ENTITY",
  "EXTERNAL_PROFESSIONAL",
  "CONTRACTOR_SUBCONTRACTOR",
  "VENDOR_SUPPLIER",
  "GOVERNMENT_AHJ",
  "UTILITY",
  "TENANT_OCCUPANT",
  "FINANCIAL_LENDER",
  "INSURANCE_RISK",
  "DATA_PROVIDER",
  "REFERENCE_ONLY",
] as const;

export type RelationshipType = (typeof RELATIONSHIP_TYPES)[number];

export const relationshipTypeLabels: Record<RelationshipType, string> = {
  INTERNAL: "Internal",
  OWNER_PRINCIPAL: "Owner / principal",
  RELATED_ENTITY: "Related entity",
  EXTERNAL_PROFESSIONAL: "External professional",
  CONTRACTOR_SUBCONTRACTOR: "Contractor / subcontractor",
  VENDOR_SUPPLIER: "Vendor / supplier",
  GOVERNMENT_AHJ: "Government / AHJ",
  UTILITY: "Utility",
  TENANT_OCCUPANT: "Tenant / occupant",
  FINANCIAL_LENDER: "Financial / lender",
  INSURANCE_RISK: "Insurance / risk",
  DATA_PROVIDER: "Data provider",
  REFERENCE_ONLY: "Reference-only",
};

// ---------- 3. Functional Domain ----------

export const FUNCTIONAL_DOMAINS = [
  "LEGAL",
  "ACCOUNTING_TAX",
  "INSURANCE_RISK",
  "FINANCE_LENDING",
  "REAL_ESTATE_TRANSACTION",
  "PROPERTY_MANAGEMENT",
  "CONSTRUCTION_MANAGEMENT",
  "DESIGN_ENGINEERING",
  "PERMITTING_CODE",
  "UTILITIES_INFRASTRUCTURE",
  "MARKET_INTELLIGENCE",
  "MAINTENANCE_OPERATIONS",
  "LEASING_TENANT_RELATIONS",
  "ADMINISTRATIVE",
] as const;

export type FunctionalDomain = (typeof FUNCTIONAL_DOMAINS)[number];

export const functionalDomainLabels: Record<FunctionalDomain, string> = {
  LEGAL: "Legal",
  ACCOUNTING_TAX: "Accounting / tax",
  INSURANCE_RISK: "Insurance / risk",
  FINANCE_LENDING: "Finance / lending",
  REAL_ESTATE_TRANSACTION: "Real estate transaction",
  PROPERTY_MANAGEMENT: "Property management",
  CONSTRUCTION_MANAGEMENT: "Construction management",
  DESIGN_ENGINEERING: "Design / engineering",
  PERMITTING_CODE: "Permitting / code",
  UTILITIES_INFRASTRUCTURE: "Utilities / infrastructure",
  MARKET_INTELLIGENCE: "Market intelligence",
  MAINTENANCE_OPERATIONS: "Maintenance / operations",
  LEASING_TENANT_RELATIONS: "Leasing / tenant relations",
  ADMINISTRATIVE: "Administrative",
};

// ---------- 4 & 5. Specialty + Contextual Role ----------
// These are intentionally free-text so they can be tuned to whatever
// language the team actually uses ("Residential electrician",
// "Closing counsel", "Permit and inspection verification"). The
// "Examples" list below is for documentation; not enforced.

export const SPECIALTY_EXAMPLES = [
  "Real estate attorney",
  "Construction attorney",
  "CPA",
  "Insurance broker",
  "General contractor",
  "Electrician",
  "Plumber",
  "HVAC",
  "Mason",
  "Painter",
  "Surveyor",
  "Building department contact",
  "Appraiser",
  "Property manager",
  "Leasing agent",
  "Market data API",
] as const;

export const CONTEXT_ROLE_EXAMPLES = [
  "Bidder",
  "Awarded contractor",
  "Backup contractor",
  "Inspector",
  "Permit contact",
  "Document provider",
  "Invoice recipient",
  "Decision maker",
  "Reviewer",
  "Approver",
  "Emergency contact",
] as const;

// ---------- Type guards ----------

const ENTITY_SET = new Set<string>(ENTITY_TYPES);
const RELATIONSHIP_SET = new Set<string>(RELATIONSHIP_TYPES);
const DOMAIN_SET = new Set<string>(FUNCTIONAL_DOMAINS);

export function isEntityType(v: unknown): v is EntityType {
  return typeof v === "string" && ENTITY_SET.has(v);
}
export function isRelationshipType(v: unknown): v is RelationshipType {
  return typeof v === "string" && RELATIONSHIP_SET.has(v);
}
export function isFunctionalDomain(v: unknown): v is FunctionalDomain {
  return typeof v === "string" && DOMAIN_SET.has(v);
}

/**
 * Default entity type for a contact based on whether a personal name is
 * present. Useful when migrating older records that don't have an
 * explicit entityType set.
 */
export function inferEntityType(c: {
  firstName?: string | null;
  lastName?: string | null;
  company?: string | null;
}): EntityType {
  const hasName =
    !!(c.firstName && c.firstName.trim()) ||
    !!(c.lastName && c.lastName.trim());
  if (hasName) return "PERSON";
  if (c.company && c.company.trim()) return "COMPANY";
  return "PERSON";
}
