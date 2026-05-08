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
          <h1 className="font-display text-3xl font-semibold leading-tight tracking-tight text-[var(--workspace-text)] sm:text-4xl md:text-5xl">
            {productTitle}
          </h1>
          <p className="max-w-2xl text-base leading-relaxed text-[var(--workspace-text-secondary)] sm:text-lg">
            {productSubtitle}
          </p>
        </header>

        <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {landingCards.map((card) => (
            <li key={card.href} className="contents">
              <Link
                href={card.href}
                className="group relative flex h-full min-h-[180px] flex-col gap-4 rounded-[var(--radius-2xl)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-card),var(--shadow-card-ring)] transition-[transform,box-shadow,background-color] duration-150 ease-out will-change-transform hover:-translate-y-1 hover:bg-[var(--color-surface)] hover:shadow-[var(--shadow-card-hover),var(--shadow-card-ring)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)] motion-reduce:hover:translate-y-0 motion-reduce:transition-none sm:p-6"
              >
                {card.blueprintIcon ? (
                  // Blueprint illustration sits on a tinted squircle so
                  // the icon container reads as an intentional surface,
                  // not a thin wireframe. The container shifts to the
                  // primary-soft tint on hover for a subtle brand cue.
                  <span
                    aria-hidden
                    className="inline-flex h-14 w-14 items-center justify-center rounded-[18px] bg-[var(--color-surface-soft)] transition-colors duration-150 group-hover:bg-[var(--color-primary-soft)]"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={card.blueprintIcon}
                      alt=""
                      className="h-11 w-11"
                      loading="lazy"
                    />
                  </span>
                ) : (
                  <span
                    aria-hidden
                    className="inline-flex h-12 w-12 items-center justify-center rounded-[16px] bg-[var(--color-primary-soft)] text-[var(--color-primary)]"
                  >
                    {card.icon}
                  </span>
                )}
                <div className="flex flex-1 flex-col gap-1.5">
                  <h2 className="text-[17px] font-semibold leading-snug text-[var(--workspace-text)]">
                    {card.title}
                  </h2>
                  <p className="text-[13.5px] leading-[1.55] text-[var(--workspace-text-secondary)]">
                    {card.description}
                  </p>
                </div>
                <span className="inline-flex items-center gap-1 text-sm font-semibold text-[var(--color-primary)]">
                  Open
                  <span
                    className="inline-flex transition-transform duration-150 ease-out group-hover:translate-x-1 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0"
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
