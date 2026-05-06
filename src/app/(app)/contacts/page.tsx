import Link from "next/link";
import { Prisma } from "@prisma/client";
import type { Contact, ContactCategory } from "@prisma/client";
import { Fragment } from "react";
import { PageHeader } from "@/components/page-header";
import { SectionPanel } from "@/components/section-panel";
import {
  formatContactName,
  formatEmail,
  formatPhone,
  getContactInitial,
} from "@/lib/contact-format";
import {
  contactCategoryLabels,
  contactStatusLabels,
} from "@/lib/contacts";
import { prisma } from "@/lib/prisma";
import { statusTokens } from "@/lib/status";
import { ContactAvatar } from "./contact-avatar";
import { ContactDetail } from "./contact-detail";
import { ContactsSidebar } from "./contacts-sidebar";

export const dynamic = "force-dynamic";

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

type SearchParams = {
  q?: string;
  category?: string;
  favorite?: string;
  recent?: string;
  id?: string;
};

const VALID_CATEGORIES = new Set<ContactCategory>(
  Object.keys(contactCategoryLabels) as ContactCategory[]
);

export default async function ContactsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const q = sp.q?.trim() ?? "";
  const categoryParam =
    sp.category && VALID_CATEGORIES.has(sp.category as ContactCategory)
      ? (sp.category as ContactCategory)
      : null;
  const favoritesOnly = sp.favorite === "1";
  const recentOnly = sp.recent === "1";
  const selectedId = sp.id ?? null;
  const mode = recentOnly ? "recent" : favoritesOnly ? "favorites" : "all";

  let dbAvailable = true;
  let contacts: Contact[] = [];
  let allCount = 0;
  let favoritesCount = 0;
  let recentCount = 0;
  const counts: Partial<Record<ContactCategory, number>> = {};
  let selected: Contact | null = null;

  // "Recent" = top 25 contacts by updatedAt desc among the active set,
  // not strictly tied to lastContactedAt.
  const RECENT_LIMIT = 25;

  try {
    const activeOnly: Prisma.ContactWhereInput = { archivedAt: null };

    const where: Prisma.ContactWhereInput = { ...activeOnly };
    if (categoryParam) where.category = categoryParam;
    if (favoritesOnly) where.isFavorite = true;
    if (q) {
      where.OR = [
        { displayName: { contains: q, mode: "insensitive" } },
        { firstName: { contains: q, mode: "insensitive" } },
        { lastName: { contains: q, mode: "insensitive" } },
        { company: { contains: q, mode: "insensitive" } },
        { role: { contains: q, mode: "insensitive" } },
        { notes: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
        { phone: { contains: q, mode: "insensitive" } },
      ];
    }

    const orderBy = recentOnly
      ? [{ updatedAt: "desc" as const }]
      : [
          { isFavorite: "desc" as const },
          { lastName: "asc" as const },
          { firstName: "asc" as const },
          { displayName: "asc" as const },
          { company: "asc" as const },
        ];

    [contacts, allCount, favoritesCount, recentCount] = await Promise.all([
      prisma.contact.findMany({
        where,
        orderBy,
        take: recentOnly ? RECENT_LIMIT : 500,
      }),
      prisma.contact.count({ where: activeOnly }),
      prisma.contact.count({
        where: { ...activeOnly, isFavorite: true },
      }),
      prisma.contact.count({ where: activeOnly }),
    ]);

    const grouped = await prisma.contact.groupBy({
      by: ["category"],
      where: activeOnly,
      _count: { _all: true },
    });
    for (const g of grouped) {
      counts[g.category] = g._count._all;
    }

    if (selectedId) {
      selected = await prisma.contact.findUnique({
        where: { id: selectedId },
      });
    }
  } catch (err) {
    dbAvailable = false;
    console.error("[/contacts] database unavailable:", err);
  }

  const hasSelection = !!selectedId && !!selected;

  const backHrefParams = new URLSearchParams();
  if (q) backHrefParams.set("q", q);
  if (categoryParam) backHrefParams.set("category", categoryParam);
  if (favoritesOnly) backHrefParams.set("favorite", "1");
  if (recentOnly) backHrefParams.set("recent", "1");
  const listHref = backHrefParams.toString()
    ? `/contacts?${backHrefParams.toString()}`
    : "/contacts";

  return (
    <>
      <PageHeader
        eyebrow="Contacts"
        title="Contacts"
        description="Organize contractors, professionals, municipal contacts, vendors, and key relationships."
        primaryAction={
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/contacts/import"
              className="inline-flex min-h-[40px] items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm font-medium text-[var(--color-text)] hover:border-[var(--color-border-strong)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)]"
            >
              Import contacts
            </Link>
            <Link
              href="/contacts/new"
              className="inline-flex min-h-[40px] items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-primary)] bg-[var(--color-primary)] px-3 py-2 text-sm font-semibold text-[var(--color-text-inverse)] hover:bg-[var(--color-primary-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)]"
            >
              Add contact
            </Link>
          </div>
        }
      />

      {!dbAvailable ? (
        <SectionPanel
          title="Database not reachable"
          description="The contacts database isn't available in this environment yet."
        >
          <p className="text-sm text-[var(--color-text-muted)]">
            Set <code>DATABASE_URL</code> and run <code>npm run db:migrate</code>
            {" "}then <code>npm run db:seed</code>. See the README for details.
          </p>
        </SectionPanel>
      ) : null}

      {/*
        Layout strategy:
          <768  : single pane, id-driven swap. Filters behind a disclosure.
          768–1439 : list | detail. Filters behind a disclosure above list.
          >=1440 : taxonomy rail | list | detail (3-column).
        Rail is intentionally hidden between 1024–1439 so the list and
        detail both have enough room. Custom min-[1440px] breakpoint via
        Tailwind arbitrary-variant — `xl` is 1280 by default in v4.
      */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-[minmax(360px,420px)_minmax(0,1fr)] min-[1440px]:grid-cols-[260px_minmax(360px,420px)_minmax(480px,1fr)]">
        {/* Taxonomy rail — only at 1440+. */}
        <div className="hidden min-[1440px]:block">
          <ContactsSidebar
            initialQuery={q}
            activeCategory={categoryParam}
            mode={mode}
            counts={{
              ...counts,
              __all: allCount,
              __favorites: favoritesCount,
              __recent: Math.min(recentCount, RECENT_LIMIT),
            }}
          />
        </div>

        {/* List pane (col 1 below 1440, col 2 at 1440+).
            Hidden on mobile when a contact is selected. */}
        <div className={hasSelection ? "hidden md:block" : ""}>
          {/* Filters disclosure — visible at <1440 (the rail handles it above 1440). */}
          <details className="mb-4 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-card)] min-[1440px]:hidden">
            <summary className="flex min-h-[44px] cursor-pointer list-none items-center justify-between gap-3 rounded-[var(--radius-md)] px-4 py-2.5 text-sm font-semibold text-[var(--color-text)] [&::-webkit-details-marker]:hidden">
              <span>Search & filters</span>
              <span aria-hidden className="text-[var(--color-text-muted)]">
                ▾
              </span>
            </summary>
            <div className="border-t border-[var(--color-border)] px-4 py-4">
              <ContactsSidebar
                initialQuery={q}
                activeCategory={categoryParam}
                mode={mode}
                counts={{
                  ...counts,
                  __all: allCount,
                  __favorites: favoritesCount,
                  __recent: Math.min(recentCount, RECENT_LIMIT),
                }}
              />
            </div>
          </details>

          <SectionPanel
            title="Directory"
            description={
              recentOnly
                ? `Most recent ${contacts.length}`
                : contacts.length === 1
                ? "1 contact"
                : `${contacts.length} contacts`
            }
            padded={false}
          >
            {contacts.length === 0 ? (
              <p className="px-5 py-10 text-center text-sm text-[var(--color-text-muted)]">
                No contacts match this filter.
              </p>
            ) : (
              <ContactsList
                contacts={contacts}
                selectedId={selected?.id ?? null}
                showAlphaHeaders={!recentOnly}
                q={q}
                category={categoryParam}
                favoritesOnly={favoritesOnly}
                recentOnly={recentOnly}
              />
            )}
          </SectionPanel>
        </div>

        {/* Detail pane (col 2 below 1440, col 3 at 1440+). */}
        <div className={hasSelection ? "" : "hidden md:block"}>
          {selected ? (
            <section className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-card)] sm:p-6">
              <div className="mb-3 md:hidden">
                <Link
                  href={listHref}
                  className="inline-flex min-h-[36px] items-center gap-1 text-sm font-medium text-[var(--color-link)] hover:underline"
                >
                  ← Contacts
                </Link>
              </div>
              <ContactDetail contact={selected} />
            </section>
          ) : (
            <SectionPanel
              title="Detail"
              description="Pick a contact to see the full card."
            >
              <p className="text-sm text-[var(--color-text-muted)]">
                {contacts.length === 0
                  ? "Add a contact to get started."
                  : "Select a contact from the list."}
              </p>
            </SectionPanel>
          )}
        </div>
      </div>
    </>
  );
}

