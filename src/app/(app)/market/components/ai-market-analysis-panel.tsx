"use client";

/**
 * Ψ Market Intelligence Assistant
 *
 * Light-surface AI research panel that sits above the property cards.
 * Three modes:
 *
 *   • Internal Summary  — interprets what is already on the dashboard.
 *   • Web Research      — finds NEW external context, conflicts, and
 *                         next checks beyond the dashboard.
 *   • Property Research — same, but scoped to one selected property.
 *
 * Visual goal: looks like a focused research note layered on top of
 * the dark dashboard, not another dark provider card. macOS-style
 * pill buttons, segmented mode selector, soft shadow, light surface.
 */

import { useMemo, useState, useTransition } from "react";
import {
  generateMarketNote,
  generateMarketNoteWithWebSearch,
  generatePropertyAnalysisWithWebSearch,
  type MarketNoteInput,
  type MarketNoteState,
} from "../market-note-actions";
import { buildPropertyNoteInput } from "../property-note-builder";
import { AiResponseCard } from "./ai-response-card";
import type { PropertyCardData } from "./property-card";

type Mode = "internal" | "web" | "property";

export type AiMarketAnalysisPanelProps = {
  marketInput: MarketNoteInput;
  /** All tracked properties (business + private). Property-research mode
   *  uses this list to populate the property selector. */
  propertyCards: PropertyCardData[];
};

export function AiMarketAnalysisPanel({
  marketInput,
  propertyCards,
}: AiMarketAnalysisPanelProps) {
  const [mode, setMode] = useState<Mode>("internal");
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>(
    propertyCards.find((c) => !c.property.isPrivate)?.property.id ??
      propertyCards[0]?.property.id ??
      ""
  );
  const [state, setState] = useState<MarketNoteState | null>(null);
  const [pending, startTransition] = useTransition();

  const selected = useMemo(
    () => propertyCards.find((c) => c.property.id === selectedPropertyId),
    [propertyCards, selectedPropertyId]
  );

  const run = () => {
    setState(null);
    startTransition(async () => {
      let result: MarketNoteState;
      if (mode === "internal") {
        result = await generateMarketNote(marketInput);
      } else if (mode === "web") {
        result = await generateMarketNoteWithWebSearch(marketInput);
      } else {
        if (!selected) {
          setState({
            ok: false,
            message: "Select a property to research.",
            modeLabel: "Property Research",
          });
          return;
        }
        const input = buildPropertyNoteInput(selected);
        result = await generatePropertyAnalysisWithWebSearch(input);
      }
      setState(result);
    });
  };

  const ctaLabel =
    mode === "internal"
      ? "Generate internal summary"
      : mode === "web"
      ? "Research market with web"
      : "Research selected property";
  const helper =
    mode === "web" || mode === "property"
      ? "Web research looks for external corroboration, conflicts, and missing context beyond the dashboard data."
      : mode === "internal"
      ? "Interprets what is already on the dashboard. No web search."
      : null;

  return (
    <section
      aria-labelledby="ai-market-analysis-heading"
      className="overflow-hidden border"
      style={{
        background: "#FBF8F3",
        borderColor: "#E5DDD0",
        borderRadius: 16,
        boxShadow:
          "0 1px 2px rgba(15,23,42,0.06), 0 8px 24px rgba(15,23,42,0.08)",
        color: "#1F2937",
      }}
    >
      <header
        className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-start sm:justify-between"
        style={{
          background: "linear-gradient(180deg, #FFFEF9 0%, #FBF8F3 100%)",
          borderBottom: "1px solid #E5DDD0",
        }}
      >
        <div className="flex items-start gap-3 min-w-0">
          <span
            aria-hidden
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xl font-semibold"
            style={{
              background: "#1F2937",
              color: "#FBF8F3",
              fontFamily: "serif",
            }}
          >
            Ψ
          </span>
          <div className="min-w-0">
            <h2
              id="ai-market-analysis-heading"
              className="font-display text-[18px] font-semibold leading-tight"
              style={{ color: "#0F172A" }}
            >
              Market Intelligence Assistant
            </h2>
            <p
              className="mt-0.5 text-[12.5px] leading-snug"
              style={{ color: "#475569" }}
            >
              Researches external context, source conflicts, and next checks
              beyond the provider dashboard.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span
            className="inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold"
            style={{
              background: "#FFFFFF",
              borderColor: "#E5DDD0",
              color: "#475569",
            }}
          >
            Server-only · non-autonomous
          </span>
        </div>
      </header>

      <div className="flex flex-col gap-4 px-5 py-4">
        <ModeSegmented mode={mode} onChange={setMode} />

        {mode === "property" ? (
          <PropertyPicker
            propertyCards={propertyCards}
            value={selectedPropertyId}
            onChange={setSelectedPropertyId}
          />
        ) : null}

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={pending || (mode === "property" && !selected)}
            onClick={run}
            className="inline-flex min-h-[44px] items-center justify-center rounded-full px-4 py-2 text-[13px] font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
            style={{
              background: "#2563EB",
              color: "#FFFFFF",
              boxShadow: "0 1px 2px rgba(37,99,235,0.25)",
              outlineColor: "#2563EB",
            }}
          >
            {pending ? "Generating…" : ctaLabel}
          </button>
          {helper ? (
            <p className="text-[11.5px]" style={{ color: "#6B7280" }}>
              {helper}
            </p>
          ) : null}
        </div>

        {state ? (
          <AiResponseCard state={state} variant="light" />
        ) : (
          <EmptyHint />
        )}
      </div>
    </section>
  );
}

