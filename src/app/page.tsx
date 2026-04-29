import Link from "next/link";
import { landingCards } from "@/lib/navigation";

export default function Home() {
  return (
    <div
      className="relative isolate flex min-h-dvh w-full flex-col items-center justify-center overflow-hidden px-5 py-[55px] sm:px-8 sm:py-[89px]"
      style={{ background: "var(--landing-bg)" }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.04]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, var(--color-text) 1px, transparent 0)",
          backgroundSize: "32px 32px",
        }}
      />

      <main className="flex w-full max-w-6xl flex-col items-center gap-[55px]">
        <header className="flex max-w-2xl flex-col items-center gap-[13px] text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-surface-glass)] px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)] backdrop-blur">
            <span
              aria-hidden
              className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--color-primary)] text-[var(--color-text-inverse)]"
            >
              <span className="font-display text-[11px] font-semibold">W</span>
            </span>
            Walsh Co
          </span>
          <h1 className="font-display text-4xl leading-[1.1] text-[var(--color-text)] sm:text-5xl md:text-6xl">
            Welcome to your workspace.
          </h1>
          <p className="max-w-xl text-base text-[var(--color-text-muted)] sm:text-lg">
            A calm command center for properties, projects, and the work in
            between. Choose a section to get started.
          </p>
        </header>

        <ul className="grid w-full grid-cols-1 gap-[13px] sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {landingCards.map((card) => (
            <li key={card.href}>
              <Link
                href={card.href}
                className="group relative flex h-full min-h-[148px] flex-col gap-3 overflow-hidden rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-surface-glass)] p-[21px] shadow-[var(--shadow-card)] backdrop-blur-md transition-all hover:-translate-y-0.5 hover:border-[var(--color-primary)] hover:bg-[var(--color-surface)] hover:shadow-[var(--shadow-card-hover)]"
              >
                <span
                  aria-hidden
                  className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[var(--color-primary)]/30 to-transparent opacity-0 transition-opacity group-hover:opacity-100"
                />
                <span
                  aria-hidden
                  className="flex h-11 w-11 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-primary-soft)] text-[var(--color-primary)] transition-colors group-hover:bg-[var(--color-primary)] group-hover:text-[var(--color-text-inverse)]"
                >
                  {card.icon}
                </span>
                <div className="flex flex-1 flex-col gap-1">
                  <h2 className="text-base font-semibold text-[var(--color-text)]">
                    {card.label}
                  </h2>
                  <p className="text-sm leading-6 text-[var(--color-text-muted)]">
                    {card.description}
                  </p>
                </div>
                <span className="inline-flex items-center gap-1 text-sm font-semibold text-[var(--color-primary)]">
                  Open
                  <svg
                    className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    viewBox="0 0 24 24"
                    aria-hidden
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 12h14M13 5l7 7-7 7"
                    />
                  </svg>
                </span>
              </Link>
            </li>
          ))}
        </ul>

        <p className="text-xs text-[var(--color-text-faint)]">
          Workspace placeholder · Setup in progress
        </p>
      </main>
    </div>
  );
}
