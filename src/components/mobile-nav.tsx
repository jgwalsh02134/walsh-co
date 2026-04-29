"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { isActiveHref, primaryNav } from "@/lib/navigation";

export function MobileNav() {
  const pathname = usePathname();
  const items = primaryNav.slice(0, 5);

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-[var(--color-border)] bg-[var(--color-surface)] pb-[env(safe-area-inset-bottom)] shadow-[var(--shadow-rail)] lg:hidden"
    >
      <ul className="grid grid-cols-5">
        {items.map((item) => {
          const active = isActiveHref(pathname, item.href);
          return (
            <li key={item.href} className="contents">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className="flex min-h-[60px] flex-col items-center justify-center gap-1 px-1 py-2 text-[11px] font-medium"
                style={{
                  color: active ? "var(--color-primary)" : "var(--color-text-muted)",
                }}
              >
                <span aria-hidden>{item.icon}</span>
                <span>{item.shortLabel ?? item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
