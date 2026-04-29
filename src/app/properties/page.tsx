import { FilterPill, FilterPillRow } from "@/components/filter-pill";
import { ModuleCard } from "@/components/module-card";
import { PageHeader } from "@/components/page-header";
import { ResponsiveGrid } from "@/components/responsive-grid";
import { SearchBar } from "@/components/search-bar";
import { StatusBadge } from "@/components/status-badge";
import { properties, propertyStatuses, propertyTypes } from "@/lib/mock-data";

export default function PropertiesPage() {
  return (
    <>
      <PageHeader
        eyebrow="Portfolio"
        title="Properties"
        description="Generic placeholder list. All facts shown as 'Needs verification' where real confirmation is required."
        primaryAction={
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-[var(--color-text-inverse)] transition-colors hover:bg-[var(--color-primary-hover)]"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14M5 12h14" />
            </svg>
            Add property
          </button>
        }
      />

      <div className="flex flex-col gap-[13px] lg:flex-row lg:items-center">
        <div className="lg:w-80">
          <SearchBar placeholder="Search properties…" ariaLabel="Search properties" />
        </div>
        <div className="flex flex-1 flex-col gap-2 lg:flex-row lg:justify-between">
          <FilterPillRow>
            {propertyTypes.map((t, idx) => (
              <FilterPill key={t} label={t} active={idx === 0} />
            ))}
          </FilterPillRow>
        </div>
      </div>

      <FilterPillRow>
        {propertyStatuses.map((s, idx) => (
          <FilterPill key={s} label={s} active={idx === 0} />
        ))}
      </FilterPillRow>

      <ResponsiveGrid minItemWidth="sm" gap="lg">
        {properties.map((property) => (
          <ModuleCard
            key={property.id}
            href={`/properties#${property.id}`}
            title={property.name}
            description={property.notes}
            badge={<StatusBadge status={property.status} />}
            footer={
              <dl className="grid grid-cols-3 gap-2 border-t border-[var(--color-border)] pt-3 text-xs">
                <div className="flex flex-col">
                  <dt className="text-[var(--color-text-faint)]">Region</dt>
                  <dd className="font-semibold text-[var(--color-text)]">{property.region}</dd>
                </div>
                <div className="flex flex-col">
                  <dt className="text-[var(--color-text-faint)]">Type</dt>
                  <dd className="font-semibold text-[var(--color-text)]">{property.type}</dd>
                </div>
                <div className="flex flex-col">
                  <dt className="text-[var(--color-text-faint)]">Reviewed</dt>
                  <dd className="font-semibold text-[var(--color-text)]">{property.lastReviewed}</dd>
                </div>
              </dl>
            }
          >
            <div className="flex flex-wrap gap-3 text-xs text-[var(--color-text-muted)]">
              <span>{property.units > 0 ? `${property.units} units` : "Land parcel"}</span>
              {property.squareFeet > 0 ? (
                <span>{property.squareFeet.toLocaleString()} sq ft</span>
              ) : null}
            </div>
          </ModuleCard>
        ))}
      </ResponsiveGrid>
    </>
  );
}
