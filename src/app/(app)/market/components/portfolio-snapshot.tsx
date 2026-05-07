/**
 * Portfolio snapshot — five metric cards across the top of the workspace.
 */

import type { ReactNode } from "react";

export type PortfolioSnapshotProps = {
  businessAssets: number;
  houseValue: string;
  houseValueSub: string;
  marketRent: string;
  marketRentSub: string;
  grossYield: string;
  grossYieldSub: string;
  freshness: string;
  freshnessSub: string;
};

export function PortfolioSnapshot(props: PortfolioSnapshotProps) {
  return (
    <section
      aria-label="Portfolio snapshot"
      className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5"
    >
      <SnapshotCard label="Business assets" value={props.businessAssets} sub="Private reference excluded" />
      <SnapshotCard
        label="House market value"
        value={props.houseValue}
        sub={props.houseValueSub}
        emphasized
      />
      <SnapshotCard
        label="Monthly market rent"
        value={props.marketRent}
        sub={props.marketRentSub}
        emphasized
      />
      <SnapshotCard
        label="Gross rent yield"
        value={props.grossYield}
        sub={props.grossYieldSub}
      />
      <SnapshotCard
        label="Data freshness"
        value={props.freshness}
        sub={props.freshnessSub}
      />
    </section>
  );
}

function SnapshotCard({
  label,
  value,
  sub,
  emphasized = false,
}: {
  label: string;
  value: ReactNode;
  sub?: string;
  emphasized?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1 border border-[var(--market-border)] bg-[var(--market-surface)] p-3 sm:p-4">
      <div className="text-[11px] uppercase tracking-wide text-[var(--market-text-muted)]">
        {label}
      </div>
      <div
        className={`font-data tabular-nums leading-tight text-[var(--market-text)] ${
          emphasized ? "text-2xl font-semibold sm:text-[28px]" : "text-xl font-semibold"
        }`}
      >
        {value}
      </div>
      {sub ? (
        <div className="text-[11px] text-[var(--market-text-secondary)]">
          {sub}
        </div>
      ) : null}
    </div>
  );
}
