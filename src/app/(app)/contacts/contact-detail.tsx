import Link from "next/link";
import type { Contact } from "@prisma/client";
import { GmailDraftButton } from "@/components/gmail-draft-button";
import {
  emailHref,
  formatAddress,
  formatContactDate,
  formatContactName,
  formatEmail,
  formatPhone,
  formatWebsite,
  phoneHref,
  websiteHref,
} from "@/lib/contact-format";
import {
  isGmailDraftsEnabled,
  isGoogleConnected,
} from "@/lib/google-gmail";
import {
  complianceStatusLabels,
  contactCategoryLabels,
  contactStatusLabels,
} from "@/lib/contacts";
import {
  entityTypeLabels,
  functionalDomainLabels,
  isEntityType,
  isFunctionalDomain,
  isRelationshipType,
  relationshipTypeLabels,
} from "@/lib/contact-taxonomy";
import { statusTokens } from "@/lib/status";
import { archiveContact, toggleFavorite } from "./actions";
import { ContactAvatar } from "./contact-avatar";

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

const dash = <span className="text-[var(--color-text-faint)]">—</span>;

/** Apple Contacts-style row.
 *  Labels stack above values until the detail column has real horizontal
 *  room (≥1024px viewport ≈ ≥620px detail pane in two-pane mode), then
 *  switch to labels-left, values-right for fast scanning. */
function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-1 gap-1 border-b border-[var(--color-border)] py-3 last:border-b-0 lg:grid-cols-[140px_minmax(0,1fr)] lg:items-baseline lg:gap-3">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
        {label}
      </span>
      <span className="break-words text-sm text-[var(--color-text)]">
        {children}
      </span>
    </div>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-faint)]">
      {children}
    </h3>
  );
}

function QuickAction({
  href,
  label,
  variant = "neutral",
  external,
}: {
  href: string;
  label: string;
  variant?: "neutral" | "primary";
  external?: boolean;
}) {
  const base =
    "inline-flex min-h-[40px] flex-1 items-center justify-center rounded-[var(--radius-md)] border px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)]";
  const styles =
    variant === "primary"
      ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-[var(--color-text-inverse)] hover:bg-[var(--color-primary-hover)]"
      : "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] hover:border-[var(--color-border-strong)]";
  return (
    <a
      href={href}
      className={`${base} ${styles}`}
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
    >
      {label}
    </a>
  );
}

