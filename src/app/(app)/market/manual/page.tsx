import Link from "next/link";
import type { MarketManualEntry } from "@prisma/client";
import { PageHeader } from "@/components/page-header";
import { SectionPanel } from "@/components/section-panel";
import {
  formatDecimalCurrency,
  formatDecimalRent,
  getManualEntry,
  getManualProperty,
  manualProperties,
} from "@/lib/market-manual";
import { ManualEntryForm } from "./manual-form";

export const dynamic = "force-dynamic";

type SearchParams = {
  propertyId?: string;
  saved?: string;
};

export default async function ManualMarketPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const requestedId = sp.propertyId ?? null;
  const property = requestedId ? getManualProperty(requestedId) : null;
  const saved = sp.saved === "1";

  let dbAvailable = true;
  let entries: MarketManualEntry[] = [];
  let entry: MarketManualEntry | null = null;

  try {
    if (property) {
      entry = await getManualEntry(property.propertyId);
    } else {
      // Selector view: list every property + a quick preview of saved
      // values when an entry exists.
      const all = await Promise.all(
        manualProperties.map((p) => getManualEntry(p.propertyId))
      );
      entries = all.filter((e): e is MarketManualEntry => e !== null);
    }
  } catch (err) {
    dbAvailable = false;
    console.error("[/market/manual] database unavailable:", err);
  }

  return (
    <div className="market-shell -mx-4 -my-6 flex flex-col gap-6 px-4 py-6 sm:-mx-6 sm:-my-8 sm:px-6 sm:py-8 lg:-mx-8 lg:-my-10 lg:px-8 lg:py-10">
      <PageHeader
        eyebrow="Market Tracker"
        title={property ? "Edit manual data" : "Manual data"}
        description={
          property
            ? `Editing manual entry for ${property.propertyLabel}.`
            : "Capture manual values for each tracked property. These appear on /market until live providers are connected."
        }
        secondaryAction={
          <Link
            href="/market"
            className="inline-flex min-h-[40px] items-center justify-center rounded-[var(--radius-md)] border border-[var(--market-border)] bg-transparent px-3 py-2 text-sm font-medium text-[var(--market-text)] hover:border-[var(--market-border-strong)]"
          >
            ← Market Tracker
          </Link>
        }
      />

      {!dbAvailable ? (
        <SectionPanel
          title="Database not reachable"
          description="The manual entries database isn't available in this environment yet."
        >
          <p className="text-sm text-[var(--market-text-muted)]">
            Set <code>DATABASE_URL</code> and run <code>npm run db:migrate</code>.
          </p>
        </SectionPanel>
      ) : property ? (
        <SectionPanel
          title={property.propertyLabel}
          description={
            property.isPrivateReference
              ? "Private / Reference Only — manual data here is excluded from business portfolio KPIs."
              : "Manual values feed /market until a live provider is wired in."
          }
        >
          <ManualEntryForm
            property={property}
            initial={entry}
            saved={saved}
          />
        </SectionPanel>
      ) : (
        <SectionPanel
          title="Tracked properties"
          description="Pick a property to add or edit its manual entry."
          padded={false}
        >
          <ul className="flex flex-col divide-y divide-[var(--market-border)]">
            {manualProperties.map((p) => {
              const saved = entries.find((e) => e.propertyId === p.propertyId);
              return (
                <li
                  key={p.propertyId}
                  className="flex flex-col gap-1 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
                >
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-[var(--market-text)]">
                      {p.propertyLabel}
                    </span>
                    <span className="text-xs text-[var(--market-text-muted)]">
                      {p.isPrivateReference
                        ? "Private / Reference Only · excluded from business KPIs"
                        : "Business portfolio"}
                    </span>
                    {saved ? (
                      <span className="mt-1 text-[11px] text-[var(--market-text-secondary)]">
                        <span className="font-mono tabular-nums">
                          {formatDecimalCurrency(saved.estimatedValue)}
                        </span>{" "}
                        value · {""}
                        <span className="font-mono tabular-nums">
                          {formatDecimalRent(saved.estimatedRent)}
                        </span>{" "}
                        rent
                      </span>
                    ) : (
                      <span className="mt-1 text-[11px] italic text-[var(--market-text-muted)]">
                        No manual entry yet.
                      </span>
                    )}
                  </div>
                  <Link
                    href={`/market/manual?propertyId=${p.propertyId}`}
                    className="inline-flex min-h-[36px] items-center justify-center rounded-[var(--radius-md)] border border-[var(--market-blue)] bg-[var(--market-blue)] px-3 py-1.5 text-xs font-semibold text-[var(--market-text)] hover:bg-[var(--market-cyan)]"
                  >
                    {saved ? "Edit" : "Add"}
                  </Link>
                </li>
              );
            })}
          </ul>
        </SectionPanel>
      )}
    </div>
  );
}
