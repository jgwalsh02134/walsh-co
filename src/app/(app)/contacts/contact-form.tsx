"use client";

import { useId, useState, useTransition } from "react";
import type { Contact, ContactCategory } from "@prisma/client";
import {
  AVATAR_ICON_KEYS,
  AVATAR_PALETTE,
  AVATAR_PALETTE_ORDER,
  type AvatarColor,
  type AvatarIconKey,
  type AvatarMode,
  getAvatarIconKey,
  isAvatarColor,
  isAvatarIconKey,
  isAvatarMode,
} from "@/lib/contact-format";
import {
  complianceStatusLabels,
  complianceStatusOrder,
  contactCategoryLabels,
  contactCategoryOrder,
  contactStatusLabels,
  contactStatusOrder,
} from "@/lib/contacts";
import {
  ENTITY_TYPES,
  FUNCTIONAL_DOMAINS,
  RELATIONSHIP_TYPES,
  entityTypeLabels,
  functionalDomainLabels,
  relationshipTypeLabels,
} from "@/lib/contact-taxonomy";
import { ContactAvatar, ICON_COMPONENTS } from "./contact-avatar";

type Action = (formData: FormData) => Promise<void>;

/* Shared field styles. Centralized here so contrast tweaks happen in one
 * place. All inputs sit on workspace-surface with strong text contrast and
 * a calm focus ring driven by the workspace tokens. */
const labelClass =
  "text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]";
const helperClass = "text-xs text-[var(--color-text-faint)]";
const inputBase =
  "w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-faint)] shadow-[var(--shadow-card)] transition-colors focus:border-[var(--color-focus)] focus:outline-none focus:ring-2 focus:ring-[var(--color-focus)]/30 disabled:opacity-60";
