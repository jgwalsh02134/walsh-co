"use client";

import { useActionState } from "react";
import type { MarketManualEntry } from "@prisma/client";
import {
  CONFIDENCE_LEVELS,
  confidenceLabel,
  decimalToNumber,
  type ManualProperty,
} from "@/lib/market-manual";
import { saveManualEntry, type ManualSaveState } from "./actions";

const labelClass =
  "text-[11px] font-semibold uppercase tracking-wide text-[var(--market-text-muted)]";
const helperClass = "text-[11px] text-[var(--market-text-muted)]";
const inputBase =
  "w-full rounded-[var(--radius-md)] border border-[var(--market-border)] bg-[var(--market-surface)] px-3 py-2 text-sm text-[var(--market-text)] placeholder:text-[var(--market-text-muted)] focus:border-[var(--market-cyan)] focus:outline-none focus:ring-2 focus:ring-[var(--market-cyan)]/30";

const moneyPlaceholder = "e.g. 250,000 or $250000";

function moneyDefault(
  value: MarketManualEntry[keyof MarketManualEntry] | null | undefined
): string {
  const n = decimalToNumber(value as never);
  return n == null ? "" : String(n);
}

function dateInputValue(d: Date | null | undefined): string {
  if (!d) return "";
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return "";
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  const day = String(dt.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function extractFirstNumber(text: string): number | null {
  const match = text.match(/\$?([\d,.]+)([kKmM])?/);
  if (!match) return null;
  let num = parseFloat(match[1].replace(/,/g, ""));
  if (match[2]) {
    if (match[2].toLowerCase() === "k") num *= 1000;
    if (match[2].toLowerCase() === "m") num *= 1_000_000;
  }
  return Number.isFinite(num) ? Math.round(num) : null;
}

export function ManualEntryForm({
  property,
  initial,
  saved,
  aiNote,
}: {
  property: ManualProperty;
  initial: MarketManualEntry | null;
  saved: boolean;
  aiNote?: string | null;
}) {
  const [state, action, pending] = useActionState<ManualSaveState | null, FormData>(
    saveManualEntry,
    null
  );

  const showSavedBanner = saved && state?.status !== "error";

  return (
    <form action={action} className="flex flex-col gap-6">
      <input type="hidden" name="propertyId" value={property.propertyId} />

      {showSavedBanner ? (
        <div
          role="status"
          className="rounded-[var(--radius-md)] border px-3 py-2 text-sm"
          style={{
            background: "var(--semantic-success-bg)",
            borderColor: "var(--semantic-success-border)",
            color: "var(--semantic-success)",
          }}
        >
          Saved.
        </div>
      ) : null}

      {aiNote && (
        <div className="rounded-[var(--radius-md)] border border-[var(--market-cyan)] bg-[var(--market-surface)] p-3 text-sm">
          <div className="font-semibold text-[var(--market-cyan)] mb-1">AI Research Suggestion</div>
          <p className="text-[var(--market-text-secondary)] mb-2">{aiNote}</p>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                const num = extractFirstNumber(aiNote);
                if (num) {
                  // Set value on the purchaseBasis input if it exists
                  const input = document.querySelector('input[name="purchaseBasis"]') as HTMLInputElement;
                  if (input) input.value = num.toString();
                }
                navigator.clipboard.writeText(aiNote);
              }}
              className="text-xs font-medium px-2 py-1 rounded border border-[var(--market-cyan)] text-[var(--market-cyan)] hover:bg-[var(--market-cyan)] hover:text-white transition"
            >
              Apply to Purchase Basis + Copy
            </button>

            <button
              type="button"
              onClick={() => {
                const num = extractFirstNumber(aiNote);
                if (num) {
                  const assessed = document.querySelector('input[name="assessedValue"]') as HTMLInputElement;
                  const taxes = document.querySelector('input[name="annualTaxes"]') as HTMLInputElement;
                  if (assessed) assessed.value = num.toString();
                  if (taxes) taxes.value = Math.round(num * 0.012).toString(); // rough 1.2% tax guess
                }
                navigator.clipboard.writeText(aiNote);
              }}
              className="text-xs font-medium px-2 py-1 rounded border border-[var(--market-cyan)] text-[var(--market-cyan)] hover:bg-[var(--market-cyan)] hover:text-white transition"
            >
              Apply to Tax/Assessment + Copy
            </button>
          </div>
        </div>
      )}

      {state?.status === "error" ? (
        <div
          role="alert"
          className="rounded-[var(--radius-md)] border px-3 py-2 text-sm"
          style={{
            background: "var(--semantic-error-bg)",
            borderColor: "var(--semantic-error-border)",
            color: "var(--semantic-error)",
          }}
        >
          {state.message ?? "Could not save entry."}
        </div>
      ) : null}

      <Section title="Estimates">
        <Grid>
          <Field
            label="Estimated value"
            helper="Manual valuation. Em-dash on /market when blank."
          >
            <input
              name="estimatedValue"
              defaultValue={moneyDefault(initial?.estimatedValue)}
              placeholder={moneyPlaceholder}
              inputMode="decimal"
              className={inputBase}
            />
          </Field>
          <Field label="Estimated rent" helper="Per month.">
            <input
              name="estimatedRent"
              defaultValue={moneyDefault(initial?.estimatedRent)}
              placeholder="e.g. 2,400"
              inputMode="decimal"
              className={inputBase}
            />
          </Field>
          <Field label="Target rent" helper="Per month.">
            <input
              name="targetRent"
              defaultValue={moneyDefault(initial?.targetRent)}
              placeholder="e.g. 2,650"
              inputMode="decimal"
              className={inputBase}
            />
          </Field>
          <Field 
            label="Purchase basis" 
            helper="Original acquisition cost / basis. Critical for yield and gain calculations."
          >
            <input
              name="purchaseBasis"
              defaultValue={moneyDefault(initial?.purchaseBasis)}
              placeholder={moneyPlaceholder}
              inputMode="decimal"
              className={inputBase}
            />
          </Field>
        </Grid>
      </Section>

      <Section title="Tax & assessment">
        <Grid>
          <Field 
            label="Assessed value" 
            helper="Most recent assessed / appraised value from tax records or ATTOM."
          >
            <input
              name="assessedValue"
              defaultValue={moneyDefault(initial?.assessedValue)}
              placeholder={moneyPlaceholder}
              inputMode="decimal"
              className={inputBase}
            />
          </Field>
          <Field 
            label="Annual taxes" 
            helper="Current annual property tax bill. Important for net yield calculations."
          >
            <input
              name="annualTaxes"
              defaultValue={moneyDefault(initial?.annualTaxes)}
              placeholder="e.g. 7,200"
              inputMode="decimal"
              className={inputBase}
            />
          </Field>
        </Grid>
      </Section>

      <Section title="Renovation">
        <Grid>
          <Field
            label="Renovation budget"
            helper="Total budget. Use the renovation workspace for line items."
          >
            <input
              name="renovationBudget"
              defaultValue={moneyDefault(initial?.renovationBudget)}
              placeholder={moneyPlaceholder}
              inputMode="decimal"
              className={inputBase}
            />
          </Field>
        </Grid>
      </Section>

      <Section title="Source attribution">
        <Grid>
          <Field
            label="Source"
            helper="Defaults to “Manual Internal”. Use a specific provider name once a real source is wired."
          >
            <input
              name="sourceName"
              defaultValue={initial?.sourceName ?? "Manual Internal"}
              className={inputBase}
            />
          </Field>
          <Field label="As-of date">
            <input
              type="date"
              name="asOfDate"
              defaultValue={dateInputValue(initial?.asOfDate)}
              className={inputBase}
            />
          </Field>
          <Field
            label="Confidence"
            helper="Subjective. UNKNOWN by default."
          >
            <select
              name="confidence"
              defaultValue={initial?.confidence ?? "UNKNOWN"}
              className={inputBase}
            >
              {CONFIDENCE_LEVELS.map((c) => (
                <option key={c} value={c}>
                  {confidenceLabel(c)}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Source note" helper="Where the number came from.">
            <textarea
              name="sourceNote"
              rows={3}
              defaultValue={initial?.sourceNote ?? ""}
              placeholder="e.g. RentCast quote 2026-04-15; broker call 2026-05-02."
              className={`${inputBase} min-h-[72px] leading-relaxed`}
            />
          </Field>
        </Grid>
      </Section>

      <footer className="flex flex-wrap items-center gap-2 border-t border-[var(--market-border)] pt-4">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex min-h-[40px] items-center justify-center rounded-[var(--radius-md)] border border-[var(--market-blue)] bg-[var(--market-blue)] px-4 py-2 text-sm font-semibold text-[var(--market-text)] hover:bg-[var(--market-cyan)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--market-cyan)] disabled:opacity-60"
        >
          {pending ? "Saving…" : "Save manual data"}
        </button>
        <a
          href="/market"
          className="inline-flex min-h-[40px] items-center justify-center rounded-[var(--radius-md)] border border-[var(--market-border)] bg-transparent px-4 py-2 text-sm font-medium text-[var(--market-text)] hover:border-[var(--market-border-strong)]"
        >
          Cancel
        </a>
      </footer>
    </form>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3">
      <h3 className="text-sm font-semibold text-[var(--market-text)]">
        {title}
      </h3>
      {children}
    </section>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{children}</div>;
}

function Field({
  label,
  helper,
  children,
}: {
  label: string;
  helper?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className={labelClass}>{label}</span>
      {children}
      {helper ? <span className={helperClass}>{helper}</span> : null}
    </label>
  );
}