export async function ContactDetail({ contact }: { contact: Contact }) {
  const gmailEnabled = isGmailDraftsEnabled();
  const gmailConnected = gmailEnabled ? await isGoogleConnected() : false;
  const status = contactStatusLabels[contact.status];
  const insurance = complianceStatusLabels[contact.insuranceStatus];
  const license = complianceStatusLabels[contact.licenseStatus];
  const w9 = complianceStatusLabels[contact.w9Status];

  const fullName = formatContactName(contact) || contact.displayName;
  const phoneLabel = formatPhone(contact.phone);
  const phoneLink = phoneHref(contact.phone);
  const emailLabel = formatEmail(contact.email);
  const emailLink = emailHref(contact.email);
  const websiteLabel = formatWebsite(contact.website);
  const websiteLink = websiteHref(contact.website);
  const addressBlock = formatAddress(contact.address);

  return (
    <article className="flex flex-col gap-5">
      <header className="flex flex-row items-start gap-4">
        <ContactAvatar contact={contact} size="lg" />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-display text-xl font-semibold leading-tight text-[var(--color-text)] sm:text-2xl">
              {fullName}
            </h2>
            {contact.isFavorite ? (
              <span
                aria-label="Favorite"
                title="Favorite"
                className="text-base text-[var(--color-accent)]"
              >
                ★
              </span>
            ) : null}
          </div>
          {contact.company || contact.role ? (
            <p className="break-words text-sm text-[var(--color-text-muted)]">
              {[contact.company, contact.role].filter(Boolean).join(" · ")}
            </p>
          ) : null}
          <div className="mt-1 flex flex-wrap gap-1.5">
            <ToneTag
              label={contactCategoryLabels[contact.category]}
              tone="info"
            />
            <ToneTag label={status.label} tone={status.tone} />
          </div>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {phoneLink ? (
          <QuickAction href={phoneLink} label="Call" />
        ) : (
          <DisabledQuickAction label="Call" />
        )}
        {emailLink ? (
          <QuickAction href={emailLink} label="Email" />
        ) : (
          <DisabledQuickAction label="Email" />
        )}
        {websiteLink ? (
          <QuickAction href={websiteLink} label="Website" external />
        ) : (
          <DisabledQuickAction label="Website" />
        )}
        <Link
          href={`/contacts/${contact.id}/edit`}
          className="inline-flex min-h-[40px] flex-1 items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-primary)] bg-[var(--color-primary)] px-3 py-2 text-sm font-semibold text-[var(--color-text-inverse)] transition-colors hover:bg-[var(--color-primary-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)]"
        >
          Edit
        </Link>
      </div>

      {emailLabel ? (
        (() => {
          const name = formatContactName(contact) || contact.displayName;
          const orgLine = [contact.company, contact.role]
            .filter(Boolean)
            .join(", ");
          const hasContext = Boolean(
            contact.company ||
              contact.role ||
              contact.relatedProperty ||
              contact.relatedProject
          );
          const subject = hasContext
            ? `Note for ${name}${contact.company ? ` · ${contact.company}` : ""}`
            : `Note for ${name}`;
          const body = [
            `Hi ${name},`,
            "",
            orgLine ? `Quick note from Walsh Co. re: ${orgLine}.` : "Quick note from Walsh Co.",
            contact.relatedProperty
              ? `Property context: ${contact.relatedProperty}.`
              : "",
            contact.relatedProject
              ? `Project context: ${contact.relatedProject}.`
              : "",
            "",
            "Wanted to check in on the items below — let me know what makes sense on your end:",
            "  • ",
            "",
            "Thanks,",
          ]
            .filter((line, idx, all) => {
              // Collapse adjacent blank lines so the body stays tight when
              // optional context lines are absent.
              if (line !== "") return true;
              const prev = all[idx - 1];
              return prev !== "";
            })
            .join("\n");
          return (
            <div className="flex flex-col gap-1 text-xs text-[var(--workspace-text-secondary)]">
              <div className="flex flex-wrap items-center gap-2">
                <GmailDraftButton
                  enabled={gmailEnabled}
                  connected={gmailConnected}
                  to={contact.email ?? null}
                  subject={subject}
                  body={body}
                  context={{ kind: "contact", label: name }}
                  returnTo={`/contacts?id=${contact.id}`}
                  label="Draft general email"
                />
              </div>
              {!hasContext ? (
                <p className="text-[11px] text-[var(--color-text-muted)]">
                  Add a related property, task, or bid for a better draft.
                </p>
              ) : null}
            </div>
          );
        })()
      ) : null}

      <section className="flex flex-col">
        <SectionHeading>Contact</SectionHeading>
        <div className="flex flex-col">
          <Row label="Phone">
            {phoneLink ? (
              <a
                href={phoneLink}
                className="font-mono tabular-nums text-[var(--color-link)] hover:underline"
              >
                {phoneLabel}
              </a>
            ) : (
              dash
            )}
          </Row>
          <Row label="Email">
            {emailLink ? (
              <a
                href={emailLink}
                className="break-all text-[var(--color-link)] hover:underline"
              >
                {emailLabel}
              </a>
            ) : emailLabel ? (
              <span
                className="break-all"
                title="Email looks invalid; click-through disabled."
              >
                {emailLabel}
              </span>
            ) : (
              dash
            )}
          </Row>
          <Row label="Website">
            {websiteLink ? (
              <a
                href={websiteLink}
                target="_blank"
                rel="noopener noreferrer"
                className="break-all text-[var(--color-link)] hover:underline"
              >
                {websiteLabel || websiteLink}
              </a>
            ) : (
              dash
            )}
          </Row>
          <Row label="Address">
            {addressBlock ? (
              <span className="block whitespace-pre-wrap leading-snug">
                {addressBlock}
              </span>
            ) : (
              dash
            )}
          </Row>
        </div>
      </section>

      {(contact.entityType ||
        contact.relationshipType ||
        contact.functionalDomain ||
        contact.specialty ||
        contact.contextRole) ? (
        <section className="flex flex-col">
          <SectionHeading>Classification</SectionHeading>
          <div className="flex flex-col">
            <Row label="Entity type">
              {isEntityType(contact.entityType)
                ? entityTypeLabels[contact.entityType]
                : dash}
            </Row>
            <Row label="Relationship">
              {isRelationshipType(contact.relationshipType)
                ? relationshipTypeLabels[contact.relationshipType]
                : dash}
            </Row>
            <Row label="Functional domain">
              {isFunctionalDomain(contact.functionalDomain)
                ? functionalDomainLabels[contact.functionalDomain]
                : dash}
            </Row>
            <Row label="Specialty">{contact.specialty ?? dash}</Row>
            <Row label="Contextual role">{contact.contextRole ?? dash}</Row>
          </div>
        </section>
      ) : null}

      <section className="flex flex-col gap-2">
        <SectionHeading>Compliance</SectionHeading>
        <div className="flex flex-wrap gap-1.5">
          <ToneTag label={`Insurance: ${insurance.label}`} tone={insurance.tone} />
          <ToneTag label={`License: ${license.label}`} tone={license.tone} />
          <ToneTag label={`W-9: ${w9.label}`} tone={w9.tone} />
        </div>
      </section>

      <section className="flex flex-col">
        <SectionHeading>Relationships & dates</SectionHeading>
        <div className="flex flex-col">
          <Row label="Related property">
            {contact.relatedProperty ?? dash}
          </Row>
          <Row label="Related project">
            {contact.relatedProject ?? dash}
          </Row>
          <Row label="Last contacted">
            {formatContactDate(contact.lastContactedAt)}
          </Row>
          <Row label="Follow up">
            {formatContactDate(contact.followUpAt)}
          </Row>
        </div>
      </section>

      {contact.notes ? (
        <section className="flex flex-col gap-2">
          <SectionHeading>Notes</SectionHeading>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-[var(--color-text)]">
            {contact.notes}
          </p>
        </section>
      ) : null}

      <footer className="flex flex-wrap items-center gap-2 border-t border-[var(--color-border)] pt-5">
        <form
          action={async () => {
            "use server";
            await toggleFavorite(contact.id);
          }}
        >
          <button
            type="submit"
            className="inline-flex min-h-[40px] items-center justify-center gap-1 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm font-medium text-[var(--color-text)] hover:border-[var(--color-border-strong)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)]"
          >
            {contact.isFavorite ? "★ Unfavorite" : "☆ Favorite"}
          </button>
        </form>
        <form
          action={async () => {
            "use server";
            await archiveContact(contact.id);
          }}
          className="ml-auto"
        >
          <button
            type="submit"
            title="Hide from the active list. Record is preserved."
            className="inline-flex min-h-[40px] items-center justify-center gap-1 rounded-[var(--radius-md)] border px-3 py-2 text-sm font-medium hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)]"
            style={{
              borderColor: "var(--semantic-warning-border)",
              background: "var(--semantic-warning-bg)",
              color: "var(--semantic-warning)",
            }}
          >
            Archive contact
          </button>
        </form>
      </footer>
    </article>
  );
}

function DisabledQuickAction({ label }: { label: string }) {
  return (
    <span
      aria-disabled
      className="inline-flex min-h-[40px] flex-1 cursor-not-allowed items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-soft)] px-3 py-2 text-sm font-medium text-[var(--color-text-faint)]"
    >
      {label}
    </span>
  );
}
