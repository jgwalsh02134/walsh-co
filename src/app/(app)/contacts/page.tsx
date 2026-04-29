import { FilterPill, FilterPillRow } from "@/components/filter-pill";
import { ModuleCard } from "@/components/module-card";
import { PageHeader } from "@/components/page-header";
import { ResponsiveGrid } from "@/components/responsive-grid";
import { SearchBar } from "@/components/search-bar";
import { contacts, contactRoles } from "@/lib/mock-data";

function MailIcon() {
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.7} viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 7.5v9A1.5 1.5 0 0 0 4.5 18h15a1.5 1.5 0 0 0 1.5-1.5v-9M3 7.5 12 13l9-5.5M3 7.5A1.5 1.5 0 0 1 4.5 6h15A1.5 1.5 0 0 1 21 7.5" />
    </svg>
  );
}

function PhoneIcon() {
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.7} viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 4h3l2 5-2.5 1.5a11 11 0 0 0 6 6L15 14l5 2v3a2 2 0 0 1-2 2A15 15 0 0 1 3 6a2 2 0 0 1 2-2Z" />
    </svg>
  );
}

export default function ContactsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Network"
        title="Contacts"
        description="People and vendors connected to your workspace. No real integrations."
        primaryAction={
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-[var(--color-text-inverse)] transition-colors hover:bg-[var(--color-primary-hover)]"
          >
            Add contact
          </button>
        }
      />

      <div className="flex flex-col gap-[13px] lg:flex-row lg:items-center">
        <div className="lg:w-80">
          <SearchBar placeholder="Search contacts…" ariaLabel="Search contacts" />
        </div>
        <FilterPillRow>
          {contactRoles.map((label, idx) => (
            <FilterPill key={label} label={label} active={idx === 0} />
          ))}
        </FilterPillRow>
      </div>

      <ResponsiveGrid minItemWidth="sm" gap="lg">
        {contacts.map((contact) => {
          const initials = contact.name
            .split(" ")
            .map((s) => s[0])
            .join("")
            .slice(0, 2)
            .toUpperCase();
          return (
            <ModuleCard
              key={contact.id}
              title={contact.name}
              description={`${contact.role} • ${contact.organization}`}
              icon={<span className="text-sm font-semibold">{initials}</span>}
              footer={
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-xs font-medium text-[var(--color-text)] transition-colors hover:border-[var(--color-border-strong)]"
                  >
                    <MailIcon /> Email
                  </button>
                  <button
                    type="button"
                    className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-xs font-medium text-[var(--color-text)] transition-colors hover:border-[var(--color-border-strong)]"
                  >
                    <PhoneIcon /> Call
                  </button>
                </div>
              }
            >
              <dl className="flex flex-col gap-0.5 text-xs text-[var(--color-text-muted)]">
                <div className="flex items-center gap-2">
                  <MailIcon />
                  <dd>{contact.email}</dd>
                </div>
                <div className="flex items-center gap-2">
                  <PhoneIcon />
                  <dd>{contact.phone}</dd>
                </div>
              </dl>
            </ModuleCard>
          );
        })}
      </ResponsiveGrid>
    </>
  );
}