const selectClass = inputBase;
const textareaClass = `${inputBase} min-h-[120px] leading-relaxed`;

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
  const [error, setError] = useState<string | null>(null);
  const formId = useId();

  // Track the identity fields locally so the avatar preview updates as
  // the user types. Initial values seed from `initial` when editing.
  const [firstName, setFirstName] = useState(initial?.firstName ?? "");
  const [lastName, setLastName] = useState(initial?.lastName ?? "");
  const [displayName, setDisplayName] = useState(initial?.displayName ?? "");
  const [company, setCompany] = useState(initial?.company ?? "");
  const [role, setRole] = useState(initial?.role ?? "");
  const [category, setCategory] = useState<ContactCategory>(
    (initial?.category ?? "OTHER") as ContactCategory
  );

  // Avatar editor state. Empty string = "use the system default" — that's
  // serialized as null and the avatar falls back to category-derived
  // values at render time.
  const [avatarMode, setAvatarMode] = useState<AvatarMode>(
    isAvatarMode(initial?.avatarMode) ? initial.avatarMode : "INITIALS"
  );
  const [avatarColor, setAvatarColor] = useState<AvatarColor | "">(
    isAvatarColor(initial?.avatarColor) ? initial.avatarColor : ""
  );
  const [avatarIcon, setAvatarIcon] = useState<AvatarIconKey | "">(
    isAvatarIconKey(initial?.avatarIcon) ? initial.avatarIcon : ""
  );

  const previewContact = {
    firstName,
    lastName,
    displayName,
    company,
    role,
    category,
    avatarMode,
    avatarColor: avatarColor || null,
    avatarIcon: avatarIcon || null,
  };
  const inferredIcon = getAvatarIconKey(previewContact);

  async function handleSubmit(formData: FormData) {
    setError(null);
    try {
      await action(formData);
    } catch (err) {
      // next/redirect throws a synthetic "NEXT_REDIRECT" error after a
      // successful action — that's the success path, not an actual error.
      const message =
        err instanceof Error ? err.message : "Failed to save contact.";
      if (message.includes("NEXT_REDIRECT")) return;
      setError(message);
    }
  }

  return (
    <form
      id={formId}
      action={(fd) => startTransition(() => handleSubmit(fd))}
      className="flex flex-col gap-8"
    >
      {error ? (
        <div
          role="alert"
          className="rounded-[var(--radius-md)] border px-3 py-2 text-sm"
          style={{
            background: "var(--semantic-error-bg)",
            borderColor: "var(--semantic-error-border)",
            color: "var(--semantic-error)",
          }}
        >
          {error}
        </div>
      ) : null}

      <Section
        title="Contact identity"
        description="Required: at least one of first/last name, company, or display name."
      >
        <div className="flex flex-col gap-6">
          <AvatarEditor
            preview={previewContact}
            mode={avatarMode}
            color={avatarColor}
            icon={avatarIcon}
            inferredIcon={inferredIcon}
            onModeChange={setAvatarMode}
            onColorChange={setAvatarColor}
            onIconChange={setAvatarIcon}
          />
          <Grid>
            <Field label="First name">
              <input
                name="firstName"
                autoComplete="given-name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className={inputBase}
              />
            </Field>
            <Field label="Last name">
              <input
                name="lastName"
                autoComplete="family-name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className={inputBase}
              />
            </Field>
            <Field
              label="Display name"
              helper="Optional. Auto-fills from first + last name, or company."
            >
              <input
                name="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="e.g. Jane Smith"
                className={inputBase}
              />
            </Field>
            <Field label="Company">
              <input
                name="company"
                autoComplete="organization"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="e.g. Sample Plumbing & Heating"
                className={inputBase}
              />
            </Field>
            <Field label="Role / title">
              <input
                name="role"
                autoComplete="organization-title"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="e.g. General contractor"
                className={inputBase}
              />
            </Field>
            <Field label="Category">
              <select
                name="category"
                value={category}
                onChange={(e) =>
                  setCategory(e.target.value as ContactCategory)
                }
                className={selectClass}
              >
                {contactCategoryOrder.map((c) => (
                  <option key={c} value={c}>
                    {contactCategoryLabels[c]}
                  </option>
                ))}
              </select>
            </Field>
          </Grid>
        </div>
      </Section>

      {/* Hidden inputs carry avatar state to the server action. */}
      <input type="hidden" name="avatarMode" value={avatarMode} />
      <input type="hidden" name="avatarColor" value={avatarColor} />
      <input type="hidden" name="avatarIcon" value={avatarIcon} />

      <Section title="Contact methods">
        <Grid>
          <Field label="Phone" helper="Any common format. Displayed as (xxx) xxx-xxxx.">
            <input
              name="phone"
              type="tel"
              autoComplete="tel"
              defaultValue={initial?.phone ?? ""}
              placeholder="(617) 383-3745"
              className={inputBase}
            />
          </Field>
          <Field label="Email">
            <input
              name="email"
              type="email"
              autoComplete="email"
              defaultValue={initial?.email ?? ""}
              placeholder="name@example.com"
              className={inputBase}
            />
          </Field>
          <Field label="Website" helper="https:// is added automatically if missing.">
            <input
              name="website"
              type="url"
              autoComplete="url"
              defaultValue={initial?.website ?? ""}
              placeholder="example.com"
              className={inputBase}
            />
          </Field>
          <Field label="Address">
            <textarea
              name="address"
              rows={2}
              defaultValue={initial?.address ?? ""}
              placeholder={"123 Main St\nLoudonville, NY 12211"}
              className={`${inputBase} min-h-[60px]`}
            />
          </Field>
        </Grid>
      </Section>

      <Section
        title="Classification"
        description="Cross-module taxonomy. Optional — leave blank if you don't have it captured yet."
      >
        <Grid>
          <Field label="Entity type">
            <select
              name="entityType"
              defaultValue={initial?.entityType ?? ""}
              className={selectClass}
            >
              <option value="">— Auto —</option>
              {ENTITY_TYPES.map((t) => (
                <option key={t} value={t}>
                  {entityTypeLabels[t]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Relationship type">
            <select
              name="relationshipType"
              defaultValue={initial?.relationshipType ?? ""}
              className={selectClass}
            >
              <option value="">— None —</option>
              {RELATIONSHIP_TYPES.map((t) => (
                <option key={t} value={t}>
                  {relationshipTypeLabels[t]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Functional domain">
            <select
              name="functionalDomain"
              defaultValue={initial?.functionalDomain ?? ""}
              className={selectClass}
            >
              <option value="">— None —</option>
              {FUNCTIONAL_DOMAINS.map((t) => (
                <option key={t} value={t}>
                  {functionalDomainLabels[t]}
                </option>
              ))}
            </select>
          </Field>
          <Field
            label="Specialty"
            helper="Free text. e.g. “Real estate attorney”, “Residential electrician”."
          >
            <input
              name="specialty"
              defaultValue={initial?.specialty ?? ""}
              placeholder="Real estate attorney"
              className={inputBase}
            />
          </Field>
          <Field
            label="Contextual role"
            helper="What this contact is doing for J.G. Walsh & Co. right now."
          >
            <input
              name="contextRole"
              defaultValue={initial?.contextRole ?? ""}
              placeholder="Closing counsel for 322 Osborne"
              className={inputBase}
            />
          </Field>
        </Grid>
      </Section>

      <Section title="Workspace metadata">
        <Grid>
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
            <label className="inline-flex h-[42px] items-center gap-2 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm shadow-[var(--shadow-card)]">
              <input
                type="checkbox"
                name="isFavorite"
                defaultChecked={initial?.isFavorite ?? false}
                className="h-4 w-4 accent-[var(--color-primary)]"
              />
              <span className="text-[var(--color-text)]">
                Pin to favorites
              </span>
            </label>
          </Field>
          <Field label="Related property">
            <input
              name="relatedProperty"
              defaultValue={initial?.relatedProperty ?? ""}
              placeholder="e.g. 322 Osborne Rd"
              className={inputBase}
            />
          </Field>
          <Field label="Related project">
            <input
              name="relatedProject"
              defaultValue={initial?.relatedProject ?? ""}
              placeholder="e.g. 322 Osborne Renovation"
              className={inputBase}
            />
          </Field>
        </Grid>
      </Section>

      <Section title="Compliance">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
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
        </div>
      </Section>

      <Section title="Follow-up">
        <Grid>
          <Field label="Last contacted">
            <input
              type="date"
              name="lastContactedAt"
              defaultValue={dateInputValue(initial?.lastContactedAt)}
              className={inputBase}
            />
          </Field>
          <Field label="Follow up">
            <input
              type="date"
              name="followUpAt"
              defaultValue={dateInputValue(initial?.followUpAt)}
              className={inputBase}
            />
          </Field>
        </Grid>
      </Section>

      <Section title="Notes">
        <Field label="Notes">
          <textarea
            name="notes"
            defaultValue={initial?.notes ?? ""}
            className={textareaClass}
            placeholder="Working notes, qualifications, things to remember…"
          />
        </Field>
      </Section>

      <footer className="flex flex-wrap items-center gap-2 border-t border-[var(--color-border)] pt-5">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-primary)] bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-[var(--color-text-inverse)] transition-colors hover:bg-[var(--color-primary-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)] disabled:opacity-60"
        >
          {pending ? "Saving…" : submitLabel}
        </button>
        <a
          href={cancelHref}
          className="inline-flex items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2 text-sm font-medium text-[var(--color-text)] hover:border-[var(--color-border-strong)] hover:text-[var(--color-text)]"
        >
          Cancel
        </a>
      </footer>
    </form>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4">
      <header className="flex flex-col gap-0.5 border-b border-[var(--color-border)] pb-2">
        <h3 className="text-sm font-semibold text-[var(--color-text)]">
          {title}
        </h3>
        {description ? (
          <p className={helperClass}>{description}</p>
        ) : null}
      </header>
      {children}
    </section>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{children}</div>
  );
}

function Field({
  label,
  helper,
  children,
}: {
  label: string;
  helper?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className={labelClass}>{label}</span>
      {children}
      {helper ? <span className={helperClass}>{helper}</span> : null}
    </label>
  );
}

type AvatarEditorProps = {
  preview: Parameters<typeof ContactAvatar>[0]["contact"];
  mode: AvatarMode;
  color: AvatarColor | "";
  icon: AvatarIconKey | "";
  inferredIcon: AvatarIconKey;
  onModeChange: (m: AvatarMode) => void;
  onColorChange: (c: AvatarColor | "") => void;
  onIconChange: (i: AvatarIconKey | "") => void;
};

function AvatarEditor({
  preview,
  mode,
  color,
  icon,
  inferredIcon,
  onModeChange,
  onColorChange,
  onIconChange,
}: AvatarEditorProps) {
  return (
    <div className="flex flex-col gap-4 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-soft)] p-4 sm:flex-row sm:items-start">
      <div className="flex flex-col items-center gap-2 sm:w-28 sm:shrink-0">
        <ContactAvatar contact={preview} size="lg" />
        <span className={helperClass}>Preview</span>
      </div>

      <div className="flex flex-1 flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <span className={labelClass}>Style</span>
          <div className="grid grid-cols-2 gap-1 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-1">
            <ModeTab
              label="Initials"
              active={mode === "INITIALS"}
              onClick={() => onModeChange("INITIALS")}
            />
            <ModeTab
              label="Icon"
              active={mode === "ICON"}
              onClick={() => onModeChange("ICON")}
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <span className={labelClass}>Color</span>
          <div className="flex flex-wrap items-center gap-2">
            <DefaultSwatch
              active={color === ""}
              onClick={() => onColorChange("")}
            />
            {AVATAR_PALETTE_ORDER.map((key) => {
              const tone = AVATAR_PALETTE[key];
              const active = color === key;
              return (
                <button
                  key={key}
                  type="button"
                  aria-label={`Color ${key}`}
                  aria-pressed={active}
                  onClick={() => onColorChange(key)}
                  className={`h-7 w-7 rounded-full border-2 transition-transform focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)] ${
                    active
                      ? "scale-110 border-[var(--color-text)]"
                      : "border-[var(--color-border)] hover:scale-105"
                  }`}
                  style={{ background: tone.bg }}
                />
              );
            })}
          </div>
        </div>

        {mode === "ICON" ? (
          <div className="flex flex-col gap-1.5">
            <span className={labelClass}>Icon</span>
            <div className="grid grid-cols-6 gap-2 sm:grid-cols-8">
              <AutoIconButton
                inferred={inferredIcon}
                active={icon === ""}
                onClick={() => onIconChange("")}
              />
              {AVATAR_ICON_KEYS.map((key) => {
                const Icon = ICON_COMPONENTS[key];
                const active = icon === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => onIconChange(key)}
                    aria-label={`Icon ${key}`}
                    aria-pressed={active}
                    className={`flex h-9 w-9 items-center justify-center rounded-[var(--radius-sm)] border transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)] ${
                      active
                        ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-[var(--color-text-inverse)]"
                        : "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] hover:border-[var(--color-border-strong)]"
                    }`}
                  >
                    <Icon className="h-4 w-4" strokeWidth={1.75} />
                  </button>
                );
              })}
            </div>
            <span className={helperClass}>
              Auto picks an icon from category, role, and notes. Override with
              any specific icon.
            </span>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function ModeTab({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`min-h-[36px] rounded-[var(--radius-sm)] px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)] ${
        active
          ? "bg-[var(--color-primary)] text-[var(--color-text-inverse)] shadow-[var(--shadow-card)]"
          : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
      }`}
    >
      {label}
    </button>
  );
}

function DefaultSwatch({
  active,
  onClick,
}: {
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      title="Auto by category"
      className={`flex h-7 w-7 items-center justify-center rounded-full border-2 text-[10px] font-semibold transition-transform focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)] ${
        active
          ? "scale-110 border-[var(--color-text)] bg-[var(--color-surface)] text-[var(--color-text)]"
          : "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:scale-105"
      }`}
    >
      A
    </button>
  );
}

function AutoIconButton({
  inferred,
  active,
  onClick,
}: {
  inferred: AvatarIconKey;
  active: boolean;
  onClick: () => void;
}) {
  const Icon = ICON_COMPONENTS[inferred];
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      title="Auto pick by category & role"
      className={`flex h-9 w-9 items-center justify-center rounded-[var(--radius-sm)] border-2 border-dashed transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)] ${
        active
          ? "border-[var(--color-primary)] bg-[var(--color-surface)] text-[var(--color-primary)]"
          : "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:border-[var(--color-border-strong)]"
      }`}
    >
      <Icon className="h-4 w-4" strokeWidth={1.75} />
    </button>
  );
}
