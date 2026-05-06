import Link from "next/link";
import type { ReactNode } from "react";
import { PageHeader } from "@/components/page-header";
import { SectionPanel } from "@/components/section-panel";
import {
  computeKpis,
  dash,
  dataSources,
  forecastHorizons,
  formatCurrency,
  formatDate,
  formatPct,
  formatRent,
  neighborhoodSignalCategories,
  propertySnapshots,
  riskCategories,
  trackedProperties,
  type TrackedProperty,
} from "@/lib/market-data";
import { statusTokens } from "@/lib/status";

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

function KpiTile({
  label,
  value,
  sublabel,
}: {
  label: string;
  value: ReactNode;
  sublabel?: string;
}) {
  return (
    <div className="market-card flex flex-col gap-1.5 rounded-[var(--radius-md)] p-4">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-[var(--market-text-muted)]">
        {label}
      </span>
      <span className="font-mono text-2xl font-semibold tabular-nums text-[var(--market-text)]">
        {value}
      </span>
      {sublabel ? (
        <span className="text-xs text-[var(--market-text-muted)]">
          {sublabel}
        </span>
      ) : null}
    </div>
  );
}

/** 0-100 confidence bar. Renders empty when value is null. */
function ConfidenceBar({ value }: { value: number | null }) {
  const safe = value == null ? 0 : Math.max(0, Math.min(100, value));
  return (
    <div
      className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--market-border)]"
      role="progressbar"
      aria-valuenow={safe}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label="Confidence"
    >
      <div
        className="h-full rounded-full"
        style={{
          width: `${safe}%`,
          background: "var(--market-focus)",
        }}
      />
    </div>
  );
}

function DataPlaceholder({ children }: { children?: ReactNode }) {
  return (
    <p className="text-sm text-[var(--market-text-muted)]">
      {children ??
        "No data yet. This section will populate once a data source is connected."}
    </p>
  );
}

function PropertyMarketCard({
  property,
}: {
  property: TrackedProperty;
}) {
  const snap = propertySnapshots.find((s) => s.propertyId === property.id);
  const isPrivate = property.kind === "private";

  return (
    <article
      className={`flex flex-col gap-3 rounded-[var(--radius-md)] p-4 ${
        isPrivate
          ? "border border-dashed border-[var(--market-border)] bg-transparent"
          : "market-card"
      }`}
    >
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="flex flex-col">
          <h3 className="text-base font-semibold text-[var(--market-text)]">
            {property.address}
          </h3>
          <span className="text-xs text-[var(--market-text-muted)]">
            {property.city}, {property.state}{" "}
            {property.zip ?? <span className="italic">ZIP {dash}</span>}
          </span>
        </div>
        <ToneTag
          label={property.assetRole}
          tone={isPrivate ? "neutral" : "info"}
        />
      </header>

      <dl className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <dt className="text-[11px] uppercase tracking-wide text-[var(--market-text-muted)]">
            Est. value
          </dt>
          <dd className="font-mono text-base font-semibold tabular-nums text-[var(--market-text)]">
            {formatCurrency(snap?.estimatedValue ?? null)}
          </dd>
          <ConfidenceBar value={snap?.valueConfidence ?? null} />
          <span className="text-[11px] text-[var(--market-text-muted)]">
            Confidence {formatPct(snap?.valueConfidence ?? null)}
          </span>
        </div>
        <div className="flex flex-col gap-1">
          <dt className="text-[11px] uppercase tracking-wide text-[var(--market-text-muted)]">
            Est. rent
          </dt>
          <dd className="font-mono text-base font-semibold tabular-nums text-[var(--market-text)]">
            {formatRent(snap?.estimatedRent ?? null)}
          </dd>
          <ConfidenceBar value={snap?.rentConfidence ?? null} />
          <span className="text-[11px] text-[var(--market-text-muted)]">
            Confidence {formatPct(snap?.rentConfidence ?? null)}
          </span>
        </div>
      </dl>

      <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--market-border)] pt-3 text-[11px]">
        <span className="text-[var(--market-text-muted)]">
          Last updated {formatDate(snap?.lastUpdated ?? null)}
        </span>
        <div className="flex items-center gap-2">
          {property.zipNeedsVerification || property.factsNeedVerification ? (
            <ToneTag label="Needs verification" tone="warning" />
          ) : null}
          <ToneTag
            label={snap?.sourceStatus ?? "Not connected"}
            tone="neutral"
          />
          {property.workspaceHref ? (
            <Link
              href={property.workspaceHref}
              className="font-semibold text-[var(--market-focus)] hover:underline"
            >
              Open workspace
            </Link>
          ) : null}
        </div>
      </footer>
    </article>
  );
}

