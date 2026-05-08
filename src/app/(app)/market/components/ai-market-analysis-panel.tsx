"use client";

/**
 * Ψ Market Intelligence Assistant
 *
 * Light-surface AI research panel that sits above the property cards.
 *
 * Provider:
 *   • OpenAI (default)
 *   • Grok / xAI (optional, only shown when XAI_API_KEY is configured server-side)
 *
 * Mode:
 *   • Internal Summary  — interprets what is already on the dashboard.
 *   • Web Research      — finds NEW external context, conflicts, next checks.
 *   • Property Research — same, scoped to one selected property.
 *
 * UX rules baked in:
 *   - The output card supports Minimize and Clear, so users do not have
 *     to scroll past long AI answers to reach property cards on mobile.
 *   - Disclaimers are calm: one short footer line, not flashing warnings.
 *   - API keys are never sent to the client; the parent page tells us
 *     boolean availability for each provider.
 *   - Both providers wire all three modes: OpenAI uses the Responses API
 *     with `web_search`; xAI uses the same Responses API shape against
 *     its OpenAI-compatible base URL. Source extraction normalizes both
 *     into the AiSource shape used by the response card.
 */

import { useMemo, useState, useTransition } from "react";
import {
  generateMarketNote,
  generateMarketNoteWithWebSearch,
  generatePropertyAnalysisWithWebSearch,
  type AiProvider,
  type MarketNoteInput,
  type MarketNoteState,
} from "../market-note-actions";
import { buildPropertyNoteInput } from "../property-note-builder";
import { AiResponseCard } from "./ai-response-card";
import type { PropertyCardData } from "./property-card";

type Mode = "internal" | "web" | "property";

export type AiMarketAnalysisPanelProps = {
  marketInput: MarketNoteInput;
  /** Tracked properties (business + private). The Property Research mode
   *  uses this list to populate the property selector. */
  propertyCards: PropertyCardData[];
  /** True when XAI_API_KEY is configured on the server. The page passes
   *  this in; the panel never reads server env directly. */
  xaiAvailable: boolean;
};

