"use client";

import { BadgeCheck, Clock, Circle, Edit3, AlertCircle } from "lucide-react";

export type StatusKind = "live" | "pending" | "off" | "planned" | "success" | "warning" | "error" | "neutral";

export type StatusBadgeProps = {
  kind: StatusKind;
  label?: string;
  /** Show a small icon next to / inside the status for accessibility */
  showIcon?: boolean;
  /** Render only a colored dot (no label, very compact) */
  dotOnly?: boolean;
  /** Make the whole thing more compact (used in tables / dense lists) */
  compact?: boolean;
  className?: string;
};

/**
 * Workspace-wide status badge.
 *
 * Canonical states (recommended for data sources, freshness, verification):
 *   - live     → green / success
 *   - pending  → amber / warning
 *   - off      → muted gray
 *   - planned  → cyan / info (future capability)
 *
 * Additional semantic aliases are also supported for Tasks, Documents, Contacts, etc.
 *
 * Designed to be excellent on mobile, tablet, and desktop:
 * - Minimum readable size
 * - High contrast
 * - Optional icon to solve color-only problems (see critique)
 * - Uses existing design tokens
 */
export function StatusBadge({
  kind,
  label,
  showIcon = true,
  dotOnly = false,
  compact = false,
  className = "",
}: StatusBadgeProps) {
  const config = getStatusConfig(kind);

  const Icon = config.icon;

  if (dotOnly) {
    return (
      <span
        className={`inline-block rounded-full ${compact ? "h-1.5 w-1.5" : "h-2 w-2"} ${className}`}
        style={{ background: config.dot || config.fg }}
        title={label || config.defaultLabel}
        aria-label={label || config.defaultLabel}
      />
    );
  }

  const base = compact
    ? "inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold"
    : "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold";

  return (
    <span
      className={`${base} ${className}`}
      style={{
        background: config.bg,
        color: config.fg,
        border: `1px solid ${config.border}`,
      }}
      title={label || config.defaultLabel}
    >
      {showIcon && Icon && (
        <Icon className={compact ? "h-3 w-3" : "h-3.5 w-3.5"} aria-hidden />
      )}
      {label && <span className="whitespace-nowrap">{label}</span>}
    </span>
  );
}

function getStatusConfig(kind: StatusKind) {
  switch (kind) {
    case "live":
    case "success":
      return {
        fg: "var(--semantic-success)",
        bg: "var(--semantic-success-bg)",
        border: "var(--semantic-success-border)",
        dot: "var(--semantic-success)",
        icon: BadgeCheck,
        defaultLabel: "Live",
      };
    case "pending":
    case "warning":
      return {
        fg: "var(--semantic-warning)",
        bg: "var(--semantic-warning-bg)",
        border: "var(--semantic-warning-border)",
        dot: "var(--semantic-warning)",
        icon: Clock,
        defaultLabel: "Pending",
      };
    case "off":
    case "error":
      return {
        fg: "var(--market-text-muted)",
        bg: "var(--market-surface-raised)",
        border: "var(--market-border)",
        dot: "var(--market-text-muted)",
        icon: AlertCircle, // less harsh than XCircle for "off" states
        defaultLabel: "Off",
      };
    case "planned":
    case "neutral":
    default:
      return {
        fg: "var(--market-cyan)",
        bg: "var(--market-surface-raised)",
        border: "var(--market-border)",
        dot: "var(--market-cyan)",
        icon: Circle,
        defaultLabel: "Planned",
      };
  }
}
