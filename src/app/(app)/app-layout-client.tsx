"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { AppShell } from "@/components/app-shell";

export function AppLayoutClient({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  // Pages that need to break out of the normal constrained container + padding
  const isFullBleed = pathname === "/market" || pathname.startsWith("/market/");

  return <AppShell fullBleed={isFullBleed}>{children}</AppShell>;
}
