import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { SectionPanel } from "@/components/section-panel";
import { statusTokens } from "@/lib/status";

type PropertyRow = {
  address: string;
  status: string;
  description: string;
  tone: keyof typeof statusTokens;
  href?: string;
  needsVerification?: boolean;
};

const businessProperties: PropertyRow[] = [
  {
    address: "51 Loudonwood E",
    status: "Active Rental",
    description: "Cash-flowing investment property.",
    tone: "success",
  },
  {
    address: "16 Momrow Ct",
    status: "Active Rental",
    description: "Cash-flowing investment property.",
    tone: "success",
  },
  {
    address: "322 Osborne Rd",
    status: "Active Renovation Project",
    description:
      "Renovation in bidding & procurement. ZIP and official facts need verification.",
    tone: "review",
    href: "/renovation",
    needsVerification: true,
  },
];

const privateProperty: PropertyRow = {
  address: "14 MacAffer Dr",
  status: "Private / Reference Only",
  description:
    "Primary residence outside the business structure. Tracked for reference — excluded from business portfolio KPIs.",
  tone: "neutral",
};

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

function PropertyCard({ property }: { property: PropertyRow }) {
  return (
    <article className="flex flex-col gap-2 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-base font-semibold text-[var(--color-text)]">
          {property.address}
        </h3>
        <ToneTag label={property.status} tone={property.tone} />
      </div>
      <p className="text-sm text-[var(--color-text-muted)]">
        {property.description}
      </p>
      <div className="flex flex-wrap items-center gap-3 text-xs">
        {property.needsVerification ? (
          <ToneTag label="Needs verification" tone="warning" />
        ) : null}
        {property.href ? (
          <Link
            href={property.href}
            className="font-semibold text-[var(--color-primary)] hover:underline"
          >
            Open workspace
          </Link>
        ) : null}
      </div>
    </article>
  );
}

export default function PropertiesPage() {
  return (
    <>
      <PageHeader
        eyebrow="Properties"
        title="Property records"
        description="Open individual property records, documents, tasks, and financial details."
      />

      <SectionPanel
        title="Business Portfolio Properties"
        description="Held under J.G. Walsh & Co. Holding Company LLC."
      >
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {businessProperties.map((p) => (
            <PropertyCard key={p.address} property={p} />
          ))}
        </div>
      </SectionPanel>

      <SectionPanel
        title="Private / Reference Only"
        description="Excluded from business portfolio KPIs."
      >
        <div className="rounded-[var(--radius-md)] border border-dashed border-[var(--color-border)] bg-[var(--color-surface-soft)] p-1">
          <PropertyCard property={privateProperty} />
        </div>
      </SectionPanel>
    </>
  );
}
