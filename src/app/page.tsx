import Link from "next/link";
import { ActionCard } from "@/components/action-card";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { ProgressBar } from "@/components/progress-bar";
import { ResponsiveGrid } from "@/components/responsive-grid";
import { RiskBadge } from "@/components/risk-badge";
import { SectionPanel } from "@/components/section-panel";
import { StatCard } from "@/components/stat-card";
import { StatusBadge } from "@/components/status-badge";
import { Timeline, TimelineItem } from "@/components/timeline-item";
import {
  continueItems,
  dashboardStats,
  projects,
  recentActivity,
  riskItems,
  upcomingDeadlines,
} from "@/lib/mock-data";

export default function DashboardPage() {
  const featuredProject = projects.find((p) => p.priority === "high") ?? projects[0];

  return (
    <>
      <PageHeader
        eyebrow="Workspace"
        title="Dashboard"
        description="A calm overview of your portfolio. Generic placeholder data."
        primaryAction={
          <Link
            href="/tasks"
            className="inline-flex items-center gap-2 rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-[var(--color-text-inverse)] transition-colors hover:bg-[var(--color-primary-hover)]"
          >
            Review tasks
            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M13 5l7 7-7 7" />
            </svg>
          </Link>
        }
        secondaryAction={
          <Link
            href="/properties"
            className="inline-flex items-center gap-2 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-white)] px-4 py-2 text-sm font-medium text-[var(--color-text)] transition-colors hover:border-[var(--color-border-strong)]"
          >
            View properties
          </Link>
        }
      />

      <div className="grid grid-cols-1 gap-[13px] sm:grid-cols-2 xl:grid-cols-4">
        {dashboardStats.map((stat, idx) => (
          <StatCard
            key={stat.label}
            label={stat.label}
            value={stat.value}
            delta={stat.delta}
            emphasis={idx === 0}
          />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-[21px] lg:grid-cols-3">
        <div className="lg:col-span-2">
          <SectionPanel
            title="Priority actions"
            description="Short list, focused next steps."
            action={
              <Link
                href="/tasks"
                className="text-sm font-semibold text-[var(--color-primary)] hover:underline"
              >
                See all
              </Link>
            }
          >
            <ResponsiveGrid minItemWidth="md" gap="md">
              <ActionCard
                title="Confirm vendor quote"
                description="Roof and envelope refresh, awaiting approval."
                href="/projects"
                cta="Open project"
                emphasis
                meta="Due Apr 30 • Property One"
              />
              <ActionCard
                title="Upload latest survey"
                description="Survey draft missing for review."
                href="/documents"
                cta="Open documents"
                meta="Due May 02 • Property Three"
              />
              <ActionCard
                title="Review insurance gap"
                description="Coverage placeholder needs verification."
                href="/tasks"
                cta="Open task"
                meta="Due May 01 • Property Two"
              />
              <ActionCard
                title="Walkthrough notes"
                description="Add summary to recent visit."
                href="/properties"
                cta="Open property"
                meta="Property Six"
              />
            </ResponsiveGrid>
          </SectionPanel>
        </div>

        <div className="flex flex-col gap-[21px]">
          <SectionPanel title="Status summary" description="Across active workspaces.">
            <ul className="flex flex-col gap-2 text-sm">
              <li className="flex items-center justify-between">
                <span className="text-[var(--color-text-muted)]">Active</span>
                <StatusBadge status="active" />
              </li>
              <li className="flex items-center justify-between">
                <span className="text-[var(--color-text-muted)]">In progress</span>
                <StatusBadge status="in_progress" />
              </li>
              <li className="flex items-center justify-between">
                <span className="text-[var(--color-text-muted)]">In review</span>
                <StatusBadge status="review" />
              </li>
              <li className="flex items-center justify-between">
                <span className="text-[var(--color-text-muted)]">Needs verification</span>
                <StatusBadge status="needs_verification" />
              </li>
              <li className="flex items-center justify-between">
                <span className="text-[var(--color-text-muted)]">At risk</span>
                <StatusBadge status="risk" />
              </li>
            </ul>
          </SectionPanel>

          <SectionPanel title="Continue where you left off">
            <ul className="flex flex-col gap-2">
              {continueItems.map((item) => (
                <li key={item.id}>
                  <Link
                    href={item.href}
                    className="flex items-center justify-between gap-3 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-warm)] px-3 py-2.5 text-sm transition-colors hover:border-[var(--color-border-strong)]"
                  >
                    <span className="flex flex-col">
                      <span className="font-medium text-[var(--color-text)]">{item.label}</span>
                      <span className="text-xs text-[var(--color-text-muted)]">{item.context}</span>
                    </span>
                    <svg className="h-4 w-4 text-[var(--color-text-muted)]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 6l6 6-6 6" />
                    </svg>
                  </Link>
                </li>
              ))}
            </ul>
          </SectionPanel>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-[21px] lg:grid-cols-3">
        <div className="lg:col-span-2">
          <SectionPanel title="Recent activity" description="Calm, glanceable updates.">
            <Timeline>
              {recentActivity.map((item) => (
                <TimelineItem
                  key={item.id}
                  label={item.label}
                  context={item.context}
                  timestamp={item.timestamp}
                  tone={item.tone}
                />
              ))}
            </Timeline>
          </SectionPanel>
        </div>

        <div className="flex flex-col gap-[21px]">
          <SectionPanel title="Upcoming deadlines">
            <ul className="flex flex-col gap-2 text-sm">
              {upcomingDeadlines.map((item) => (
                <li
                  key={item.id}
                  className="flex items-start justify-between gap-3 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-warm)] px-3 py-2.5"
                >
                  <span className="flex flex-col">
                    <span className="font-medium text-[var(--color-text)]">{item.label}</span>
                    <span className="text-xs text-[var(--color-text-muted)]">{item.context}</span>
                  </span>
                  <span className="shrink-0 text-xs font-semibold text-[var(--color-text-muted)]">
                    {item.due}
                  </span>
                </li>
              ))}
            </ul>
          </SectionPanel>

          <SectionPanel
            title="Risk & attention"
            action={<RiskBadge severity="high" />}
          >
            {riskItems.length === 0 ? (
              <EmptyState
                variant="inline"
                title="Nothing to flag"
                description="No open risks across the workspace."
              />
            ) : (
              <ul className="flex flex-col gap-2 text-sm">
                {riskItems.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-start justify-between gap-3 border-b border-[var(--color-border)] pb-2 last:border-0 last:pb-0"
                  >
                    <span className="flex flex-col">
                      <span className="font-medium text-[var(--color-text)]">{item.label}</span>
                      <span className="text-xs text-[var(--color-text-muted)]">{item.context}</span>
                    </span>
                    <RiskBadge severity={item.severity} />
                  </li>
                ))}
              </ul>
            )}
          </SectionPanel>
        </div>
      </div>

      <SectionPanel
        title="Featured project"
        description="The current high-priority initiative."
        action={
          <Link
            href="/projects"
            className="text-sm font-semibold text-[var(--color-primary)] hover:underline"
          >
            View all projects
          </Link>
        }
      >
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex flex-col gap-1">
              <h3 className="font-display text-2xl text-[var(--color-text)]">
                {featuredProject.name}
              </h3>
              <p className="text-sm text-[var(--color-text-muted)]">
                {featuredProject.description}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge status={featuredProject.phase} />
            </div>
          </div>
          <ProgressBar value={featuredProject.progress} label={`Due ${featuredProject.dueDate}`} />
        </div>
      </SectionPanel>
    </>
  );
}
