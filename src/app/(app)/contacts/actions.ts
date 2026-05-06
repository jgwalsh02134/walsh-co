"use server";

import {
  ComplianceStatus,
  ContactCategory,
  ContactStatus,
} from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
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

function category(value: FormDataEntryValue | null): ContactCategory {
  const v = s(value);
  if (v && ALLOWED_CATEGORIES.has(v as ContactCategory)) {
    return v as ContactCategory;
  }
  throw new Error("Category is required.");
}

function status(value: FormDataEntryValue | null): ContactStatus {
  const v = s(value);
  if (v && ALLOWED_STATUSES.has(v as ContactStatus)) {
    return v as ContactStatus;
  }
  return ContactStatus.ACTIVE;
}

function compliance(value: FormDataEntryValue | null): ComplianceStatus {
  const v = s(value);
  if (v && ALLOWED_COMPLIANCE.has(v as ComplianceStatus)) {
    return v as ComplianceStatus;
  }
  return ComplianceStatus.UNKNOWN;
}

function buildPayload(form: FormData) {
  const displayName = s(form.get("displayName"));
  if (!displayName) throw new Error("Display name is required.");

  return {
    firstName: s(form.get("firstName")),
    lastName: s(form.get("lastName")),
    displayName,
    company: s(form.get("company")),
    role: s(form.get("role")),
    category: category(form.get("category")),
    phone: s(form.get("phone")),
    email: s(form.get("email")),
    website: s(form.get("website")),
    address: s(form.get("address")),
    notes: s(form.get("notes")),
    isFavorite: form.get("isFavorite") === "on",
    status: status(form.get("status")),
    relatedProperty: s(form.get("relatedProperty")),
    relatedProject: s(form.get("relatedProject")),
    insuranceStatus: compliance(form.get("insuranceStatus")),
    licenseStatus: compliance(form.get("licenseStatus")),
    w9Status: compliance(form.get("w9Status")),
    lastContactedAt: dateOrNull(form.get("lastContactedAt")),
    followUpAt: dateOrNull(form.get("followUpAt")),
  };
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
 * Archive a contact (soft delete) by setting `archivedAt`. Records are
 * preserved so historical references (notes, related projects) remain
 * resolvable. Hard delete is intentionally not exposed in this pass.
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