function ContactsList({
  contacts,
  selectedId,
  showAlphaHeaders,
  q,
  category,
  favoritesOnly,
  recentOnly,
}: {
  contacts: Contact[];
  selectedId: string | null;
  showAlphaHeaders: boolean;
  q: string;
  category: ContactCategory | null;
  favoritesOnly: boolean;
  recentOnly: boolean;
}) {
  let lastInitial: string | null = null;

  const headerForRow = (c: Contact): string | null => {
    if (!showAlphaHeaders) return null;
    const initial = c.isFavorite ? "★" : getContactInitial(c);
    if (initial !== lastInitial) {
      lastInitial = initial;
      return initial;
    }
    return null;
  };

  const buildHref = (id: string) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (category) params.set("category", category);
    if (favoritesOnly) params.set("favorite", "1");
    if (recentOnly) params.set("recent", "1");
    params.set("id", id);
    return `/contacts?${params.toString()}`;
  };

  return (
    <ul>
      {contacts.map((c) => {
        const status = contactStatusLabels[c.status];
        const active = selectedId === c.id;
        const header = headerForRow(c);
        const name = formatContactName(c) || c.displayName;
        const phone = formatPhone(c.phone);
        const email = formatEmail(c.email);
        return (
          <Fragment key={c.id}>
            {header ? (
              <li className="border-y border-[var(--color-border)] bg-[var(--color-surface-soft)] px-5 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
                {header}
              </li>
            ) : null}
            <li
              className={`relative ${
                active ? "bg-[var(--color-primary-soft)]" : ""
              }`}
            >
              {active ? (
                <span
                  aria-hidden
                  className="absolute inset-y-0 left-0 w-1 bg-[var(--color-primary)]"
                />
              ) : null}
              <Link
                href={buildHref(c.id)}
                aria-current={active ? "true" : undefined}
                className={`flex min-h-[64px] items-center gap-3 px-5 py-3 transition-colors ${
                  active
                    ? "text-[var(--color-text)]"
                    : "hover:bg-[var(--color-surface-soft)]"
                }`}
              >
                <ContactAvatar contact={c} size="md" />
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
                    <span className="flex min-w-0 items-center gap-1.5 text-sm font-semibold text-[var(--color-text)]">
                      {c.isFavorite ? (
                        <span aria-hidden className="text-[var(--color-accent)]">
                          ★
                        </span>
                      ) : null}
                      <span className="break-words">{name}</span>
                    </span>
                    <ToneTag label={status.label} tone={status.tone} />
                  </div>
                  {c.company || c.role ? (
                    <span className="break-words text-xs text-[var(--color-text-muted)]">
                      {[c.company, c.role].filter(Boolean).join(" · ")}
                    </span>
                  ) : null}
                  <span className="flex flex-wrap items-center gap-x-2 text-[11px] text-[var(--color-text-faint)]">
                    <span>{contactCategoryLabels[c.category]}</span>
                    {phone ? (
                      <span className="font-mono tabular-nums text-[var(--color-text-muted)]">
                        {phone}
                      </span>
                    ) : null}
                    {email ? (
                      <span className="hidden break-all text-[var(--color-text-muted)] min-[1440px]:inline">
                        {email}
                      </span>
                    ) : null}
                  </span>
                </div>
              </Link>
            </li>
          </Fragment>
        );
      })}
    </ul>
  );
}
