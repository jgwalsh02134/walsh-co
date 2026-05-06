import Link from "next/link";
import type { Contact } from "@prisma/client";
import {
  complianceStatusLabels,
  contactCategoryLabels,
  contactStatusLabels,
  formatPhoneLink,
} from "@/lib/contacts";
import { statusTokens } from "@/lib/status";
import { deleteContact, toggleFavorite } from "./actions";

function ToneTag({
  label,
  tone,
}: {
  label: string;
  tone: keyof typeof statusTokens;
}) {
  const t = statusTokens[tone];
  return (
    <span
      className="inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium"
      style={{ background: t.background, color: t.text, borderColor: t.border }}
    >
      {label}
    </span>
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
    <div className="flex flex-col gap-0.5">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text-faint)]">
        {label}
      </span>
      <span className="text-sm text-[var(--color-text)]">{children}</span>
    </div>
  );
}

function formatDate(d: Date | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function ContactDetail({ contact }: { contact: Contact }) {
  const status = contactStatusLabels[contact.status];
  const insurance = complianceStatusLabels[contact.insuranceStatus];
  const license = complianceStatusLabels[contact.licenseStatus];
  const w9 = complianceStatusLabels[contact.w9Status];
  const phoneLink = formatPhoneLink(contact.phone);

  return (
    <article className="flex flex-col gap-5">
      <header className="flex flex-col gap-2 border-b border-[var(--color-border)] pb-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-semibold text-[var(--color-text)]">
                {contact.displayName}
              </h2>
              {contact.isFavorite ? (
                <span
                  aria-label="Favorite"
                  title="Favorite"
                  className="text-[var(--color-accent)]"
                >
                  ★
                </span>
              ) : null}
            </div>
            {contact.company ? (
              <span className="text-sm text-[var(--color-text-muted)]">
                {contact.company}
                {contact.role ? ` · ${contact.role}` : null}
              </span>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-1.5">
            <ToneTag
              label={contactCategoryLabels[contact.category]}
              tone="info"
            />
            <ToneTag label={status.label} tone={status.tone} />
          </div>
        </div>
      </header>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Phone">
          {contact.phone ? (
            <a
              href={`tel:${phoneLink}`}
              className="text-[var(--color-link)] hover:underline"
            >
              {contact.phone}
            </a>
          ) : (
            "—"
          )}
        </Field>
        <Field label="Email">
          {contact.email ? (
            <a
              href={`mailto:${contact.email}`}
              className="text-[var(--color-link)] hover:underline"
            >
              {contact.email}
            </a>
          ) : (
            "—"
          )}
        </Field>
        <Field label="Website">
          {contact.website ? (
            <a
              href={contact.website}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--color-link)] hover:underline"
            >
              {contact.website}
            </a>
          ) : (
            "—"
          )}
        </Field>
        <Field label="Address">{contact.address ?? "—"}</Field>
      </section>

      <section className="flex flex-col gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text-faint)]">
          Compliance
        </span>
        <div className="flex flex-wrap gap-1.5">
          <ToneTag label={`Insurance: ${insurance.label}`} tone={insurance.tone} />
          <ToneTag label={`License: ${license.label}`} tone={license.tone} />
          <ToneTag label={`W-9: ${w9.label}`} tone={w9.tone} />
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Related property">{contact.relatedProperty ?? "—"}</Field>
        <Field label="Related project">{contact.relatedProject ?? "—"}</Field>
        <Field label="Last contacted">
          {formatDate(contact.lastContactedAt)}
        </Field>
        <Field label="Follow up">{formatDate(contact.followUpAt)}</Field>
      </section>

      {contact.notes ? (
        <section className="flex flex-col gap-1">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text-faint)]">
            Notes
          </span>
          <p className="whitespace-pre-wrap text-sm text-[var(--color-text)]">
            {contact.notes}
          </p>
        </section>
      ) : null}

      <footer className="flex flex-wrap items-center gap-2 border-t border-[var(--color-border)] pt-4">
        {contact.phone ? (
          <a
            href={`tel:${phoneLink}`}
            className="inline-flex items-center justify-center gap-1 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-sm font-medium text-[var(--color-text)] hover:border-[var(--color-border-strong)]"
          >
            Call
          </a>
        ) : null}
        {contact.email ? (
          <a
            href={`mailto:${contact.email}`}
            className="inline-flex items-center justify-center gap-1 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-sm font-medium text-[var(--color-text)] hover:border-[var(--color-border-strong)]"
          >
            Email
          </a>
        ) : null}
        <Link
          href={`/contacts/${contact.id}/edit`}
          className="inline-flex items-center justify-center gap-1 rounded-[var(--radius-sm)] border border-[var(--color-primary)] bg-[var(--color-primary)] px-3 py-1.5 text-sm font-medium text-[var(--color-text-inverse)] hover:bg-[var(--color-primary-hover)]"
        >
          Edit
        </Link>
        <form
          action={async () => {
            "use server";
            await toggleFavorite(contact.id);
          }}
        >
          <button
            type="submit"
            className="inline-flex items-center justify-center gap-1 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-sm font-medium text-[var(--color-text)] hover:border-[var(--color-border-strong)]"
          >
            {contact.isFavorite ? "★ Unfavorite" : "☆ Favorite"}
          </button>
        </form>
        <form
          action={async () => {
            "use server";
            await deleteContact(contact.id);
          }}
          className="ml-auto"
        >
          <button
            type="submit"
            className="inline-flex items-center justify-center gap-1 rounded-[var(--radius-sm)] border px-3 py-1.5 text-sm font-medium hover:opacity-90"
            style={{
              borderColor: "var(--semantic-error-border)",
              background: "var(--semantic-error-bg)",
              color: "var(--semantic-error)",
            }}
          >
            Delete
          </button>
        </form>
      </footer>
    </article>
  );
}
