"use client";

/**
 * Property Valuation Chart
 *
 * Bloomberg-GP-inspired view for a single property's market value over
 * time, with confidence band, ZIP benchmark series, and event markers.
 *
 * Future data wiring (mock data is used today):
 *   • RentCast current value         → current `propertyValue`
 *   • RentCast value range           → `lowerBound` / `upperBound`
 *   • Zillow ZHVI ZIP trend          → `benchmarkValue` (rebased to the
 *                                       same scale before passing in)
 *   • Internal value projection      → future `propertyValue` points
 *                                       with `isProjection: true`
 *   • ATTOM sale / acquisition       → `event: "Acquisition"`
 *   • Manual renovation dates        → `event: "Renovation"` and similar
 *   • Refinance / listing events     → arbitrary `event` strings
 *
 * The component does NOT fetch any data itself — it's a pure render of
 * the points it's given. Provider clients live in src/lib/* and run
 * server-side; this file is client-only for chart rendering only.
 */

import {
  Area,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

// =============================================================
// Types
// =============================================================

export type ValuationPoint = {
  date: string | Date;
  propertyValue: number | null;
  lowerBound?: number | null;
  upperBound?: number | null;
  benchmarkValue?: number | null;
  isProjection?: boolean;
  event?: string | null;
};

export type PropertyValuationChartProps = {
  propertyName: string;
  zip?: string;
  data: ValuationPoint[];
  height?: number;
};

// =============================================================
// Format helpers (local to keep the file self-contained)
// =============================================================

function toDate(d: string | Date): Date {
  return d instanceof Date ? d : new Date(d);
}

/** Abbreviated currency for axis ticks: $500k, $1.2M, $250k. */
function formatCurrencyShort(v: number): string {
  if (!Number.isFinite(v)) return "—";
  const abs = Math.abs(v);
  if (abs >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `$${Math.round(v / 1_000)}k`;
  return `$${Math.round(v)}`;
}

function formatCurrencyFull(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(v);
}

function formatChartDate(d: string | Date): string {
  const dt = toDate(d);
  if (Number.isNaN(dt.getTime())) return "—";
  return dt.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
  });
}

// =============================================================
// Internal row shape for Recharts
// =============================================================

type ChartRow = {
  ts: number; // numeric timestamp (Recharts X-axis)
  dateLabel: string;
  /** Full point we keep around for the tooltip. */
  raw: ValuationPoint;
  // Two parallel series let us render historical-solid + projection-dashed
  // by switching which key carries the value at each timestamp.
  historical: number | null;
  projection: number | null;
  /** Confidence band columns; recharts <Area> consumes a [low, high] tuple. */
  band: [number, number] | null;
  benchmark: number | null;
};

function toRows(data: ValuationPoint[]): ChartRow[] {
  return data
    .map((p) => {
      const ts = toDate(p.date).getTime();
      if (Number.isNaN(ts)) return null;
      const v = p.propertyValue;
      const isProj = p.isProjection === true;
      const lo = p.lowerBound ?? null;
      const hi = p.upperBound ?? null;
      return {
        ts,
        dateLabel: formatChartDate(p.date),
        raw: p,
        historical: !isProj ? v : null,
        projection: isProj ? v : null,
        band:
          lo != null && hi != null && lo <= hi
            ? ([lo, hi] as [number, number])
            : null,
        benchmark: p.benchmarkValue ?? null,
      } satisfies ChartRow;
    })
    .filter((r): r is ChartRow => r !== null)
    .sort((a, b) => a.ts - b.ts);
}

// =============================================================
// Tooltip
// =============================================================

/** Recharts 3 doesn't export a stable type for custom tooltip content;
 *  we accept a minimal shape and read the row from `payload[0].payload`. */
type ChartTooltipProps = {
  active?: boolean;
  payload?: Array<{ payload?: unknown }>;
};

