"use client";

/**
 * Property card with visible segmented tabs.
 *
 * Renders a single business or private/reference property as the primary
 * unit of the Market Tracker workspace. The card shows house market
 * value, market rent, yield, and verification at the top, followed by a
 * row of real button-based tabs for Overview / Chart / Comps / Records
 * / Trend.
 *
 * Implementation rules:
 *   • client-only for tab state and the per-property AI analysis button
 *   • no <details> for primary content
 *   • no dropdowns
 *   • all data is passed in as a serializable PropertyCardData payload
 *     from the server page; this component never fetches anything
 */

import Link from "next/link";
import { useId, useState, useTransition } from "react";
import {
  generatePropertyAnalysis,
  generatePropertyAnalysisWithWebSearch,
  type MarketNoteState,
} from "../market-note-actions";
import { buildPropertyNoteInput } from "../property-note-builder";
import {
  PropertyValuationChart,
  type ValuationPoint,
} from "./property-valuation-chart";
import { AiResponseCard } from "./ai-response-card";

// =============================================================
// Public types
// =============================================================

const dash = "—";

type IsoDate = string;

export type PropertyCardData = {
  property: {
    id: string;
    address: string;
    city: string;
    state: string;
    zip: string | null;
    role: string;
    isPrivate: boolean;
    factsNeedVerification: boolean;
    zipNeedsVerification: boolean;
    workspaceHref?: string | null;
    notes?: string | null;
  };
  house: {
    value: number | null;
    source: "ATTOM AVM" | "RentCast" | "Manual" | "None";
    asOfDate: IsoDate | null;
    rangeLow: number | null;
    rangeHigh: number | null;
    confidence: number | null;
  };
  rent: {
    rent: number | null;
    source: "RentCast" | "Manual target" | "None";
    asOfDate: IsoDate | null;
    rangeLow: number | null;
    rangeHigh: number | null;
  };
  trend: {
    zip: string | null;
    latestValue: number | null;
    latestDate: string | null;
    yoyChange: number | null;
    threeYearChange: number | null;
    fiveYearChange: number | null;
  };
  projection: {
    m12: number | null;
    m24: number | null;
    m36: number | null;
    rateSource: string | null;
    rate: number | null;
  };
  yieldPct: number | null;
  verification: {
    verifiedByAttom: boolean;
    avmUnavailableForPlan: boolean;
  };
  attomFacts: {
    attomId: string | null;
    apn: string | null;
    fips: string | null;
    addressOneLine: string | null;
    yearBuilt: number | null;
    buildingSize: number | null;
    assessedValue: number | null;
    marketValue: number | null;
    annualTaxes: number | null;
    lastSalePrice: number | null;
    lastSaleDate: string | null;
    propertyClass: string | null;
  } | null;
  saleComps: PropertyComp[];
  rentalComps: PropertyComp[];
  rentCastLastFetched: IsoDate | null;
  attomLastFetched: IsoDate | null;
  valuationSeries: SerializableValuationPoint[];
  attentionItems: string[];
};

export type PropertyComp = {
  address: string | null;
  amount: number | null;
  beds: number | null;
  baths: number | null;
  sqft: number | null;
  distanceMiles: number | null;
  date: string | null;
  status: string | null;
};

export type SerializableValuationPoint = Omit<ValuationPoint, "date"> & {
  date: IsoDate;
};

// =============================================================
// Local format helpers
// =============================================================

function formatCurrency(v: number | null | undefined): string {
  if (v == null) return dash;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(v);
}

function formatRent(v: number | null | undefined): string {
  if (v == null) return dash;
  return `${formatCurrency(v)}/mo`;
}