function EstimateRow({
  property,
  kind,
}: {
  property: TrackedProperty;
  kind: "value" | "rent";
}) {
  const snap = propertySnapshots.find((s) => s.propertyId === property.id);
  const amount =
    kind === "value"
      ? formatCurrency(snap?.estimatedValue ?? null)
      : formatRent(snap?.estimatedRent ?? null);
  const confidence =
    kind === "value"
      ? snap?.valueConfidence ?? null
      : snap?.rentConfidence ?? null;
  return (
    <div className="grid grid-cols-1 items-center gap-2 border-b border-[var(--market-border)] py-3 last:border-b-0 sm:grid-cols-[2fr_1fr_2fr_1fr] sm:gap-4">
      <span className="text-sm font-medium text-[var(--market-text)]">
        {property.address}
      </span>
      <span className="font-mono text-sm font-semibold tabular-nums text-[var(--market-text)] sm:text-right">
        {amount}
      </span>
      <ConfidenceBar value={confidence} />
      <span className="text-xs text-[var(--market-text-muted)] sm:text-right">
        Confidence {formatPct(confidence)}
      </span>
    </div>
  );
}

function SourceStatusTag({ status }: { status: string }) {
  const tone =
    status === "Connected"
      ? "success"
      : status === "Pending"
      ? "warning"
      : "neutral";
  return <ToneTag label={status} tone={tone} />;
}