// =============================================================
// Mode segmented control
// =============================================================

function ModeSegmented({
  mode,
  onChange,
}: {
  mode: Mode;
  onChange: (mode: Mode) => void;
}) {
  return (
    <div
      role="tablist"
      aria-label="AI mode"
      className="inline-flex w-full max-w-full overflow-x-auto rounded-full border p-1"
      style={{ background: "#FFFFFF", borderColor: "#E5DDD0" }}
    >
      <SegmentButton
        active={mode === "internal"}
        onClick={() => onChange("internal")}
        label="Internal Summary"
      />
      <SegmentButton
        active={mode === "web"}
        onClick={() => onChange("web")}
        label="Web Research"
      />
      <SegmentButton
        active={mode === "property"}
        onClick={() => onChange("property")}
        label="Property Research"
      />
    </div>
  );
}

function SegmentButton({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className="inline-flex min-h-[36px] flex-1 items-center justify-center whitespace-nowrap rounded-full px-3 py-1.5 text-[12.5px] font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2"
      style={{
        background: active ? "#1F2937" : "transparent",
        color: active ? "#FBF8F3" : "#475569",
        outlineColor: "#2563EB",
      }}
    >
      {label}
    </button>
  );
}

// =============================================================
// Property picker (visible only in Property Research mode)
// =============================================================

function PropertyPicker({
  propertyCards,
  value,
  onChange,
}: {
  propertyCards: PropertyCardData[];
  value: string;
  onChange: (id: string) => void;
}) {
  const business = propertyCards.filter((c) => !c.property.isPrivate);
  const privateRefs = propertyCards.filter((c) => c.property.isPrivate);

  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor="ai-property-picker"
        className="text-[11.5px] font-semibold uppercase tracking-wide"
        style={{ color: "#6B7280" }}
      >
        Research property
      </label>
      <select
        id="ai-property-picker"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="min-h-[44px] rounded-full border bg-white px-4 py-2 text-[13px] font-medium focus-visible:outline-2 focus-visible:outline-offset-2"
        style={{
          borderColor: "#E5DDD0",
          color: "#1F2937",
          outlineColor: "#2563EB",
        }}
      >
        {business.length > 0 ? (
          <optgroup label="Business">
            {business.map((c) => (
              <option key={c.property.id} value={c.property.id}>
                {c.property.address} — {c.property.city}, {c.property.state}{" "}
                {c.property.zip ?? ""}
              </option>
            ))}
          </optgroup>
        ) : null}
        {privateRefs.length > 0 ? (
          <optgroup label="Private / Reference">
            {privateRefs.map((c) => (
              <option key={c.property.id} value={c.property.id}>
                {c.property.address} (reference only)
              </option>
            ))}
          </optgroup>
        ) : null}
      </select>
    </div>
  );
}

function EmptyHint() {
  return (
    <div
      className="rounded-xl border border-dashed px-4 py-4 text-[12.5px] leading-relaxed"
      style={{
        background: "#FFFFFF",
        borderColor: "#E5DDD0",
        color: "#475569",
      }}
    >
      <p>
        Pick a mode and run. The note appears here and will include an
        <strong className="px-1" style={{ color: "#0F172A" }}>
          Internal
        </strong>
        or
        <strong className="px-1" style={{ color: "#0F172A" }}>
          Web Research
        </strong>
        badge so you know where the analysis came from.
      </p>
      <p className="mt-1.5" style={{ color: "#6B7280" }}>
        AI never refreshes providers or writes to the database, and never sees
        API keys.
      </p>
    </div>
  );
}
