import type { ReactNode } from "react";
import { MobileNav } from "./mobile-nav";
import { Sidebar } from "./sidebar";
import { TopBar } from "./top-bar";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh w-full bg-[var(--color-bg)]">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar />
        <main className="flex-1 px-4 pb-[96px] pt-[21px] sm:px-6 sm:pt-[34px] lg:px-[34px] lg:pb-[55px] lg:pt-[34px]">
          <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-[34px] xl:max-w-[1440px]">
            {children}
          </div>
        </main>
      </div>
      <MobileNav />
    </div>
  );
}
