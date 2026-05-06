import Link from "next/link";
import { Prisma } from "@prisma/client";
import type { ContactCategory } from "@prisma/client";
import { PageHeader } from "@/components/page-header";
import { SectionPanel } from "@/components/section-panel";
import {
  contactCategoryLabels,
  contactStatusLabels,
} from "@/lib/contacts";
import { prisma } from "@/lib/prisma";
import { statusTokens } from "@/lib/status";
import { ContactFilterBar } from "./contact-filter-bar";
import { ContactDetail } from "./contact-detail";

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
  const selectedId = sp.id ?? null;

  let dbAvailable = true;
  let contacts: Awaited<ReturnType<typeof prisma.contact.findMany>> = [];
  let allCount = 0;
  let favoritesCount = 0;
  const counts: Partial<Record<ContactCategory, number>> = {};
  let selected: Awaited<ReturnType<typeof prisma.contact.findUnique>> = null;

  try {
    const where: Prisma.ContactWhereInput = {};
    if (categoryParam) where.category = categoryParam;
    if (favoritesOnly) where.isFavorite = true;
    if (q) {
      where.OR = [
        { displayName: { contains: q, mode: "insensitive" } },
        { company: { contains: q, mode: "insensitive" } },
        { role: { contains: q, mode: "insensitive" } },
        { notes: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
        { phone: { contains: q, mode: "insensitive" } },
      ];
    }

    [contacts, allCount, favoritesCount] = await Promise.all([
      prisma.contact.findMany({
        where,
        orderBy: [{ isFavorite: "desc" }, { displayName: "asc" }],
        take: 500,
      }),
      prisma.contact.count(),
      prisma.contact.count({ where: { isFavorite: true } }),
    ]);

    const grouped = await prisma.contact.groupBy({
      by: ["category"],
      _count: { _all: true },
    });
    for (const g of grouped) {
      counts[g.category] = g._count._all;
    }

    if (selectedId) {
      selected = await prisma.contact.findUnique({
        where: { id: selectedId },
      });
    } else if (contacts.length > 0) {
      selected = contacts[0];
    }
  } catch (err) {
    dbAvailable = false;
    console.error("[/contacts] database unavailable:", err);
  }

  return (
    <>
      <PageHeader
        eyebrow="Contacts"
        title="Contacts"
        description="Organize contractors, professionals, municipal contacts, vendors, and key relationships."
        primaryAction={
          <Link
            href="/contacts/new"
            className="inline-flex items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-primary)] bg-[var(--color-primary)] px-3 py-2 text-sm font-semibold text-[var(--color-text-inverse)] hover:bg-[var(--color-primary-hover)]"
          >
            Add contact
          </Link>
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

      <ContactFilterBar
        initialQuery={q}
        activeCategory={categoryParam}
        favoritesOnly={favoritesOnly}
        counts={{
          ...counts,
          __all: allCount,
          __favorites: favoritesCount,
        }}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <SectionPanel
          title="Directory"
          description={
            contacts.length === 1
              ? "1 contact"
              : `${contacts.length} contacts`
          }
          padded={false}
        >
          {contacts.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-[var(--color-text-muted)]">
              No contacts match this filter.
            </p>
          ) : (
            <ul className="divide-y divide-[var(--color-border)]">
              {contacts.map((c) => {
                const status = contactStatusLabels[c.status];
                const active = selected?.id === c.id;
                const params = new URLSearchParams();
                if (q) params.set("q", q);
                if (categoryParam) params.set("category", categoryParam);
                if (favoritesOnly) params.set("favorite", "1");
                params.set("id", c.id);
                return (
                  <li key={c.id}>
                    <Link
                      href={`/contacts?${params.toString()}`}
                      aria-current={active ? "true" : undefined}
                      className={`flex flex-col gap-1 px-5 py-3 transition-colors ${
                        active
                          ? "bg-[var(--color-primary-soft)]"
                          : "hover:bg-[var(--color-surface-soft)]"
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="flex items-center gap-1.5 text-sm font-semibold text-[var(--color-text)]">
                          {c.isFavorite ? (
                            <span
                              aria-hidden
                              className="text-[var(--color-accent)]"
                            >
                              ★
                            </span>
                          ) : null}
                          {c.displayName}
                        </span>
                        <ToneTag label={status.label} tone={status.tone} />
                      </div>
                      <span className="text-xs text-[var(--color-text-muted)]">
                        {[c.company, contactCategoryLabels[c.category]]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                      {c.phone || c.email ? (
                        <span className="text-[11px] text-[var(--color-text-faint)]">
                          {[c.phone, c.email].filter(Boolean).join(" · ")}
                        </span>
                      ) : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </SectionPanel>

        <SectionPanel
          title="Detail"
          description={
            selected
              ? "Tap a phone or email to call/write directly."
              : "Select a contact to view details."
          }
        >
          {selected ? (
            <ContactDetail contact={selected} />
          ) : (
            <p className="text-sm text-[var(--color-text-muted)]">
              {contacts.length === 0
                ? "Add a contact to get started."
                : "Pick a contact from the list."}
            </p>
          )}
        </SectionPanel>
      </div>
    </>
  );
}
