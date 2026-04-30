"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { isActiveHref, settingsNav, sidebarNav, type NavItem } from "@/lib/navigation";

function NavLink({ item, active }: { item: NavItem; active: boolean }) {
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={`flex items-center gap-3 rounded-[var(--radius-md)] px-3 py-2 text-sm font-medium transition-colors ${
        active
          ? "bg-[var(--color-primary)] text-[var(--color-text-inverse)]"
          : "text-[var(--color-text)] hover:bg-[var(--color-surface-soft)]"
      }`}
    >
      <span
        className={
          active ? "text-[var(--color-text-inverse)]" : "text-[var(--color-text-muted)]"
        }
      >
        {item.icon}
      </span>
      <span>{item.label}</span>
    </Link>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside
      aria-label="Primary"
      className="hidden lg:flex lg:w-64 lg:shrink-0 lg:flex-col lg:gap-6 lg:border-r lg:border-[var(--color-border)] lg:bg-[var(--color-surface)] lg:px-4 lg:py-6"
    >
      <Link
        href="/"
        className="flex items-center gap-2 rounded-[var(--radius-md)] px-2 py-1"
      >
        <span
          aria-hidden
          className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-primary)] text-[var(--color-text-inverse)]"
        >
          <span className="font-display text-base font-semibold">W</span>
        </span>
        <span className="font-display text-lg text-[var(--color-text)]">
          Walsh Co
        </span>
      </Link>

      <nav className="flex flex-col gap-1" aria-label="Sections">
        {sidebarNav.map((item) => (
          <NavLink
            key={item.href}
            item={item}
            active={isActiveHref(pathname, item.href)}
          />
        ))}
      </nav>

      <div className="mt-auto flex flex-col gap-1">
        {settingsNav.map((item) => (
          <NavLink
            key={item.href}
            item={item}
            active={isActiveHref(pathname, item.href)}
          />
        ))}
      </div>
    </aside>
  );
}
