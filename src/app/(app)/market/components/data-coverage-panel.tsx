export type CoverageStatus = "Connected" | "Missing" | "Planned" | "Optional";

export type CoverageRow = {
  name: string;
  status: CoverageStatus;
  detail: string;
};

export type RoadmapRow = {
  priority: number;
  name: string;
  detail: string;
};

export function DataCoveragePanel({
  rows,
  roadmap,
}: {
  rows: CoverageRow[];
  roadmap: RoadmapRow[];
}) {
  return (
    <section className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
      <div className="border border-[var(--market-border)] bg-[var(--market-surface)]">
        <header className="border-b border-[var(--market-border)] px-4 py-3">
          <h2 className="font-display text-base font-semibold text-[var(--market-text)]">
            Data Coverage
          </h2>
          <p className="mt-0.5 text-xs text-[var(--market-text-muted)]">
            Provider and dataset availability. This is informational only.
          </p>
        </header>
        <ul className="grid grid-cols-1 divide-y divide-[var(--market-border)] sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-3">
          {rows.map((row) => (
            <li key={row.name} className="min-w-0 px-4 py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate font-display text-sm font-semibold text-[var(--market-text)]">
                    {row.name}
                  </div>
                  <div className="mt-0.5 text-[11px] text-[var(--market-text-muted)]">
                    {row.detail}
                  </div>
                </div>
                <CoverageBadge status={row.status} />
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="border border-[var(--market-border)] bg-[var(--market-surface)]">
        <header className="border-b border-[var(--market-border)] px-4 py-3">
          <h2 className="font-display text-base font-semibold text-[var(--market-text)]">
            Next Data Integrations
          </h2>
          <p className="mt-0.5 text-xs text-[var(--market-text-muted)]">
            Roadmap only. No APIs are implemented here.
          </p>
        </header>
        <ol className="flex flex-col divide-y divide-[var(--market-border)]">
          {roadmap.map((row) => (
            <li key={row.name} className="grid grid-cols-[auto_minmax(0,1fr)] gap-3 px-4 py-3">
              <span className="font-data text-sm font-semibold text-[var(--market-cyan)]">
                {row.priority}
              </span>
              <div className="min-w-0">
                <div className="font-display text-sm font-semibold text-[var(--market-text)]">
                  {row.name}
                </div>
                <div className="mt-0.5 text-[11px] text-[var(--market-text-muted)]">
                  {row.detail}
                </div>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function CoverageBadge({ status }: { status: CoverageStatus }) {
  const color =
    status === "Connected"
      ? "var(--semantic-success)"
      : status === "Missing"
      ? "var(--market-amber)"
      : status === "Planned"
      ? "var(--market-cyan)"
      : "var(--market-text-muted)";

  return (
    <span
      className="shrink-0 border px-1.5 py-0.5 text-[11px] font-semibold"
      style={{
        color,
        borderColor: "var(--market-border)",
        background: "var(--market-surface-raised)",
      }}
    >
      {status}
    </span>
  );
}
