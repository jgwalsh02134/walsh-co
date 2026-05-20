import type { ReactNode } from "react";
import { Sidebar } from "./sidebar";
import { TopBar } from "./top-bar";

export function AppShell({ 
  children, 
  fullBleed = false 
}: { 
  children: ReactNode; 
  /** When true, removes the default constrained container and horizontal padding.
   *  The page becomes responsible for its own layout (used by Market Tracker). */
  fullBleed?: boolean;
}) {
  return (
    <div className="flex min-h-dvh w-full bg-[var(--color-bg)]">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar />
        <main className={fullBleed ? "flex-1" : "flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10"}>
          {fullBleed ? (
            children
          ) : (
            <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-8 xl:max-w-[1320px]">
              {children}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
