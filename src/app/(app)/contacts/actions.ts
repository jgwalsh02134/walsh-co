"use server";

import {
  ComplianceStatus,
  ContactCategory,
  ContactStatus,
  Prisma,
} from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  deriveDisplayName,
  formatEmail,
  isAvatarColor,
  isAvatarIconKey,
  isAvatarMode,
  normalizeEmailInput,
  normalizePhoneInput,
  normalizeWebsiteInput,
} from "@/lib/contact-format";
import {
  isEntityType,
  isFunctionalDomain,
  isRelationshipType,
} from "@/lib/contact-taxonomy";
import { prisma } from "@/lib/prisma";

const ALLOWED_CATEGORIES = new Set(Object.values(ContactCategory));
const ALLOWED_STATUSES = new Set(Object.values(ContactStatus));
const ALLOWED_COMPLIANCE = new Set(Object.values(ComplianceStatus));

function s(value: FormDataEntryValue | null): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

function dateOrNull(value: FormDataEntryValue | null): Date | null {
  const v = s(value);
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

function categoryWithFallback(
  value: FormDataEntryValue | string | null,
  fallback: ContactCategory = ContactCategory.OTHER
): ContactCategory {
  const v = typeof value === "string" ? value.trim() : null;
  if (v && ALLOWED_CATEGORIES.has(v as ContactCategory)) {
    return v as ContactCategory;
  }
  return fallback;
}

function statusOrDefault(value: FormDataEntryValue | string | null): ContactStatus {
  const v = typeof value === "string" ? value.trim() : null;
  if (v && ALLOWED_STATUSES.has(v as ContactStatus)) {
    return v as ContactStatus;
  }
  return ContactStatus.ACTIVE;
}

function complianceOrUnknown(
  value: FormDataEntryValue | string | null
): ComplianceStatus {
  const v = typeof value === "string" ? value.trim() : null;
  if (v && ALLOWED_COMPLIANCE.has(v as ComplianceStatus)) {
    return v as ComplianceStatus;
  }
  return ComplianceStatus.UNKNOWN;
}

function avatarMode(value: FormDataEntryValue | string | null): string | null {
  const v = typeof value === "string" ? value.trim() : null;
  return isAvatarMode(v) ? v : null;
}

function avatarColor(value: FormDataEntryValue | string | null): string | null {
  const v = typeof value === "string" ? value.trim() : null;
  return isAvatarColor(v) ? v : null;
}

function avatarIcon(value: FormDataEntryValue | string | null): string | null {
  const v = typeof value === "string" ? value.trim() : null;
  return isAvatarIconKey(v) ? v : null;
}

function entityType(value: FormDataEntryValue | string | null): string | null {
  const v = typeof value === "string" ? value.trim() : null;
  return isEntityType(v) ? v : null;
}

function relationshipType(
  value: FormDataEntryValue | string | null
): string | null {
  const v = typeof value === "string" ? value.trim() : null;
  return isRelationshipType(v) ? v : null;
}

function functionalDomain(
  value: FormDataEntryValue | string | null
): string | null {
  const v = typeof value === "string" ? value.trim() : null;
  return isFunctionalDomain(v) ? v : null;
}

/**
 * Build a Contact data payload from form input. Normalizes every text
 * field, derives displayName when blank, and falls back to OTHER for an
 * unknown category. Throws when the contact has no usable name source.
 */
function buildPayload(form: FormData) {
  const firstName = s(form.get("firstName"));
  const lastName = s(form.get("lastName"));
  const company = s(form.get("company"));

  const displayName = deriveDisplayName({
    firstName,
    lastName,
    company,
    displayName: s(form.get("displayName")),
  });
  if (!displayName) {
    throw new Error(
      "A first/last name, company, or display name is required."
    );
  }

  return {
    firstName,
    lastName,
    displayName,
    company,
    role: s(form.get("role")),
    category: categoryWithFallback(form.get("category")),
    phone: normalizePhoneInput(s(form.get("phone"))),
    email: normalizeEmailInput(s(form.get("email"))),
    website: normalizeWebsiteInput(s(form.get("website"))),
    address: s(form.get("address")),
    notes: s(form.get("notes")),
    isFavorite: form.get("isFavorite") === "on",
    status: statusOrDefault(form.get("status")),
    relatedProperty: s(form.get("relatedProperty")),
    relatedProject: s(form.get("relatedProject")),
    insuranceStatus: complianceOrUnknown(form.get("insuranceStatus")),
    licenseStatus: complianceOrUnknown(form.get("licenseStatus")),
    w9Status: complianceOrUnknown(form.get("w9Status")),
    avatarMode: avatarMode(form.get("avatarMode")),
    avatarColor: avatarColor(form.get("avatarColor")),
    avatarIcon: avatarIcon(form.get("avatarIcon")),
    entityType: entityType(form.get("entityType")),
    relationshipType: relationshipType(form.get("relationshipType")),
    functionalDomain: functionalDomain(form.get("functionalDomain")),
    specialty: s(form.get("specialty")),
    contextRole: s(form.get("contextRole")),
    lastContactedAt: dateOrNull(form.get("lastContactedAt")),
    followUpAt: dateOrNull(form.get("followUpAt")),
  } satisfies Prisma.ContactUncheckedCreateInput;
}

export async function createContact(form: FormData) {
  const data = buildPayload(form);
  const created = await prisma.contact.create({ data });
  revalidatePath("/contacts");
  redirect(`/contacts?id=${created.id}`);
}

export async function updateContact(id: string, form: FormData) {
  const data = buildPayload(form);
  await prisma.contact.update({ where: { id }, data });
  revalidatePath("/contacts");
  revalidatePath(`/contacts/${id}/edit`);
  redirect(`/contacts?id=${id}`);
}

/**
 * Soft-delete a contact by setting `archivedAt`. The record is preserved
 * for historical references; hard delete is intentionally not exposed.
 */
export async function archiveContact(id: string) {
  await prisma.contact.update({
    where: { id },
    data: { archivedAt: new Date() },
  });
  revalidatePath("/contacts");
  redirect("/contacts");
}

export async function toggleFavorite(id: string) {
  const existing = await prisma.contact.findUnique({
    where: { id },
    select: { isFavorite: true },
  });
  if (!existing) return;
  await prisma.contact.update({
    where: { id },
    data: { isFavorite: !existing.isFavorite },
  });
  revalidatePath("/contacts");
}

// ---------------- Bulk CSV import ----------------

export type ImportResult = {
  ok: boolean;
  created: number;
  skipped: number;
  errors: { row: number; message: string }[];
  totalRows: number;
};

const HEADER_ALIASES: Record<string, keyof Prisma.ContactUncheckedCreateInput> = {
  firstname: "firstName",
  "first name": "firstName",
  lastname: "lastName",
  "last name": "lastName",
  displayname: "displayName",
  "display name": "displayName",
  name: "displayName",
  "full name": "displayName",
  organization: "company",
  company: "company",
  "job title": "role",
  title: "role",
  role: "role",
  category: "category",
  phone: "phone",
  "phone number": "phone",
  "phone 1 - value": "phone",
  email: "email",
  "e-mail": "email",
  "e-mail 1 - value": "email",
  website: "website",
  "website 1 - value": "website",
  url: "website",
  address: "address",
  "address 1 - formatted": "address",
  notes: "notes",
  status: "status",
  "related property": "relatedProperty",
  "related project": "relatedProject",
  "insurance status": "insuranceStatus",
  "license status": "licenseStatus",
  "w-9 status": "w9Status",
  "w9 status": "w9Status",
  favorite: "isFavorite",
  "is favorite": "isFavorite",
  starred: "isFavorite",
};

/** Tiny RFC-4180-ish CSV parser. Handles quoted fields, escaped quotes, CRLF. */
function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let current: string[] = [];
  let field = "";
  let inQuotes = false;
  let i = 0;

  const flushField = () => {
    current.push(field);
    field = "";
  };
  const flushRow = () => {
    flushField();
    rows.push(current);
    current = [];
  };

  while (i < text.length) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      field += ch;
      i++;
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
      i++;
      continue;
    }
    if (ch === ",") {
      flushField();
      i++;
      continue;
    }
    if (ch === "\n") {
      flushRow();
      i++;
      continue;
    }
    if (ch === "\r") {
      if (text[i + 1] === "\n") i++;
      flushRow();
      i++;
      continue;
    }
    field += ch;
    i++;
  }
  if (field.length > 0 || current.length > 0) flushRow();

  return rows.filter((r) => r.some((f) => f.trim().length > 0));
}

