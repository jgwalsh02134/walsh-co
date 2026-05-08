import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { SectionPanel } from "@/components/section-panel";
import { ToneTag } from "@/components/tone-tag";
import { trackedProperties, type TrackedProperty } from "@/lib/market-data";
import type { StatusTone } from "@/lib/status";

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

function PropertyCard({ property }: { property: TrackedProperty }) {
  const detailHref = `/properties/${property.slug}`;
  const subline = [
    property.city,
    property.state,
    property.zip ? `ZIP ${property.zip}` : null,
  ]
    .filter(Boolean)
    .join(" · ");
  return (
    <Link
      href={detailHref}
      aria-label={`Open ${property.address}`}
      className="group flex flex-col gap-2 rounded-[var(--radius-xl)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-card),var(--shadow-card-ring)] transition-[transform,box-shadow] duration-150 ease-out hover:-translate-y-0.5 hover:shadow-[var(--shadow-card-hover),var(--shadow-card-ring)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)] motion-reduce:hover:translate-y-0"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-base font-semibold text-[var(--workspace-text)]">
          {property.address}
        </h3>
        <ToneTag
          label={property.assetRole}
          tone={statusToneFor(property.assetRole)}
        />
      </div>
      <p className="text-sm text-[var(--workspace-text-secondary)]">
        {subline}
      </p>
      {property.notes ? (
        <p className="text-sm leading-relaxed text-[var(--workspace-text-secondary)]">
          {property.notes}
        </p>
      ) : null}
      <div className="mt-1 flex flex-wrap items-center gap-3 text-xs">
        {property.factsNeedVerification ? (
          <ToneTag label="Facts need verification" tone="warning" />
        ) : null}
        {property.workspaceHref ? (
          <span className="font-semibold text-[var(--color-primary)]">
            Workspace available
          </span>
        ) : null}
        <span className="ml-auto inline-flex items-center gap-1 font-semibold text-[var(--color-primary)]">
          Open
          <span
            aria-hidden
            className="inline-flex transition-transform duration-150 ease-out group-hover:translate-x-1 motion-reduce:group-hover:translate-x-0"
          >
            →
          </span>
        </span>
      </div>
    </Link>
  );
}

export default function PropertiesPage() {
  const business = trackedProperties.filter((p) => p.kind === "business");
  const reference = trackedProperties.filter((p) => p.kind === "private");

  return (
    <>
      <PageHeader
        eyebrow="Properties"
        title="Property records"
        description="Open individual property records, documents, tasks, and financial details."
      />

      <SectionPanel
        title="Business Portfolio Properties"
        description="Held under J.G. Walsh & Co. Holding Company LLC."
      >
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {business.map((p) => (
            <PropertyCard key={p.slug} property={p} />
          ))}
        </div>
      </SectionPanel>

      {reference.length > 0 ? (
        <SectionPanel
          title="Private / Reference Only"
          description="Excluded from business portfolio KPIs."
        >
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {reference.map((p) => (
              <PropertyCard key={p.slug} property={p} />
            ))}
          </div>
        </SectionPanel>
      ) : null}
    </>
  );
}
