import Link from "next/link";
import {
  icons,
  landingCards,
  productName,
  productSubtitle,
  productTitle,
} from "@/lib/navigation";

export default function Home() {
  return (
    <div className="flex min-h-dvh w-full flex-col bg-[var(--color-bg)]">
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-10 px-5 py-12 sm:px-8 sm:py-16 lg:py-20">
        <header className="flex flex-col gap-3">
          <span className="inline-flex items-center gap-2 self-start rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1 text-xs font-medium uppercase tracking-wide text-[var(--color-text-muted)]">
            <span
              aria-hidden
              className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--color-primary)] text-[var(--color-text-inverse)]"
            >
              <span className="font-display text-[11px] font-semibold">W</span>
            </span>
            {productName}
          </span>
          <h1 className="font-display text-3xl leading-tight text-[var(--color-text)] sm:text-4xl md:text-5xl">
            {productTitle}
          </h1>
          <p className="max-w-2xl text-base text-[var(--color-text-muted)] sm:text-lg">
            {productSubtitle}
          </p>
        </header>

        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {landingCards.map((card) => (
            <li key={card.href} className="contents">
              <Link
                href={card.href}
                className="group flex h-full min-h-[160px] flex-col gap-4 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-card)] transition-all hover:-translate-y-0.5 hover:border-[var(--color-primary)] hover:shadow-[var(--shadow-card-hover)] sm:p-6"
              >
                {card.blueprintIcon ? (
                  // Blueprint art is a fixed-color illustration, so we
                  // give it a neutral surface to sit on — the warm
                  // workspace palette doesn't fight the Icons8 blue.
                  // Light opacity keeps the title visually dominant.
                  <span
                    aria-hidden
                    className="inline-flex h-14 w-14 items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-soft)]"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={card.blueprintIcon}
                      alt=""
                      className="h-11 w-11 opacity-90"
                      loading="lazy"
                    />
                  </span>
                ) : (
                  // Fallback to the original Lucide icon badge when no
                  // blueprint asset is provided for this card.
                  <span
                    aria-hidden
                    className="inline-flex h-11 w-11 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-primary-soft)] text-[var(--color-primary)]"
                  >
                    {card.icon}
                  </span>
                )}
                <div className="flex flex-1 flex-col gap-1.5">
                  <h2 className="text-lg font-semibold text-[var(--color-text)]">
                    {card.title}
                  </h2>
                  <p className="text-sm leading-6 text-[var(--color-text-muted)]">
                    {card.description}
                  </p>
                </div>
                <span className="inline-flex items-center gap-1 text-sm font-semibold text-[var(--color-primary)]">
                  Open
                  <span
                    className="transition-transform group-hover:translate-x-0.5"
                    aria-hidden
                  >
                    {icons.arrowRight}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>

        <footer className="mt-auto flex flex-col gap-2 pt-8 text-xs text-[var(--color-text-faint)] sm:flex-row sm:items-center sm:justify-between">
          <span>
            Access protected by Cloudflare Access · Microsoft Entra login.
          </span>
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <a
              href="https://icons8.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:underline"
            >
              Icons by Icons8
            </a>
            <Link
              href="/settings"
              className="text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:underline"
            >
              Settings
            </Link>
          </span>
        </footer>
      </main>
    </div>
  );
}