function ChartTooltip({ active, payload }: ChartTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const row = payload[0]?.payload as ChartRow | undefined;
  if (!row) return null;
  const { raw } = row;
  const isProj = raw.isProjection === true;
  return (
    <div
      className="flex flex-col gap-0.5 rounded-[var(--radius-sm)] border px-3 py-2 text-[11px]"
      style={{
        background: "var(--market-surface)",
        borderColor: "var(--market-border)",
        color: "var(--market-text)",
      }}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="text-[var(--market-text-secondary)]">
          {row.dateLabel}
        </span>
        <span
          className="rounded-full px-1.5 py-px text-[10px] uppercase tracking-wide"
          style={{
            background: isProj
              ? "var(--market-surface-raised)"
              : "var(--market-surface-raised)",
            color: isProj ? "var(--market-amber)" : "var(--market-cyan)",
          }}
        >
          {isProj ? "Projection" : "Historical"}
        </span>
      </div>
      <div className="flex items-center justify-between gap-3">
        <span className="text-[var(--market-text-muted)]">Property value</span>
        <span className="font-mono tabular-nums">
          {formatCurrencyFull(raw.propertyValue)}
        </span>
      </div>
      {raw.lowerBound != null && raw.upperBound != null ? (
        <div className="flex items-center justify-between gap-3">
          <span className="text-[var(--market-text-muted)]">Range</span>
          <span className="font-mono tabular-nums">
            {formatCurrencyFull(raw.lowerBound)} —{" "}
            {formatCurrencyFull(raw.upperBound)}
          </span>
        </div>
      ) : null}
      {raw.benchmarkValue != null ? (
        <div className="flex items-center justify-between gap-3">
          <span className="text-[var(--market-text-muted)]">
            ZIP benchmark
          </span>
          <span className="font-mono tabular-nums">
            {formatCurrencyFull(raw.benchmarkValue)}
          </span>
        </div>
      ) : null}
      {raw.event ? (
        <div
          className="mt-1 border-t pt-1 text-[var(--market-amber)]"
          style={{ borderColor: "var(--market-border)" }}
        >
          ★ {raw.event}
        </div>
      ) : null}
    </div>
  );
}

// =============================================================
// Public component
// =============================================================

