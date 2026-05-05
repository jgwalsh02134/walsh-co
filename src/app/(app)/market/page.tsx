import { PageHeader } from "@/components/page-header";
import { SectionPanel } from "@/components/section-panel";
import { statusTokens } from "@/lib/status";

type Integration = {
  name: string;
  purpose: string;
};

const integrations: Integration[] = [
  { name: "ATTOM", purpose: "Property data, ownership, sales history" },
  { name: "RentCast", purpose: "Rent estimates and rental comparables" },
  {
    name: "HouseCanary",
    purpose: "Automated valuation and forecast models",
  },
  { name: "Google Maps / Mapbox", purpose: "Geocoding and neighborhood maps" },
  { name: "Census / FRED", purpose: "Demographic and macroeconomic indicators" },
  {
    name: "Climate / Hazard Data",
    purpose: "Flood, wildfire, and climate-risk overlays",
  },
];

function ToneTag({
  label,
  tone,
}: {
  label: string;
  tone: keyof typeof statusTokens;
}) {
  const t = statusTokens[tone];
  return (
    <span
      className="inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium"
      style={{ background: t.background, color: t.text, borderColor: t.border }}
    >
      {label}
    </span>
  );
}

const sections = [
  {
    title: "Market Overview",
    description:
      "Market summary across the properties tracked by the workspace.",
  },
  {
    title: "Property Value Estimates",
    description:
      "Automated valuations and how they compare to acquisition basis.",
  },
  {
    title: "Rent Estimates",
    description:
      "Rent ranges, vacancy assumptions, and current rent vs. market.",
  },
  {
    title: "Sales Comparables",
    description: "Recent sold properties relevant to portfolio properties.",
  },
  {
    title: "Rental Comparables",
    description: "Active and recently leased rentals in the same submarkets.",
  },
  {
    title: "Neighborhood Signals",
    description: "Demand, schools, walkability, and other locality factors.",
  },
  {
    title: "Forecasts",
    description: "Forward-looking value and rent projections.",
  },
  {
    title: "Tax / Assessment Watch",
    description:
      "Assessed values, tax bills, and reassessment history to monitor.",
  },
  {
    title: "Risk Indicators",
    description:
      "Climate, regulatory, and market-level risks that could affect value or rentability.",
  },
];

export default function MarketPage() {
  return (
    <>
      <PageHeader
        eyebrow="Market Tracker"
        title="Market intelligence"
        description="Track values, rent estimates, comps, market trends, and data sources. No external services are connected yet."
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {sections.map((s) => (
          <SectionPanel
            key={s.title}
            title={s.title}
            description={s.description}
          >
            <p className="text-sm text-[var(--color-text-muted)]">
              No data yet. This section will populate once a data source is
              connected.
            </p>
          </SectionPanel>
        ))}
      </div>

      <SectionPanel
        title="Data Sources"
        description="Integration placeholders. Nothing here calls an external service yet."
      >
        <ul className="flex flex-col divide-y divide-[var(--color-border)]">
          {integrations.map((i) => (
            <li
              key={i.name}
              className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
            >
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-[var(--color-text)]">
                  {i.name}
                </span>
                <span className="text-xs text-[var(--color-text-muted)]">
                  {i.purpose}
                </span>
              </div>
              <ToneTag label="Not connected" tone="neutral" />
            </li>
          ))}
        </ul>
      </SectionPanel>
    </>
  );
}
