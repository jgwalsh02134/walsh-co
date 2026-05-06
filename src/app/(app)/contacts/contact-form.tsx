"use client";

import { useTransition } from "react";
import type { Contact } from "@prisma/client";
import {
  complianceStatusLabels,
  complianceStatusOrder,
  contactCategoryLabels,
  contactCategoryOrder,
  contactStatusLabels,
  contactStatusOrder,
} from "@/lib/contacts";

type Action = (formData: FormData) => Promise<void>;

const labelClass =
  "text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text-faint)]";
const inputClass =
  "rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-faint)] focus:border-[var(--color-focus)] focus:outline-none";
const selectClass = inputClass;
const textareaClass = `${inputClass} min-h-[100px]`;

function dateInputValue(d: Date | null | undefined): string {
  if (!d) return "";
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return "";
  const year = dt.getFullYear();
  const month = String(dt.getMonth() + 1).padStart(2, "0");
  const day = String(dt.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function ContactForm({
  action,
  initial,
  submitLabel,
  cancelHref,
}: {
  action: Action;
  initial?: Contact | null;
  submitLabel: string;
  cancelHref: string;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <form
      action={(formData) => startTransition(() => action(formData))}
      className="flex flex-col gap-5"
    >
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Display name *">
          <input
            name="displayName"
            required
            defaultValue={initial?.displayName ?? ""}
            placeholder="e.g. John Smith or Sample Plumbing"
            className={inputClass}
          />
        </Field>
        <Field label="Category *">
          <select
            name="category"
            required
            defaultValue={initial?.category ?? "OTHER"}
            className={selectClass}
          >
            {contactCategoryOrder.map((c) => (
              <option key={c} value={c}>
                {contactCategoryLabels[c]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="First name">
          <input
            name="firstName"
            defaultValue={initial?.firstName ?? ""}
            className={inputClass}
          />
        </Field>
        <Field label="Last name">
          <input
            name="lastName"
            defaultValue={initial?.lastName ?? ""}
            className={inputClass}
          />
        </Field>
        <Field label="Company">
          <input
            name="company"
            defaultValue={initial?.company ?? ""}
            className={inputClass}
          />
        </Field>
        <Field label="Role">
          <input
            name="role"
            defaultValue={initial?.role ?? ""}
            className={inputClass}
          />
        </Field>
      </section>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Phone">
          <input
            name="phone"
            type="tel"
            defaultValue={initial?.phone ?? ""}
            className={inputClass}
          />
        </Field>
        <Field label="Email">
          <input
            name="email"
            type="email"
            defaultValue={initial?.email ?? ""}
            className={inputClass}
          />
        </Field>
        <Field label="Website">
          <input
            name="website"
            type="url"
            defaultValue={initial?.website ?? ""}
            placeholder="https://"
            className={inputClass}
          />
        </Field>
        <Field label="Address">
          <input
            name="address"
            defaultValue={initial?.address ?? ""}
            className={inputClass}
          />
        </Field>
      </section>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Status">
          <select
            name="status"
            defaultValue={initial?.status ?? "ACTIVE"}
            className={selectClass}
          >
            {contactStatusOrder.map((s) => (
              <option key={s} value={s}>
                {contactStatusLabels[s].label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Favorite">
          <label className="inline-flex items-center gap-2 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm">
            <input
              type="checkbox"
              name="isFavorite"
              defaultChecked={initial?.isFavorite ?? false}
            />
            <span className="text-[var(--color-text)]">
              Pin to favorites
            </span>
          </label>
        </Field>
      </section>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Field label="Insurance">
          <select
            name="insuranceStatus"
            defaultValue={initial?.insuranceStatus ?? "UNKNOWN"}
            className={selectClass}
          >
            {complianceStatusOrder.map((s) => (
              <option key={s} value={s}>
                {complianceStatusLabels[s].label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="License">
          <select
            name="licenseStatus"
            defaultValue={initial?.licenseStatus ?? "UNKNOWN"}
            className={selectClass}
          >
            {complianceStatusOrder.map((s) => (
              <option key={s} value={s}>
                {complianceStatusLabels[s].label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="W-9">
          <select
            name="w9Status"
            defaultValue={initial?.w9Status ?? "UNKNOWN"}
            className={selectClass}
          >
            {complianceStatusOrder.map((s) => (
              <option key={s} value={s}>
                {complianceStatusLabels[s].label}
              </option>
            ))}
          </select>
        </Field>
      </section>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Related property">
          <input
            name="relatedProperty"
            defaultValue={initial?.relatedProperty ?? ""}
            placeholder="e.g. 322 Osborne Rd"
            className={inputClass}
          />
        </Field>
        <Field label="Related project">
          <input
            name="relatedProject"
            defaultValue={initial?.relatedProject ?? ""}
            placeholder="e.g. 322 Osborne Renovation"
            className={inputClass}
          />
        </Field>
        <Field label="Last contacted">
          <input
            type="date"
            name="lastContactedAt"
            defaultValue={dateInputValue(initial?.lastContactedAt)}
            className={inputClass}
          />
        </Field>
        <Field label="Follow up">
          <input
            type="date"
            name="followUpAt"
            defaultValue={dateInputValue(initial?.followUpAt)}
            className={inputClass}
          />
        </Field>
      </section>

      <Field label="Notes">
        <textarea
          name="notes"
          defaultValue={initial?.notes ?? ""}
          className={textareaClass}
          placeholder="Working notes, qualifications, things to remember…"
        />
      </Field>

      <footer className="flex items-center gap-2">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-primary)] bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-[var(--color-text-inverse)] hover:bg-[var(--color-primary-hover)] disabled:opacity-60"
        >
          {pending ? "Saving…" : submitLabel}
        </button>
        <a
          href={cancelHref}
          className="inline-flex items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2 text-sm font-medium text-[var(--color-text)] hover:border-[var(--color-border-strong)]"
        >
          Cancel
        </a>
      </footer>
    </form>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className={labelClass}>{label}</span>
      {children}
    </label>
  );
}
