"use client";

/**
 * Property Valuation Chart
 *
 * Terminal-style view for a single property's market value over time,
 * with confidence band, ZIP benchmark series, and event markers.
 *
 * Data wiring:
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
import { useId } from "react";

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

/** Abbreviated currency for axis ticks — consistent with main formatCurrency style. */
function formatCurrencyShort(v: number): string {
  if (!Number.isFinite(v)) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 1,
    notation: "compact",
    compactDisplay: "short",
  }).format(v);
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
  const rows = data
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

  const firstProjectionIndex = rows.findIndex((r) => r.projection != null);
  if (firstProjectionIndex > 0) {
    const previousValueIndex = rows
      .slice(0, firstProjectionIndex)
      .findLastIndex((r) => r.raw.propertyValue != null);
    if (previousValueIndex >= 0) {
      rows[previousValueIndex] = {
        ...rows[previousValueIndex],
        projection: rows[previousValueIndex].raw.propertyValue,
      };
    }
  }

  return rows;
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
        <span className="font-data tabular-nums">
          {formatCurrencyFull(raw.propertyValue)}
        </span>
      </div>
      {raw.lowerBound != null && raw.upperBound != null ? (
        <div className="flex items-center justify-between gap-3">
          <span className="text-[var(--market-text-muted)]">
            Valuation range
          </span>
          <span className="font-data tabular-nums">
            {formatCurrencyFull(raw.lowerBound)} —{" "}
            {formatCurrencyFull(raw.upperBound)}
          </span>
        </div>
      ) : null}
      {raw.benchmarkValue != null ? (
        <div className="flex items-center justify-between gap-3">
          <span className="text-[var(--market-text-muted)]">
            ZIP ZHVI benchmark
          </span>
          <span className="font-data tabular-nums">
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
  const reactId = useId();
  const bandId = `pvc-band-${reactId.replace(/:/g, "")}`;
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
      className="flex flex-col gap-2 border p-3"
      style={{
        background: "var(--market-surface)",
        borderColor: "var(--market-border)",
      }}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2 px-1">
        <span className="font-display text-sm font-semibold text-[var(--market-text)]">
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
              <linearGradient id={bandId} x1="0" y1="0" x2="0" y2="1">
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
              strokeDasharray="1 3"
              strokeOpacity={0.5}
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
                fontFamily: "var(--font-data)",
                fontSize: 11,
              }}
              tickFormatter={(t) => formatChartDate(new Date(t))}
              stroke="var(--market-border)"
              minTickGap={32}
            />

            <YAxis
              tick={{
                fill: "var(--market-text-muted)",
                fontFamily: "var(--font-data)",
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
              fill={`url(#${bandId})`}
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
                fontFamily: "var(--font-text)",
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
          ZIP ZHVI benchmark
        </span>
        <span>Confidence band shaded behind line</span>
      </div>
    </div>
  );
}