function normalizeHeader(
  raw: string
): keyof Prisma.ContactUncheckedCreateInput | null {
  const key = raw.trim().toLowerCase();
  return HEADER_ALIASES[key] ?? null;
}

function buildRowPayload(
  rec: Record<string, string>
): Prisma.ContactUncheckedCreateInput | { error: string } {
  const firstName = rec.firstName?.trim() || null;
  const lastName = rec.lastName?.trim() || null;
  const company = rec.company?.trim() || null;
  const explicit = rec.displayName?.trim() || null;
  const displayName = deriveDisplayName({
    firstName,
    lastName,
    company,
    displayName: explicit,
  });
  if (!displayName) {
    return {
      error:
        "A first/last name, company, or display name is required.",
    };
  }

  const favoriteRaw = (rec.isFavorite ?? "").trim().toLowerCase();
  const isFavorite =
    favoriteRaw === "true" ||
    favoriteRaw === "yes" ||
    favoriteRaw === "1" ||
    favoriteRaw === "y" ||
    favoriteRaw === "★";

  return {
    firstName,
    lastName,
    displayName,
    company,
    role: rec.role?.trim() || null,
    category: categoryWithFallback(rec.category ?? null),
    phone: normalizePhoneInput(rec.phone),
    email: normalizeEmailInput(rec.email),
    website: normalizeWebsiteInput(rec.website),
    address: rec.address?.trim() || null,
    notes: rec.notes?.trim() || null,
    isFavorite,
    status: statusOrDefault(rec.status ?? null),
    relatedProperty: rec.relatedProperty?.trim() || null,
    relatedProject: rec.relatedProject?.trim() || null,
    insuranceStatus: complianceOrUnknown(rec.insuranceStatus ?? null),
    licenseStatus: complianceOrUnknown(rec.licenseStatus ?? null),
    w9Status: complianceOrUnknown(rec.w9Status ?? null),
    avatarMode: avatarMode(rec.avatarMode ?? null),
    avatarColor: avatarColor(rec.avatarColor ?? null),
    avatarIcon: avatarIcon(rec.avatarIcon ?? null),
    entityType: entityType(rec.entityType ?? null),
    relationshipType: relationshipType(rec.relationshipType ?? null),
    functionalDomain: functionalDomain(rec.functionalDomain ?? null),
    specialty: rec.specialty?.trim() || null,
    contextRole: rec.contextRole?.trim() || null,
  };
}