export function PropertyValuationChart({
  propertyName,
  zip,
  data,
  height = 320,
}: PropertyValuationChartProps) {
  const rows = toRows(data);

  // Empty state — fewer than 2 usable points means the chart can't
  // draw a meaningful trend; render a clean dark placeholder instead.
  const usable = rows.filter(
    (r) => r.historical != null || r.projection != null
  );
  if (usable.length < 2) {
    return (
      <div
        className="flex flex-col items-center justify-center rounded-[var(--radius-md)] border p-6 text-center"
        style={{
          background: "var(--market-surface)",
          borderColor: "var(--market-border)",
          minHeight: height,
        }}
      >
        <span className="text-sm font-semibold text-[var(--market-text)]">
          {propertyName}
          {zip ? ` · ZIP ${zip}` : ""}
        </span>
        <span className="mt-1 text-xs text-[var(--market-text-muted)]">
          Not enough valuation history yet.
        </span>
      </div>
    );
  }

  // Events to draw as vertical reference lines.
  const eventRows = rows.filter((r) => Boolean(r.raw.event));

  // Y-axis padding — give the line some breathing room above the band.
  const allValues = rows.flatMap((r) => [
    r.historical ?? Number.NaN,
    r.projection ?? Number.NaN,
    r.band?.[0] ?? Number.NaN,
    r.band?.[1] ?? Number.NaN,
    r.benchmark ?? Number.NaN,
  ]);
  const finiteValues = allValues.filter((v) => Number.isFinite(v));
  const minV = Math.min(...finiteValues);
  const maxV = Math.max(...finiteValues);
  const padding = (maxV - minV) * 0.08;
  const yDomain: [number, number] = [
    Math.max(0, Math.floor(minV - padding)),
    Math.ceil(maxV + padding),
  ];

  return (
    <div
      className="flex flex-col gap-2 rounded-[var(--radius-md)] border p-3"
      style={{
        background: "var(--market-surface)",
        borderColor: "var(--market-border)",
      }}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2 px-1">
        <span className="text-sm font-semibold text-[var(--market-text)]">
          {propertyName}
        </span>
        {zip ? (
          <span className="text-[11px] text-[var(--market-text-muted)]">
            ZIP {zip} benchmark overlaid
          </span>
        ) : null}
      </div>

      <div style={{ width: "100%", height }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={rows}
            margin={{ top: 8, right: 12, left: 0, bottom: 4 }}
          >
            <defs>
              <linearGradient id="pvc-band" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="0%"
                  stopColor="var(--market-blue)"
                  stopOpacity={0.18}
                />
                <stop
                  offset="100%"
                  stopColor="var(--market-blue)"
                  stopOpacity={0.04}
                />
              </linearGradient>
            </defs>

            <CartesianGrid
              stroke="var(--market-border)"
              strokeDasharray="2 4"
              vertical={false}
              opacity={0.6}
            />

            <XAxis
              dataKey="ts"
              type="number"
              scale="time"
              domain={["dataMin", "dataMax"]}
              tick={{
                fill: "var(--market-text-muted)",
                fontSize: 11,
              }}
              tickFormatter={(t) => formatChartDate(new Date(t))}
              stroke="var(--market-border)"
              minTickGap={32}
            />

            <YAxis
              tick={{
                fill: "var(--market-text-muted)",
                fontSize: 11,
              }}
              tickFormatter={(v) => formatCurrencyShort(v as number)}
              stroke="var(--market-border)"
              domain={yDomain}
              width={64}
            />

            {/* Confidence band — sits behind the lines */}
            <Area
              type="monotone"
              dataKey="band"
              stroke="none"
              fill="url(#pvc-band)"
              isAnimationActive={false}
              connectNulls
              activeDot={false}
              legendType="none"
            />

            {/* ZIP benchmark — secondary muted line */}
            <Line
              name="ZIP benchmark"
              type="monotone"
              dataKey="benchmark"
              stroke="var(--market-text-secondary)"
              strokeWidth={1.5}
              strokeDasharray="3 3"
              dot={false}
              connectNulls
              isAnimationActive={false}
            />

            {/* Property value — historical (solid) */}
            <Line
              name="Property value"
              type="monotone"
              dataKey="historical"
              stroke="var(--market-cyan)"
              strokeWidth={2.25}
              dot={{ r: 2.5, strokeWidth: 0, fill: "var(--market-cyan)" }}
              connectNulls={false}
              isAnimationActive={false}
            />

            {/* Property value — projection (dashed) */}
            <Line
              name="Projection"
              type="monotone"
              dataKey="projection"
              stroke="var(--market-amber)"
              strokeWidth={2}
              strokeDasharray="6 4"
              dot={{ r: 2.5, strokeWidth: 0, fill: "var(--market-amber)" }}
              connectNulls={false}
              isAnimationActive={false}
            />

            {/* Event markers — vertical dashed reference lines */}
            {eventRows.map((r, i) => (
              <ReferenceLine
                key={`evt-${i}`}
                x={r.ts}
                stroke="var(--market-amber)"
                strokeDasharray="2 4"
                strokeOpacity={0.7}
                label={{
                  value: r.raw.event ?? "",
                  position: "insideTop",
                  fill: "var(--market-amber)",
                  fontSize: 10,
                }}
              />
            ))}

            <Tooltip
              content={<ChartTooltip />}
              cursor={{
                stroke: "var(--market-border-strong)",
                strokeWidth: 1,
                strokeDasharray: "2 2",
              }}
            />

            <Legend
              wrapperStyle={{
                paddingTop: 4,
                fontSize: 11,
                color: "var(--market-text-secondary)",
              }}
              iconSize={8}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-1 text-[10px] text-[var(--market-text-muted)]">
        <span>
          <span
            aria-hidden
            className="mr-1 inline-block h-[2px] w-3 align-middle"
            style={{ background: "var(--market-cyan)" }}
          />
          Property value
        </span>
        <span>
          <span
            aria-hidden
            className="mr-1 inline-block h-[2px] w-3 align-middle"
            style={{
              background: "var(--market-amber)",
              borderTop: "1px dashed var(--market-amber)",
            }}
          />
          Projection
        </span>
        <span>
          <span
            aria-hidden
            className="mr-1 inline-block h-[2px] w-3 align-middle"
            style={{
              borderTop: "1px dashed var(--market-text-secondary)",
            }}
          />
          ZIP benchmark
        </span>
        <span>Confidence band shaded behind line</span>
      </div>
    </div>
  );
}

// =============================================================
// Mock data — for development preview
// =============================================================

/**
 * 5 years of historical points (annual), current year, plus 3 projected
 * years. Includes one acquisition event and one renovation event.
 *
 * Numbers are rounded made-up values for demo only; replace with real
 * snapshot-driven inputs (see file header for mapping).
 */
export const SAMPLE_VALUATION_DATA: ValuationPoint[] = [
  {
    date: "2021-06-01",
    propertyValue: 285_000,
    lowerBound: 268_000,
    upperBound: 302_000,
    benchmarkValue: 240_000,
    event: "Acquisition",
  },
  {
    date: "2022-06-01",
    propertyValue: 312_000,
    lowerBound: 295_000,
    upperBound: 330_000,
    benchmarkValue: 258_000,
  },
  {
    date: "2023-06-01",
    propertyValue: 332_000,
    lowerBound: 315_000,
    upperBound: 350_000,
    benchmarkValue: 269_000,
  },
  {
    date: "2024-06-01",
    propertyValue: 348_000,
    lowerBound: 330_000,
    upperBound: 366_000,
    benchmarkValue: 278_000,
    event: "Renovation",
  },
  {
    date: "2025-06-01",
    propertyValue: 372_000,
    lowerBound: 354_000,
    upperBound: 390_000,
    benchmarkValue: 287_000,
  },
  {
    date: "2026-06-01",
    propertyValue: 388_000,
    lowerBound: 369_000,
    upperBound: 408_000,
    benchmarkValue: 295_000,
  },
  // Projection segment
  {
    date: "2027-06-01",
    propertyValue: 404_000,
    lowerBound: 380_000,
    upperBound: 428_000,
    benchmarkValue: 304_000,
    isProjection: true,
  },
  {
    date: "2028-06-01",
    propertyValue: 421_000,
    lowerBound: 391_000,
    upperBound: 451_000,
    benchmarkValue: 313_000,
    isProjection: true,
  },
  {
    date: "2029-06-01",
    propertyValue: 438_000,
    lowerBound: 402_000,
    upperBound: 474_000,
    benchmarkValue: 322_000,
    isProjection: true,
  },
];
