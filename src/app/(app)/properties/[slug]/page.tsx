import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { MetricTile } from "@/components/metric-tile";
import { PageHeader } from "@/components/page-header";
import { SectionPanel } from "@/components/section-panel";
import { ToneTag } from "@/components/tone-tag";
import {
  getPropertyBySlug,
  trackedProperties,
  type TrackedProperty,
} from "@/lib/market-data";
import type { StatusTone } from "@/lib/status";

export const dynamic = "force-static";

export function generateStaticParams() {
  return trackedProperties.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const property = getPropertyBySlug(slug);
  if (!property) return { title: "Property" };
  return { title: `${property.address} · Properties` };
}

const dash = "—";

function statusToneFor(role: TrackedProperty["assetRole"]): StatusTone {
  switch (role) {
    case "Active Rental":
      return "success";
    case "Active Renovation Project":
      return "review";
    case "Private / Reference Only":
      return "neutral";
    default:
      return "neutral";
  }
}

export default async function PropertyDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const property = getPropertyBySlug(slug);
  if (!property) notFound();

  const fullAddress = [
    property.address,
    `${property.city}, ${property.state}${property.zip ? ` ${property.zip}` : ""}`,
  ].join(" · ");

  const headerActions = (
    <Link
      href="/market"
      className="inline-flex min-h-[40px] items-center justify-center rounded-md border border-[var(--color-border-strong)] bg-transparent px-3.5 py-2 text-sm font-medium text-[var(--workspace-text)] transition-colors hover:border-[var(--color-primary)] hover:bg-[var(--color-surface-soft)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)]"
    >
      Open in Market Tracker
    </Link>
  );

  return (
    <>
      <PageHeader
        eyebrow="Property"
        title={property.address}
        description={fullAddress}
        primaryAction={headerActions}
        secondaryAction={
          property.workspaceHref ? (
            <Link
              href={property.workspaceHref}
              className="inline-flex min-h-[40px] items-center justify-center rounded-md border border-transparent bg-[var(--color-primary)] px-3.5 py-2 text-sm font-semibold text-[var(--color-text-inverse)] transition-colors hover:bg-[var(--color-primary-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)]"
            >
              Open renovation workspace
            </Link>
          ) : undefined
        }
      />

      <SectionPanel
        title="Status"
        description="Current asset role and any review flags on the displayed facts."
      >
        <div className="flex flex-wrap items-center gap-2">
          <ToneTag
            label={property.assetRole}
            tone={statusToneFor(property.assetRole)}
          />
          {property.factsNeedVerification ? (
            <ToneTag label="Facts need verification" tone="warning" />
          ) : null}
          {property.zipNeedsVerification ? (
            <ToneTag label="ZIP needs verification" tone="warning" />
          ) : null}
          {property.kind === "private" ? (
            <ToneTag label="Excluded from business KPIs" tone="neutral" />
          ) : null}
        </div>
        {property.notes ? (
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-[var(--workspace-text-secondary)]">
            {property.notes}
          </p>
        ) : null}
      </SectionPanel>

      <SectionPanel
        title="Market value &amp; rent"
        description="Live values come from the Market Tracker. This view is a quick reference; refresh providers there."
        action={
          <Link
            href="/market"
            className="text-xs font-semibold text-[var(--color-primary)] hover:underline"
          >
            Open Market Tracker
          </Link>
        }
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <MetricTile
            label="House market value"
            value={dash}
            hint="Refresh providers in Market Tracker"
          />
          <MetricTile
            label="Market rent"
            value={dash}
            hint="Monthly rent estimate"
          />
          <MetricTile
            label="Value range"
            value={dash}
            hint="Provider AVM low – high"
          />
          <MetricTile
            label="Rent range"
            value={dash}
            hint="Provider rent low – high"
          />
        </div>
      </SectionPanel>

      <SectionPanel
        title="Public records"
        description="Parcel, year built, assessment, taxes, and last sale come from ATTOM in Market Tracker."
        action={
          <Link
            href="/market"
            className="text-xs font-semibold text-[var(--color-primary)] hover:underline"
          >
            Open records in Market Tracker
          </Link>
        }
      >
        <Placeholder>
          Public record details are surfaced inside the property card on
          Market Tracker. A summary here is planned for a future pass.
        </Placeholder>
      </SectionPanel>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <SectionPanel
          title="Documents"
          description="Deeds, insurance, permits, contracts, COIs, quotes, photos."
          action={
            <Link
              href="/documents"
              className="text-xs font-semibold text-[var(--color-primary)] hover:underline"
            >
              Open Documents
            </Link>
          }
        >
          <Placeholder>
            No property-scoped document index yet. Use the Documents page for
            now; per-property linking is planned.
          </Placeholder>
        </SectionPanel>

        <SectionPanel
          title="Quotes"
          description="Vendor quotes, follow-ups, and award status."
          action={
            <Link
              href="/bids"
              className="text-xs font-semibold text-[var(--color-primary)] hover:underline"
            >
              Open Quotes
            </Link>
          }
        >
          <Placeholder>
            No property-scoped quote list yet. Use the Quotes page for now;
            per-property linking is planned.
          </Placeholder>
        </SectionPanel>

        <SectionPanel
          title="Budget &amp; financials"
          description="Estimates, committed costs, actuals, variance, exposure."
          action={
            <Link
              href="/budget"
              className="text-xs font-semibold text-[var(--color-primary)] hover:underline"
            >
              Open Budget
            </Link>
          }
        >
          <Placeholder>
            No property-scoped budget breakdown yet. Use the Budget page for
            now; per-property linking is planned.
          </Placeholder>
        </SectionPanel>

        <SectionPanel
          title="Tasks &amp; follow-ups"
          description="Punch list, deadlines, open decisions."
          action={
            <Link
              href="/tasks"
              className="text-xs font-semibold text-[var(--color-primary)] hover:underline"
            >
              Open Tasks
            </Link>
          }
        >
          <Placeholder>
            No property-scoped task list yet. Use the Tasks page for now;
            per-property linking is planned.
          </Placeholder>
        </SectionPanel>

        <SectionPanel
          title="Contacts"
          description="Contractors, professionals, municipal contacts, vendors."
          action={
            <Link
              href="/contacts"
              className="text-xs font-semibold text-[var(--color-primary)] hover:underline"
            >
              Open Contacts
            </Link>
          }
        >
          <Placeholder>
            No property-scoped contact filter yet. Use the Contacts page for
            now; per-property linking is planned.
          </Placeholder>
        </SectionPanel>

        <SectionPanel
          title="Notes &amp; next checks"
          description="Open items, decisions in flight, things to verify."
        >
          <Placeholder>
            Notes & next checks for this property will live here. Today,
            Market Tracker&rsquo;s Needs Attention panel surfaces the
            cross-portfolio version.
          </Placeholder>
        </SectionPanel>
      </div>
    </>
  );
}

function Placeholder({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-[var(--radius-md)] bg-[var(--color-surface-soft)] px-4 py-3 text-sm leading-relaxed text-[var(--workspace-text-secondary)] shadow-[var(--shadow-card-ring)]">
      {children}
    </p>
  );
}