function formatDate(v: string | null | undefined): string {
  if (!v) return dash;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return dash;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function relativeAge(v: string | null | undefined): string {
  if (!v) return dash;
  const ms = Date.now() - new Date(v).getTime();
  if (Number.isNaN(ms)) return dash;
  const days = Math.floor(ms / 86_400_000);
  if (days < 0) return formatDate(v);
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days}d ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

function formatPctChange(v: number | null | undefined): string {
  if (v == null) return dash;
  const pct = v * 100;
  const sign = pct > 0 ? "+" : "";
  return `${sign}${pct.toFixed(1)}%`;
}

function pctChangeColor(v: number | null | undefined): string {
  if (v == null || v === 0) return "var(--market-text-muted)";
  return v > 0 ? "var(--market-positive-dark)" : "var(--market-negative-dark)";
}

function formatPctValue(v: number | null | undefined, fractionDigits = 2): string {
  if (v == null) return dash;
  return `${v.toFixed(fractionDigits)}%`;
}

function isStaleIso(v: string | null | undefined, days: number): boolean {
  if (!v) return false;
  const ms = Date.now() - new Date(v).getTime();
  if (Number.isNaN(ms)) return false;
  return ms / 86_400_000 > days;
}

function deserializeChartPoints(
  points: SerializableValuationPoint[]
): ValuationPoint[] {
  return points.map((p) => ({ ...p, date: new Date(p.date) }));
}

// =============================================================
// Tabs
// =============================================================

const TABS = ["overview", "chart", "comps", "records", "trend"] as const;
type TabId = (typeof TABS)[number];

const TAB_LABELS: Record<TabId, string> = {
  overview: "Overview",
  chart: "Chart",
  comps: "Comps",
  records: "Records",
  trend: "Trend",
};

// =============================================================
// PropertyCard
// =============================================================

export function PropertyCard({
  data,
  defaultTab = "overview",
}: {
  data: PropertyCardData;
  defaultTab?: TabId;
}) {
  const [activeTab, setActiveTab] = useState<TabId>(defaultTab);
  const titleId = useId();
  const tablistId = useId();

  const { property, house, rent, trend, verification } = data;
  const accent = propertyAccent(property.id);

  const lastRefreshedIso =
    [house.asOfDate, rent.asOfDate, data.rentCastLastFetched, data.attomLastFetched]
      .filter((x): x is string => typeof x === "string" && x.length > 0)
      .sort()
      .pop() ?? null;

  const stale = isStaleIso(lastRefreshedIso, 30);
  const verificationLabel = verification.verifiedByAttom
    ? "ATTOM verified"
    : property.factsNeedVerification || property.zipNeedsVerification
    ? "Records pending"
    : "Manual notes";

  return (
    <article
      aria-labelledby={titleId}
      className={`flex flex-col border ${
        property.isPrivate
          ? "border-dashed border-[var(--market-amber)]"
          : "border-[var(--market-border)]"
      } bg-[var(--market-surface)]`}
      style={{ borderLeft: `4px solid ${accent}` }}
    >
      <header className="flex flex-col gap-3 border-b border-[var(--market-border)] px-4 py-4 sm:px-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <h3
                id={titleId}
                className="font-display text-xl font-semibold leading-tight text-[#f8fbff] sm:text-2xl"
              >
                {property.address}
              </h3>
              {property.isPrivate ? (
                <span className="border border-[var(--market-amber)] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--market-amber)]">
                  Private / Reference
                </span>
              ) : null}
            </div>
            <p className="mt-1 text-xs text-[var(--market-text-secondary)]">
              {property.city}, {property.state}
              {property.zip ? ` · ZIP ${property.zip}` : ""}
              {" · "}
              <span className="text-[var(--market-text-muted)]">{property.role}</span>
              {property.workspaceHref ? (
                <>
                  {" · "}
                  <Link
                    href={property.workspaceHref}
                    className="text-[var(--market-cyan)] hover:underline"
                  >
                    workspace
                  </Link>
                </>
              ) : null}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-[var(--market-text-muted)]">
              <span>
                Zillow ZHVI{" "}
                <span className="font-data text-[var(--market-text)]">
                  {trend.zip ? `ZIP ${trend.zip}` : dash}
                </span>
              </span>
              <span className="font-data tabular-nums text-[var(--market-text)]">
                {formatCurrency(trend.latestValue)}
              </span>
              <span
                className="font-data tabular-nums"
                style={{ color: pctChangeColor(trend.yoyChange) }}
              >
                1Y {formatPctChange(trend.yoyChange)}
              </span>
              <span>Trend context only</span>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1 text-right">
            <span
              className={`font-data text-[11px] tabular-nums ${
                stale
                  ? "text-[var(--market-amber)]"
                  : "text-[var(--market-text-muted)]"
              }`}
            >
              {lastRefreshedIso ? relativeAge(lastRefreshedIso) : "no snapshot"}
              {stale ? " · stale" : ""}
            </span>
            <span
              className={`text-[11px] font-semibold ${
                verification.verifiedByAttom
                  ? "text-[var(--market-positive-dark)]"
                  : property.factsNeedVerification || property.zipNeedsVerification
                  ? "text-[var(--market-amber)]"
                  : "text-[var(--market-text-secondary)]"
              }`}
            >
              {verificationLabel}
            </span>
          </div>
        </div>

        <PropertyMetricStrip data={data} />
      </header>

      <PropertyTabs
        tablistId={tablistId}
        active={activeTab}
        onChange={setActiveTab}
      />

      <div className="px-4 py-4 sm:px-5">
        {activeTab === "overview" ? <OverviewPanel data={data} /> : null}
        {activeTab === "chart" ? <ChartPanel data={data} /> : null}
        {activeTab === "comps" ? <CompsPanel data={data} /> : null}
        {activeTab === "records" ? <RecordsPanel data={data} /> : null}
        {activeTab === "trend" ? <TrendPanel data={data} /> : null}
      </div>

      <PropertyAiPanel data={data} />
    </article>
  );
}

// =============================================================
// Metric strip
// =============================================================

function PropertyMetricStrip({ data }: { data: PropertyCardData }) {
  const { house, rent, yieldPct, verification } = data;
  const valueRange =
    house.rangeLow != null && house.rangeHigh != null
      ? `${formatCurrency(house.rangeLow)} – ${formatCurrency(house.rangeHigh)}`
      : "Range unavailable";
  const rentRange =
    rent.rangeLow != null && rent.rangeHigh != null
      ? `${formatCurrency(rent.rangeLow)} – ${formatCurrency(rent.rangeHigh)}/mo`
      : "Range unavailable";

  return (
    <div className="grid grid-cols-2 gap-x-3 gap-y-3 sm:grid-cols-3 lg:grid-cols-4">
      <Metric
        label="House market value"
        value={formatCurrency(house.value)}
        sub={
          house.source === "None" ? "no source" : `via ${house.source}`
        }
        emphasized
      />
      <Metric
        label="Market rent"
        value={formatRent(rent.rent)}
        sub={
          rent.source === "None" ? "no source" : `via ${rent.source}`
        }
        emphasized
      />
      <Metric
        label="Gross rent yield"
        value={formatPctValue(yieldPct, 2)}
        sub="annual rent ÷ value"
      />
      <Metric
        label="Value range"
        value={valueRange === "Range unavailable" ? dash : valueRange}
        sub={valueRange === "Range unavailable" ? "no AVM range" : "AVM low – high"}
      />
      <Metric
        label="Rent range"
        value={rentRange === "Range unavailable" ? dash : rentRange}
        sub={
          rentRange === "Range unavailable" ? "no rent range" : "RentCast low – high"
        }
      />
      <Metric
        label="Confidence"
        value={
          house.confidence != null ? `${Math.round(house.confidence)}/100` : dash
        }
        sub={
          house.source === "ATTOM AVM"
            ? "ATTOM AVM"
            : house.source === "RentCast"
            ? "RentCast AVM"
            : house.source === "Manual"
            ? "Manual underwriting"
            : "no value source"
        }
      />
      {verification.avmUnavailableForPlan ? (
        <div className="col-span-full">
          <p className="text-[11px] text-[var(--market-amber)]">
            ATTOM AVM not returned: endpoint forbidden by current plan/key.
          </p>
        </div>
      ) : null}
    </div>
  );
}

function Metric({
  label,
  value,
  sub,
  emphasized = false,
}: {
  label: string;
  value: string;
  sub?: string;
  emphasized?: boolean;
}) {
  return (
    <div className="min-w-0">
      <div className="text-[11px] uppercase tracking-wide text-[var(--market-text-muted)]">
        {label}
      </div>
      <div
        className={`mt-1 truncate font-data tabular-nums text-[var(--market-text)] ${
          emphasized
            ? "text-xl font-semibold sm:text-2xl"
            : "text-base font-medium"
        }`}
      >
        {value}
      </div>
      {sub ? (
        <div className="mt-0.5 truncate text-[11px] text-[var(--market-text-secondary)]">
          {sub}
        </div>
      ) : null}
    </div>
  );
}

// =============================================================
// Tabs row
// =============================================================

function PropertyTabs({
  tablistId,
  active,
  onChange,
}: {
  tablistId: string;
  active: TabId;
  onChange: (id: TabId) => void;
}) {
  return (
    <div
      role="tablist"
      id={tablistId}
      aria-label="Property detail sections"
      className="flex gap-1 overflow-x-auto border-b border-[var(--market-border)] bg-[var(--market-bg)] px-2 py-2 sm:px-3"
    >
      {TABS.map((tabId) => {
        const isActive = active === tabId;
        return (
          <button
            key={tabId}
            type="button"
            role="tab"
            aria-selected={isActive}
            aria-controls={`${tablistId}-${tabId}`}
            tabIndex={isActive ? 0 : -1}
            onClick={() => onChange(tabId)}
            className={[
              "inline-flex shrink-0 items-center justify-center border px-3 py-2 text-xs font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--market-cyan)] sm:text-sm",
              "min-h-[40px]",
              isActive
                ? "border-[var(--market-cyan)] bg-[var(--market-surface-raised)] text-[var(--market-text)]"
                : "border-transparent bg-transparent text-[var(--market-text-secondary)] hover:border-[var(--market-border-strong)] hover:text-[var(--market-text)]",
            ].join(" ")}
          >
            {TAB_LABELS[tabId]}
          </button>
        );
      })}
    </div>
  );
}

// =============================================================
// Overview tab
// =============================================================

function OverviewPanel({ data }: { data: PropertyCardData }) {
  const { house, rent, trend, attentionItems, property, attomFacts } = data;
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <div className="lg:col-span-2 flex flex-col gap-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <InfoBlock title="House market value">
            <div className="font-data text-2xl font-semibold tabular-nums text-[var(--market-text)]">
              {formatCurrency(house.value)}
            </div>
            <p className="mt-1 text-xs text-[var(--market-text-secondary)]">
              Source: <span className="text-[var(--market-text)]">{house.source}</span>
            </p>
            <p className="text-[11px] text-[var(--market-text-muted)]">
              {house.asOfDate ? `as of ${formatDate(house.asOfDate)}` : "no asOf"}
            </p>
            <p className="text-[11px] text-[var(--market-text-muted)]">
              House value uses fair-market resale only. Never derived from rent.
            </p>
          </InfoBlock>
          <InfoBlock title="Market rent">
            <div className="font-data text-2xl font-semibold tabular-nums text-[var(--market-text)]">
              {formatRent(rent.rent)}
            </div>
            <p className="mt-1 text-xs text-[var(--market-text-secondary)]">
              Source: <span className="text-[var(--market-text)]">{rent.source}</span>
            </p>
            <p className="text-[11px] text-[var(--market-text-muted)]">
              {rent.asOfDate ? `as of ${formatDate(rent.asOfDate)}` : "no asOf"}
            </p>
            <p className="text-[11px] text-[var(--market-text-muted)]">
              Long-term rent estimate. Treated as a separate pipeline.
            </p>
          </InfoBlock>
        </div>

        {property.notes ? (
          <p className="text-xs text-[var(--market-text-secondary)]">
            <span className="text-[var(--market-text-muted)]">Note:</span>{" "}
            {property.notes}
          </p>
        ) : null}

        {attentionItems.length > 0 ? (
          <div className="border-l-2 border-[var(--market-amber)] bg-[var(--market-surface-raised)] px-3 py-2">
            <div className="text-[11px] uppercase tracking-wide text-[var(--market-amber)]">
              Needs attention
            </div>
            <ul className="mt-1 flex flex-col gap-0.5 text-xs text-[var(--market-text-secondary)]">
              {attentionItems.map((item, i) => (
                <li key={i}>· {item}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>

      <div className="flex flex-col gap-3">
        <ZillowMiniTrend trend={trend} />
        <InfoBlock title="ATTOM record snapshot">
          {attomFacts ? (
            <ul className="flex flex-col gap-1 text-xs text-[var(--market-text-secondary)]">
              <FactRow label="APN" value={attomFacts.apn} />
              <FactRow
                label="Year built"
                value={attomFacts.yearBuilt != null ? String(attomFacts.yearBuilt) : null}
              />
              <FactRow
                label="Building size"
                value={
                  attomFacts.buildingSize != null
                    ? `${attomFacts.buildingSize.toLocaleString()} sqft`
                    : null
                }
              />
              <FactRow
                label="Assessed"
                value={
                  attomFacts.assessedValue != null
                    ? formatCurrency(attomFacts.assessedValue)
                    : null
                }
              />
              <FactRow
                label="Annual taxes"
                value={
                  attomFacts.annualTaxes != null
                    ? formatCurrency(attomFacts.annualTaxes)
                    : null
                }
              />
            </ul>
          ) : (
            <p className="text-xs text-[var(--market-text-muted)]">
              No ATTOM record yet. Use Refresh ATTOM in the header.
            </p>
          )}
        </InfoBlock>
      </div>
    </div>
  );
}

function FactRow({ label, value }: { label: string; value: string | null }) {
  return (
    <li className="flex items-baseline justify-between gap-3">
      <span className="text-[var(--market-text-muted)]">{label}</span>
      <span className="font-data tabular-nums text-[var(--market-text)]">
        {value ?? dash}
      </span>
    </li>
  );
}

function InfoBlock({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border border-[var(--market-border)] bg-[var(--market-surface-raised)] p-3">
      <div className="text-[11px] uppercase tracking-wide text-[var(--market-text-muted)]">
        {title}
      </div>
      <div className="mt-2">{children}</div>
    </div>
  );
}

function ZillowMiniTrend({
  trend,
}: {
  trend: PropertyCardData["trend"];
}) {
  const hasZip = trend.zip != null;
  const hasData = trend.latestValue != null;
  return (
    <div className="border border-[var(--market-border)] bg-[var(--market-surface-raised)] p-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <div className="text-[11px] uppercase tracking-wide text-[var(--market-text-muted)]">
            Zillow ZHVI ZIP trend
          </div>
          <div className="mt-1 font-display text-sm font-semibold text-[var(--market-text)]">
            {hasZip ? `ZIP ${trend.zip}` : "ZIP not assigned"}
          </div>
        </div>
        <div className="text-right">
          <div className="font-data text-lg font-semibold tabular-nums text-[var(--market-text)]">
            {hasData ? formatCurrency(trend.latestValue) : dash}
          </div>
          <div className="text-[11px] text-[var(--market-text-muted)]">
            {hasData && trend.latestDate ? `as of ${formatDate(trend.latestDate)}` : "no data"}
          </div>
        </div>
      </div>
      <div className="mt-2 grid grid-cols-3 gap-2">
        <ChangeChip label="1Y" value={trend.yoyChange} />
        <ChangeChip label="3Y" value={trend.threeYearChange} />
        <ChangeChip label="5Y" value={trend.fiveYearChange} />
      </div>
      <p className="mt-2 text-[11px] text-[var(--market-text-muted)]">
        Trend context only — not a property estimate.
      </p>
    </div>
  );
}

function ChangeChip({
  label,
  value,
}: {
  label: string;
  value: number | null | undefined;
}) {
  return (
    <div className="border border-[var(--market-border)] px-2 py-1.5">
      <div className="text-[10px] uppercase text-[var(--market-text-muted)]">
        {label}
      </div>
      <div
        className="font-data text-sm font-semibold tabular-nums"
        style={{ color: pctChangeColor(value) }}
      >
        {formatPctChange(value)}
      </div>
    </div>
  );
}

// =============================================================
// Chart tab
// =============================================================

function ChartPanel({ data }: { data: PropertyCardData }) {
  const points = deserializeChartPoints(data.valuationSeries);
  return (
    <div className="flex flex-col gap-2">
      <PropertyValuationChart
        propertyName={data.property.address}
        zip={data.property.zip ?? undefined}
        data={points}
        height={280}
      />
      <p className="text-[11px] text-[var(--market-text-muted)]">
        Historical points and projections are derived from the current AVM
        plus ZIP trend context. Not an appraisal.
      </p>
    </div>
  );
}

// =============================================================
// Comps tab
// =============================================================

function CompsPanel({ data }: { data: PropertyCardData }) {
  const [showAllSale, setShowAllSale] = useState(false);
  const [showAllRental, setShowAllRental] = useState(false);
  const sale = showAllSale ? data.saleComps : data.saleComps.slice(0, 5);
  const rental = showAllRental ? data.rentalComps : data.rentalComps.slice(0, 5);
  const moreSale = Math.max(0, data.saleComps.length - sale.length);
  const moreRental = Math.max(0, data.rentalComps.length - rental.length);

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <div className="flex flex-col gap-2">
        <CompsHeader
          title="Sale comps"
          shown={sale.length}
          remaining={moreSale}
          total={data.saleComps.length}
          expanded={showAllSale}
          onToggle={
            data.saleComps.length > 5
              ? () => setShowAllSale((v) => !v)
              : undefined
          }
        />
        {sale.length === 0 ? (
          <EmptyComps label="No sale comps returned." />
        ) : (
          <CompsList kind="sale" comps={sale} />
        )}
      </div>
      <div className="flex flex-col gap-2">
        <CompsHeader
          title="Rental comps"
          shown={rental.length}
          remaining={moreRental}
          total={data.rentalComps.length}
          expanded={showAllRental}
          onToggle={
            data.rentalComps.length > 5
              ? () => setShowAllRental((v) => !v)
              : undefined
          }
        />
        {rental.length === 0 ? (
          <EmptyComps label="No rental comps returned." />
        ) : (
          <CompsList kind="rent" comps={rental} />
        )}
      </div>
    </div>
  );
}

function CompsHeader({
  title,
  shown,
  remaining,
  total,
  expanded,
  onToggle,
}: {
  title: string;
  shown: number;
  remaining: number;
  total: number;
  expanded: boolean;
  onToggle?: () => void;
}) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <div className="text-[11px] uppercase tracking-wide text-[var(--market-text-muted)]">
        {title}
      </div>
      <div className="flex items-center gap-2">
        <div className="font-data text-[11px] tabular-nums text-[var(--market-text-muted)]">
          {expanded ? "All" : "Top"} {shown}
          {remaining > 0 ? ` of ${total}` : ""}
        </div>
        {onToggle ? (
          <button
            type="button"
            onClick={onToggle}
            className="min-h-[36px] text-[11px] font-semibold text-[var(--market-cyan)] hover:text-[var(--market-text)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--market-cyan)]"
          >
            {expanded ? "Show top 5" : "View all comps"}
          </button>
        ) : null}
      </div>
    </div>
  );
}

function EmptyComps({ label }: { label: string }) {
  return (
    <p className="border border-[var(--market-border)] bg-[var(--market-surface-raised)] p-3 text-xs text-[var(--market-text-muted)]">
      {label}
    </p>
  );
}

function CompsList({
  kind,
  comps,
}: {
  kind: "sale" | "rent";
  comps: PropertyComp[];
}) {
  return (
    <ul className="flex flex-col divide-y divide-[var(--market-border)] border border-[var(--market-border)] bg-[var(--market-surface-raised)]">
      {comps.map((c, i) => (
        <li
          key={`${c.address ?? ""}-${i}`}
          className="flex flex-col gap-1 px-3 py-2 sm:grid sm:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,0.9fr)] sm:items-baseline sm:gap-3"
        >
          <span className="truncate text-xs text-[var(--market-text)]">
            {c.address ?? dash}
          </span>
          <span className="font-data text-sm font-semibold tabular-nums text-[var(--market-text)] sm:text-right">
            {kind === "sale"
              ? c.amount != null
                ? formatCurrency(c.amount)
                : dash
              : c.amount != null
              ? `${formatCurrency(c.amount)}/mo`
              : "Rent not returned"}
          </span>
          <span className="font-data text-[11px] tabular-nums text-[var(--market-text-muted)] sm:text-right">
            {[
              c.beds != null ? `${c.beds}bd` : null,
              c.baths != null ? `${c.baths}ba` : null,
              c.sqft != null ? `${c.sqft.toLocaleString()} sqft` : null,
              c.distanceMiles != null ? `${c.distanceMiles.toFixed(1)}mi` : null,
            ]
              .filter(Boolean)
              .join(" · ") || dash}
          </span>
        </li>
      ))}
    </ul>
  );
}

// =============================================================
// Records tab
// =============================================================

function RecordsPanel({ data }: { data: PropertyCardData }) {
  const f = data.attomFacts;
  if (!f) {
    return (
      <p className="border border-[var(--market-border)] bg-[var(--market-surface-raised)] p-3 text-xs text-[var(--market-text-muted)]">
        No ATTOM record yet for this property. Use Refresh ATTOM in the
        header to fetch.
      </p>
    );
  }

  type Item = { label: string; value: string | null };
  const items: Item[] = [
    { label: "ATTOM ID", value: f.attomId },
    { label: "APN", value: f.apn },
    { label: "FIPS", value: f.fips },
    { label: "Address", value: f.addressOneLine },
    {
      label: "Year built",
      value: f.yearBuilt != null ? String(f.yearBuilt) : null,
    },
    {
      label: "Building size",
      value:
        f.buildingSize != null
          ? `${f.buildingSize.toLocaleString()} sqft`
          : null,
    },
    {
      label: "Assessed value",
      value: f.assessedValue != null ? formatCurrency(f.assessedValue) : null,
    },
    {
      label: "Market value (record)",
      value: f.marketValue != null ? formatCurrency(f.marketValue) : null,
    },
    {
      label: "Annual taxes",
      value: f.annualTaxes != null ? formatCurrency(f.annualTaxes) : null,
    },
    {
      label: "Last sale price",
      value: f.lastSalePrice != null ? formatCurrency(f.lastSalePrice) : null,
    },
    {
      label: "Last sale date",
      value: f.lastSaleDate ? formatDate(f.lastSaleDate) : null,
    },
    { label: "Property class", value: f.propertyClass },
  ];

  const populated = items.filter((i) => i.value != null && i.value !== "");
  if (populated.length === 0) {
    return (
      <p className="border border-[var(--market-border)] bg-[var(--market-surface-raised)] p-3 text-xs text-[var(--market-text-muted)]">
        ATTOM record returned, but year built / size / tax fields were not
        included.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {populated.map((item) => (
        <div
          key={item.label}
          className="border border-[var(--market-border)] bg-[var(--market-surface-raised)] p-3"
        >
          <div className="text-[11px] uppercase tracking-wide text-[var(--market-text-muted)]">
            {item.label}
          </div>
          <div className="mt-1 break-words font-data text-sm tabular-nums text-[var(--market-text)]">
            {item.value}
          </div>
        </div>
      ))}
    </div>
  );
}

// =============================================================
// Trend tab
// =============================================================

function TrendPanel({ data }: { data: PropertyCardData }) {
  const { trend, projection } = data;
  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
      <div className="border border-[var(--market-border)] bg-[var(--market-surface-raised)] p-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div className="font-display text-sm font-semibold text-[var(--market-text)]">
            ZIP {trend.zip ?? "—"} value trend
          </div>
          <div className="text-[11px] text-[var(--market-text-muted)]">
            {trend.latestDate ? `as of ${formatDate(trend.latestDate)}` : "no data"}
          </div>
        </div>
        <div className="mt-3 font-data text-2xl font-semibold tabular-nums text-[var(--market-text)]">
          {formatCurrency(trend.latestValue)}
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2">
          <ChangeChip label="1Y" value={trend.yoyChange} />
          <ChangeChip label="3Y" value={trend.threeYearChange} />
          <ChangeChip label="5Y" value={trend.fiveYearChange} />
        </div>
        <p className="mt-2 text-[11px] text-[var(--market-text-muted)]">
          Zillow ZHVI ZIP-level home value index. Trend context only — not a
          property estimate.
        </p>
      </div>

      <div className="border border-[var(--market-border)] bg-[var(--market-surface-raised)] p-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div className="font-display text-sm font-semibold text-[var(--market-text)]">
            Internal projection
          </div>
          <div className="font-data text-[11px] tabular-nums text-[var(--market-text-muted)]">
            {projection.rateSource
              ? `${formatPctChange(projection.rate)}/yr · ${projection.rateSource}`
              : "Not calculable"}
          </div>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2">
          <ProjectionCell label="12 mo" value={projection.m12} />
          <ProjectionCell label="24 mo" value={projection.m24} />
          <ProjectionCell label="36 mo" value={projection.m36} />
        </div>
        <p className="mt-2 text-[11px] text-[var(--market-text-muted)]">
          Internal projection — current AVM compounded at the ZIP annualized
          growth rate. Not a provider forecast.
        </p>
      </div>
    </div>
  );
}

function ProjectionCell({
  label,
  value,
}: {
  label: string;
  value: number | null | undefined;
}) {
  return (
    <div className="border border-[var(--market-border)] px-2 py-2">
      <div className="text-[10px] uppercase tracking-wide text-[var(--market-text-muted)]">
        {label}
      </div>
      <div className="mt-0.5 font-data text-sm font-semibold tabular-nums text-[var(--market-text)]">
        {formatCurrency(value)}
      </div>
    </div>
  );
}

// =============================================================
// Per-property AI panel
// =============================================================

function PropertyAiPanel({ data }: { data: PropertyCardData }) {
  const [state, setState] = useState<MarketNoteState | null>(null);
  const [pending, startTransition] = useTransition();

  const run = (webSearch: boolean) => {
    setState(null);
    const input = buildPropertyNoteInput(data);
    startTransition(async () => {
      const result = webSearch
        ? await generatePropertyAnalysisWithWebSearch(input)
        : await generatePropertyAnalysis(input);
      setState(result);
    });
  };

  return (
    <div className="border-t border-[var(--market-border)] bg-[var(--market-bg)] px-4 py-3 sm:px-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="font-display text-sm font-semibold text-[var(--market-text)]">
            AI property analysis
          </div>
          <div className="text-[11px] text-[var(--market-text-muted)]">
            Server-side draft from the data already loaded above.
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={pending}
            onClick={() => run(false)}
            className="inline-flex min-h-[40px] items-center justify-center border border-[var(--market-blue)] bg-[var(--market-blue)] px-3 py-2 text-xs font-semibold text-[var(--market-text)] transition hover:bg-[var(--market-cyan)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--market-cyan)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? "Generating…" : "Generate property analysis"}
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => run(true)}
            className="inline-flex min-h-[40px] items-center justify-center border border-[var(--market-border-strong)] bg-transparent px-3 py-2 text-xs font-semibold text-[var(--market-text-secondary)] transition hover:border-[var(--market-cyan)] hover:text-[var(--market-text)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--market-cyan)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? "Generating…" : "with web search"}
          </button>
        </div>
      </div>
      {state ? (
        <div className="mt-3">
          <AiResponseCard state={state} />
        </div>
      ) : null}
    </div>
  );
}

function propertyAccent(id: string): string {
  switch (id) {
    case "loudonwood-51":
      return "var(--market-cyan)";
    case "momrow-16":
      return "var(--market-blue)";
    case "osborne-322":
      return "var(--market-amber)";
    case "macaffer-14":
      return "color-mix(in srgb, var(--market-amber) 65%, var(--market-text-muted))";
    default:
      return "var(--market-border-strong)";
  }
}