export default function MarketPage() {
  const kpis = computeKpis();
  const businessProperties = trackedProperties.filter(
    (p) => p.kind === "business"
  );
  const privateProperty = trackedProperties.find((p) => p.kind === "private");

  return (
    <div className="market-shell -mx-4 -my-6 flex flex-col gap-8 px-4 py-6 sm:-mx-6 sm:-my-8 sm:px-6 sm:py-8 lg:-mx-8 lg:-my-10 lg:px-8 lg:py-10">
      <div className="flex flex-col gap-4">
        <PageHeader
          eyebrow="Market Tracker"
          title="Market intelligence"
          description="Track values, rents, comps, and market signals across J.G. Walsh & Co. assets."
        />
        <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--market-text-muted)]">
          <span
            className="inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[11px] font-medium"
            style={{
              background: "var(--semantic-warning-bg)",
              borderColor: "var(--semantic-warning-border)",
              color: "var(--semantic-warning)",
            }}
          >
            <span
              aria-hidden
              className="inline-block h-1.5 w-1.5 rounded-full"
              style={{ background: "var(--semantic-warning)" }}
            />
            Data sources not connected
          </span>
          <span>
            All figures below are placeholders — not verified, not investment
            advice.
          </span>
        </div>
      </div>

      <SectionPanel
        title="Market Overview"
        description="Business portfolio summary. 14 MacAffer Dr is excluded."
      >
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <KpiTile
            label="Tracked assets"
            value={kpis.trackedAssets}
            sublabel="Business portfolio"
          />
          <KpiTile
            label="Est. portfolio value"
            value={formatCurrency(kpis.estimatedPortfolioValue)}
            sublabel="Sum of estimates"
          />
          <KpiTile
            label="Est. monthly rent"
            value={formatRent(kpis.estimatedMonthlyRent)}
            sublabel="Potential, not actual"
          />
          <KpiTile
            label="Data completeness"
            value={
              kpis.dataCompletenessPct === 0 && kpis.connectedSources === 0
                ? "Not started"
                : formatPct(kpis.dataCompletenessPct)
            }
            sublabel={
              kpis.dataCompletenessPct === 0 && kpis.connectedSources === 0
                ? "Pending data sources"
                : "Across business assets"
            }
          />
          <KpiTile
            label="Last updated"
            value={formatDate(kpis.lastUpdated)}
            sublabel="Most recent snapshot"
          />
          <KpiTile
            label="Connected sources"
            value={`${kpis.connectedSources} / ${kpis.totalSources}`}
            sublabel="Active integrations"
          />
        </div>
      </SectionPanel>

      <SectionPanel
        title="Property Market Cards"
        description="Per-property snapshot of value, rent, and source status."
      >
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {businessProperties.map((p) => (
            <PropertyMarketCard key={p.id} property={p} />
          ))}
        </div>
        {privateProperty ? (
          <div className="mt-5 flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-[var(--market-text-muted)]">
                Private / Reference Only
              </span>
              <ToneTag label="Excluded from KPIs" tone="neutral" />
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
              <PropertyMarketCard property={privateProperty} />
            </div>
          </div>
        ) : null}
      </SectionPanel>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <SectionPanel
          title="Property Value Estimates"
          description="Automated valuations vs. acquisition basis. Placeholder until a source is connected."
        >
          <div className="flex flex-col">
            {businessProperties.map((p) => (
              <EstimateRow key={p.id} property={p} kind="value" />
            ))}
          </div>
        </SectionPanel>

        <SectionPanel
          title="Rent Estimates"
          description="Rent ranges and current rent vs. market. Placeholder until a source is connected."
        >
          <div className="flex flex-col">
            {businessProperties.map((p) => (
              <EstimateRow key={p.id} property={p} kind="rent" />
            ))}
          </div>
        </SectionPanel>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <SectionPanel
          title="Sales Comparables"
          description="Recent sold properties relevant to portfolio assets."
        >
          <DataPlaceholder>
            Comp sets will appear here once a sales-data source (e.g. ATTOM) is
            connected.
          </DataPlaceholder>
        </SectionPanel>

        <SectionPanel
          title="Rental Comparables"
          description="Active and recently leased rentals in the same submarkets."
        >
          <DataPlaceholder>
            Rental comps will appear here once a rental-data source (e.g.
            RentCast) is connected.
          </DataPlaceholder>
        </SectionPanel>
      </div>

      <SectionPanel
        title="Neighborhood Signals"
        description="Demand, schools, walkability, and other locality factors."
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {neighborhoodSignalCategories.map((s) => (
            <div
              key={s.category}
              className="market-card flex flex-col gap-1 rounded-[var(--radius-md)] p-3"
            >
              <span className="text-[11px] font-semibold uppercase tracking-wide text-[var(--market-text-muted)]">
                {s.category}
              </span>
              <span className="text-xs text-[var(--market-text-muted)]">
                {s.description}
              </span>
              <span className="mt-1 font-mono text-sm tabular-nums text-[var(--market-text)]">
                {dash}
              </span>
            </div>
          ))}
        </div>
      </SectionPanel>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <SectionPanel
          title="Forecasts"
          description="Forward-looking value and rent projections."
        >
          <div className="flex flex-col">
            {forecastHorizons.map((h) => (
              <div
                key={h.label}
                className="grid grid-cols-[1fr_auto] items-center gap-3 border-b border-[var(--market-border)] py-2.5 last:border-b-0"
              >
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-[var(--market-text)]">
                    {h.label}
                  </span>
                  <span className="text-xs text-[var(--market-text-muted)]">
                    {h.description}
                  </span>
                </div>
                <span className="font-mono text-sm tabular-nums text-[var(--market-text-muted)]">
                  {dash}
                </span>
              </div>
            ))}
          </div>
        </SectionPanel>

        <SectionPanel
          title="Tax / Assessment Watch"
          description="Assessed values, tax bills, and reassessment history to monitor."
        >
          <div className="flex flex-col">
            {trackedProperties
              .filter((p) => p.kind === "business")
              .map((p) => (
                <div
                  key={p.id}
                  className="grid grid-cols-[2fr_1fr_1fr] items-center gap-3 border-b border-[var(--market-border)] py-2.5 last:border-b-0 text-sm"
                >
                  <span className="text-[var(--market-text)]">{p.address}</span>
                  <span className="text-right font-mono tabular-nums text-[var(--market-text-muted)]">
                    Assessed {dash}
                  </span>
                  <span className="text-right font-mono tabular-nums text-[var(--market-text-muted)]">
                    Last bill {dash}
                  </span>
                </div>
              ))}
          </div>
        </SectionPanel>
      </div>

      <SectionPanel
        title="Risk Indicators"
        description="Climate, regulatory, and market-level risks that could affect value or rentability."
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {riskCategories.map((r) => (
            <div
              key={r.category}
              className="market-card flex flex-col gap-1 rounded-[var(--radius-md)] p-3"
            >
              <span className="text-[11px] font-semibold uppercase tracking-wide text-[var(--market-text-muted)]">
                {r.category}
              </span>
              <span className="text-xs text-[var(--market-text-muted)]">
                {r.description}
              </span>
              <span className="mt-1">
                <ToneTag label="Not assessed" tone="neutral" />
              </span>
            </div>
          ))}
        </div>
      </SectionPanel>

      <SectionPanel
        title="Data Sources"
        description="Integration placeholders. Nothing here calls an external service yet."
      >
        <ul className="flex flex-col divide-y divide-[var(--market-border)]">
          {dataSources.map((d) => (
            <li
              key={d.name}
              className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
            >
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-[var(--market-text)]">
                  {d.name}
                </span>
                <span className="text-xs text-[var(--market-text-muted)]">
                  {d.purpose}
                </span>
              </div>
              <SourceStatusTag status={d.status} />
            </li>
          ))}
        </ul>
      </SectionPanel>
    </div>
  );
}