export function AiMarketAnalysisPanel({
  marketInput,
  propertyCards,
  xaiAvailable,
}: AiMarketAnalysisPanelProps) {
  const [provider, setProvider] = useState<AiProvider>("openai");
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
    // Capture the mode + provider at request time so the rendered badges
    // always reflect what the user clicked, even if a future server-side
    // label drifts. Prevents "Web research selected, output reads
    // Internal summary" mismatches.
    const requestedMode = mode;
    const requestedProvider = provider;
    const requestedModeLabel: "Internal summary" | "Web research" | "Property research" =
      requestedMode === "internal"
        ? "Internal summary"
        : requestedMode === "web"
        ? "Web research"
        : "Property research";
    const requestedProviderLabel: "OpenAI" | "Grok" =
      requestedProvider === "xai" ? "Grok" : "OpenAI";

    startTransition(async () => {
      let result: MarketNoteState;
      if (requestedMode === "internal") {
        result = await generateMarketNote(marketInput, requestedProvider);
      } else if (requestedMode === "web") {
        result = await generateMarketNoteWithWebSearch(
          marketInput,
          requestedProvider
        );
      } else {
        if (!selected) {
          setState({
            ok: false,
            message: "Select a property to research.",
            modeLabel: requestedModeLabel,
            providerLabel: requestedProviderLabel,
          });
          return;
        }
        const input = buildPropertyNoteInput(selected);
        result = await generatePropertyAnalysisWithWebSearch(
          input,
          requestedProvider
        );
      }
      setState({
        ...result,
        modeLabel: requestedModeLabel,
        providerLabel: requestedProviderLabel,
      });
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
      : "Interprets what is already on the dashboard. No web search.";

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
        className="flex flex-col gap-2 px-4 py-4 sm:flex-row sm:items-start sm:justify-between sm:px-5"
        style={{
          background: "linear-gradient(180deg, #FFFEF9 0%, #FBF8F3 100%)",
          borderBottom: "1px solid #E5DDD0",
        }}
      >
        <div className="flex min-w-0 items-start gap-3">
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
              className="mt-0.5 text-[12.5px] leading-snug [overflow-wrap:anywhere]"
              style={{ color: "#475569" }}
            >
              Finds external context, conflicts, and next checks beyond the
              provider dashboard.
            </p>
          </div>
        </div>
      </header>

      <div className="flex flex-col gap-3 px-4 py-4 sm:px-5">
        <ProviderSegmented
          provider={provider}
          onChange={setProvider}
          xaiAvailable={xaiAvailable}
        />

        <ModeSegmented mode={mode} onChange={setMode} />

        {mode === "property" ? (
          <PropertyPicker
            propertyCards={propertyCards}
            value={selectedPropertyId}
            onChange={setSelectedPropertyId}
          />
        ) : null}

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
          <button
            type="button"
            disabled={pending || (mode === "property" && !selected)}
            onClick={run}
            className="inline-flex min-h-[44px] w-full items-center justify-center rounded-full px-4 py-2 text-[13px] font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
            style={{
              background: "#2563EB",
              color: "#FFFFFF",
              boxShadow: "0 1px 2px rgba(37,99,235,0.25)",
              outlineColor: "#2563EB",
            }}
          >
            {pending ? "Generating…" : ctaLabel}
          </button>
          <p
            className="text-[11.5px] leading-snug [overflow-wrap:anywhere]"
            style={{ color: "#6B7280" }}
          >
            {helper}
          </p>
        </div>

        {state ? (
          <AiResponseCard
            state={state}
            variant="light"
            onClear={() => setState(null)}
          />
        ) : (
          <EmptyHint />
        )}

        <p className="text-[11px]" style={{ color: "#9CA3AF" }}>
          Research mode uses configured AI providers only when you click
          Generate.
        </p>
      </div>
    </section>
  );
}

// =============================================================
// Provider segmented control (OpenAI / Grok)
// =============================================================

function ProviderSegmented({
  provider,
  onChange,
  xaiAvailable,
}: {
  provider: AiProvider;
  onChange: (p: AiProvider) => void;
  xaiAvailable: boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span
        className="text-[11px] font-semibold uppercase tracking-wider"
        style={{ color: "#6B7280" }}
      >
        AI provider
      </span>
      <div
        role="tablist"
        aria-label="AI provider"
        className="inline-flex w-full max-w-full overflow-x-auto rounded-full border p-1"
        style={{ background: "#FFFFFF", borderColor: "#E5DDD0" }}
      >
        <ProviderButton
          active={provider === "openai"}
          onClick={() => onChange("openai")}
          label="OpenAI"
          icon={
            <ProviderIcon
              src={
                provider === "openai"
                  ? "/icons/workspace/openai-icon-white.svg"
                  : "/icons/workspace/openai-icon-black.svg"
              }
            />
          }
        />
        <ProviderButton
          active={provider === "xai"}
          onClick={() => xaiAvailable && onChange("xai")}
          label="Grok"
          icon={
            <ProviderIcon
              src={
                provider === "xai"
                  ? "/icons/workspace/xai-icon-white.svg"
                  : "/icons/workspace/xai-icon-black.svg"
              }
            />
          }
          disabled={!xaiAvailable}
          tooltip={xaiAvailable ? undefined : "xAI API key not configured."}
        />
      </div>
    </div>
  );
}

function ProviderIcon({ src }: { src: string }) {
  return (
    <span
      aria-hidden
      className="inline-flex h-4 w-4 shrink-0 items-center justify-center"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" width={14} height={14} />
    </span>
  );
}

function ProviderButton({
  active,
  onClick,
  label,
  icon,
  disabled,
  tooltip,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  icon?: React.ReactNode;
  disabled?: boolean;
  tooltip?: string;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      disabled={disabled}
      title={tooltip}
      onClick={onClick}
      className="inline-flex min-h-[36px] flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-[12.5px] font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
      style={{
        background: active ? "#1F2937" : "transparent",
        color: active ? "#FBF8F3" : "#475569",
        outlineColor: "#2563EB",
      }}
    >
      {icon}
      {label}
    </button>
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
    <div className="flex flex-col gap-1.5">
      <span
        className="text-[11px] font-semibold uppercase tracking-wider"
        style={{ color: "#6B7280" }}
      >
        Mode
      </span>
      <div
        role="tablist"
        aria-label="AI mode"
        className="inline-flex w-full max-w-full overflow-x-auto rounded-full border p-1"
        style={{ background: "#FFFFFF", borderColor: "#E5DDD0" }}
      >
        <SegmentButton
          active={mode === "internal"}
          onClick={() => onChange("internal")}
          label="Internal summary"
        />
        <SegmentButton
          active={mode === "web"}
          onClick={() => onChange("web")}
          label="Web research"
        />
        <SegmentButton
          active={mode === "property"}
          onClick={() => onChange("property")}
          label="Property research"
        />
      </div>
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
// Property picker
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
        className="text-[11px] font-semibold uppercase tracking-wider"
        style={{ color: "#6B7280" }}
      >
        Research property
      </label>
      <select
        id="ai-property-picker"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="min-h-[44px] w-full rounded-full border bg-white px-4 py-2 text-[13px] font-medium focus-visible:outline-2 focus-visible:outline-offset-2"
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
        Pick a provider and mode, then run. The note appears here with a small
        provider and mode badge so you know where the analysis came from.
      </p>
    </div>
  );
}
