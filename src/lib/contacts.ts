import {
  ComplianceStatus,
  ContactCategory,
  ContactStatus,
} from "@prisma/client";
import type { StatusTone } from "./status";

/**
 * Human-readable labels for the Contact enums + ordered lists for use in
 * dropdowns, filter rails, etc. Edit here to add or rename categories.
 */

export const contactCategoryLabels: Record<ContactCategory, string> = {
  CONTRACTORS_TRADES: "Contractors / Trades",
  LEGAL: "Legal",
  INSURANCE: "Insurance",
  MUNICIPAL: "Municipal / Town",
  UTILITIES: "Utilities",
  FINANCE_ACCOUNTING: "Finance / Accounting",
  REAL_ESTATE_LEASING: "Real Estate / Leasing",
  PROPERTY_MANAGEMENT: "Property Management",
  TENANTS_OCCUPANTS: "Tenants / Occupants",
  SUPPLIERS: "Suppliers",
  INSPECTORS_TESTING: "Inspectors / Testing",
  OTHER: "Other",
};

export const contactCategoryOrder: ContactCategory[] = [
  "CONTRACTORS_TRADES",
  "LEGAL",
  "INSURANCE",
  "MUNICIPAL",
  "UTILITIES",
  "FINANCE_ACCOUNTING",
  "REAL_ESTATE_LEASING",
  "PROPERTY_MANAGEMENT",
  "TENANTS_OCCUPANTS",
  "SUPPLIERS",
  "INSPECTORS_TESTING",
  "OTHER",
];

export const contactStatusLabels: Record<
  ContactStatus,
  { label: string; tone: StatusTone }
> = {
  ACTIVE: { label: "Active", tone: "success" },
  PROSPECT: { label: "Prospect", tone: "info" },
  PREFERRED: { label: "Preferred", tone: "success" },
  BACKUP: { label: "Backup", tone: "neutral" },
  NEEDS_FOLLOWUP: { label: "Needs follow-up", tone: "warning" },
  INACTIVE: { label: "Inactive", tone: "neutral" },
  DO_NOT_USE: { label: "Do not use", tone: "error" },
};

export const contactStatusOrder: ContactStatus[] = [
  "ACTIVE",
  "PROSPECT",
  "PREFERRED",
  "BACKUP",
  "NEEDS_FOLLOWUP",
  "INACTIVE",
  "DO_NOT_USE",
];

export const complianceStatusLabels: Record<
  ComplianceStatus,
  { label: string; tone: StatusTone }
> = {
  UNKNOWN: { label: "Unknown", tone: "neutral" },
  MISSING: { label: "Missing", tone: "warning" },
  REQUESTED: { label: "Requested", tone: "info" },
  CURRENT: { label: "Current", tone: "success" },
  EXPIRED: { label: "Expired", tone: "error" },
  NOT_REQUIRED: { label: "Not required", tone: "neutral" },
};

export const complianceStatusOrder: ComplianceStatus[] = [
  "UNKNOWN",
  "MISSING",
  "REQUESTED",
  "CURRENT",
  "EXPIRED",
  "NOT_REQUIRED",
];

export function buildDisplayName(parts: {
  firstName?: string | null;
  lastName?: string | null;
  company?: string | null;
}): string {
  const name = [parts.firstName, parts.lastName].filter(Boolean).join(" ").trim();
  return name || (parts.company ?? "").trim();
}

export function formatPhoneLink(phone: string | null | undefined): string {
  return (phone ?? "").replace(/[^0-9+]/g, "");
}
