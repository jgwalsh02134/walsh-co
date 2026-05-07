/**
 * Compact FRED macro / rate context.
 *
 * Sits near the bottom of the workspace as flat, visible context — not
 * a collapsed dropdown. Trend context only; never used for per-property
 * valuation or rent.
 */

export type MacroSeriesObservation = {
  id: string;
  label: string;
  value: string;
  asOf: string;
};

export function MacroContextPanel({
  observations,
  asOf,
  empty,
}: {
  observations: MacroSeriesObservation[];
  asOf: string | null;
  empty?: string;
}) {
  return (
    <section
      aria-labelledby="macro-context-heading"
      className="flex flex-col border border-[var(--market-border)] bg-[var(--market-surface)]"
    >
      <header className="flex flex-wrap items-baseline justify-between gap-2 border-b border-[var(--market-border)] px-4 py-3">
        <h2
          id="macro-context-heading"
          className="font-display text-base font-semibold text-[var(--market-text)]"
        >
          Macro & rate context
        </h2>
        <span className="text-[11px] text-[var(--market-text-muted)]">
          FRED · {asOf ?? "no snapshot"}
        </span>
      </header>

      {observations.length === 0 ? (
        <p className="px-4 py-3 text-sm text-[var(--market-text-secondary)]">
          {empty ?? "Use Refresh FRED in the header to fetch the first snapshot."}
        </p>
      ) : (
        <ul className="grid grid-cols-2 gap-px bg-[var(--market-border)] sm:grid-cols-3 lg:grid-cols-5">
          {observations.map((o) => (
            <li
              key={o.id}
              className="flex flex-col gap-0.5 bg-[var(--market-surface)] px-3 py-2"
            >
              <span className="text-[11px] uppercase tracking-wide text-[var(--market-text-muted)]">
                {o.label}
              </span>
              <span className="font-data text-base font-semibold tabular-nums text-[var(--market-text)]">
                {o.value}
              </span>
              <span className="text-[11px] text-[var(--market-text-muted)]">
                {o.asOf}
              </span>
            </li>
          ))}
        </ul>
      )}
      <p className="border-t border-[var(--market-border)] px-4 py-2.5 text-[11px] text-[var(--market-text-muted)]">
        Trend context only — never used for per-property valuation.
      </p>
    </section>
  );
}