export async function importContactsFromCsv(
  _prev: ImportResult | null,
  formData: FormData
): Promise<ImportResult> {
  const file = formData.get("csvFile");
  let csv = "";
  if (file instanceof File && file.size > 0) {
    csv = await file.text();
  } else {
    const pasted = formData.get("csvText");
    if (typeof pasted === "string") csv = pasted;
  }

  csv = csv.trim();
  if (!csv) {
    return {
      ok: false,
      created: 0,
      skipped: 0,
      totalRows: 0,
      errors: [{ row: 0, message: "Paste CSV content or attach a CSV file." }],
    };
  }

  const rows = parseCSV(csv);
  if (rows.length < 2) {
    return {
      ok: false,
      created: 0,
      skipped: 0,
      totalRows: 0,
      errors: [
        {
          row: 0,
          message:
            "CSV must include a header row plus at least one data row.",
        },
      ],
    };
  }

  const [headerRow, ...dataRows] = rows;
  const headerMap = headerRow.map(normalizeHeader);
  if (!headerMap.some(Boolean)) {
    return {
      ok: false,
      created: 0,
      skipped: 0,
      totalRows: dataRows.length,
      errors: [
        {
          row: 1,
          message:
            "No recognized columns. Expected headers like firstName, lastName, displayName, company, phone, email.",
        },
      ],
    };
  }

  // Pre-load existing emails for dedupe (only the active set; archived
  // contacts aren't considered live duplicates).
  const existing = await prisma.contact.findMany({
    where: { archivedAt: null },
    select: { email: true, displayName: true, company: true },
  });
  const seenEmails = new Set(
    existing.map((c) => formatEmail(c.email)).filter(Boolean)
  );
  const seenNameCompany = new Set(
    existing.map(
      (c) => `${c.displayName.toLowerCase()}|${(c.company ?? "").toLowerCase()}`
    )
  );

  const result: ImportResult = {
    ok: true,
    created: 0,
    skipped: 0,
    totalRows: dataRows.length,
    errors: [],
  };

  for (let i = 0; i < dataRows.length; i++) {
    const cells = dataRows[i];
    const rec: Record<string, string> = {};
    for (let c = 0; c < headerMap.length; c++) {
      const key = headerMap[c];
      if (!key) continue;
      rec[key] = cells[c] ?? "";
    }

    const payload = buildRowPayload(rec);
    if ("error" in payload) {
      result.errors.push({ row: i + 2, message: payload.error });
      continue;
    }

    const dedupeEmail = formatEmail(payload.email);
    const dedupeKey = `${payload.displayName.toLowerCase()}|${(
      payload.company ?? ""
    ).toLowerCase()}`;
    if (dedupeEmail && seenEmails.has(dedupeEmail)) {
      result.skipped++;
      continue;
    }
    if (!dedupeEmail && seenNameCompany.has(dedupeKey)) {
      result.skipped++;
      continue;
    }

    try {
      await prisma.contact.create({ data: payload });
      result.created++;
      if (dedupeEmail) seenEmails.add(dedupeEmail);
      seenNameCompany.add(dedupeKey);
    } catch (err) {
      result.errors.push({
        row: i + 2,
        message: err instanceof Error ? err.message : "Failed to insert.",
      });
    }
  }

  if (result.errors.length > 0 && result.created === 0) result.ok = false;
  if (result.created > 0) revalidatePath("/contacts");
  return result;
}
