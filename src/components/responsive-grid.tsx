import type { ReactNode } from "react";

type ResponsiveGridProps = {
  children: ReactNode;
  minItemWidth?: "sm" | "md" | "lg";
  gap?: "sm" | "md" | "lg";
};

const minClass: Record<NonNullable<ResponsiveGridProps["minItemWidth"]>, string> = {
  sm: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
  md: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
  lg: "grid-cols-1 md:grid-cols-2",
};

const gapClass: Record<NonNullable<ResponsiveGridProps["gap"]>, string> = {
  sm: "gap-2",
  md: "gap-[13px]",
  lg: "gap-[21px]",
};

export function ResponsiveGrid({
  children,
  minItemWidth = "md",
  gap = "md",
}: ResponsiveGridProps) {
  return (
    <div className={`grid ${minClass[minItemWidth]} ${gapClass[gap]}`}>
      {children}
    </div>
  );
}
