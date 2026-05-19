/**
 * Canonical source-state vocabulary for the Market Tracker UI.
 *
 * Existing provider tracking uses several different status dialects
 * ("Connected" / "Configured" / "Missing" / "Manual" / "Planned" /
 * "Not connected") depending on which panel is rendering. The user-facing
 * surface should speak a single vocabulary; this helper centralises the
 * mapping so every visible status pill / chip / badge agrees.
 *
 * No provider logic or database value is rewritten — this is display
 * mapping only. Detailed provider-specific facts (raw status strings,
 * error messages, etc.) stay in the Settings / Source Diagnostics surfaces.
 */

import type { CoverageStatus } from "./data-coverage-panel";
import type { SourceStatus as RegistrySourceStatus } from "@/lib/market-sources";

export type CanonicalSourceState = "live" | "pending" | "off" | "planned";

export const CANONICAL_LABEL: Record<CanonicalSourceState, string> = {
  live: "Live",
  pending: "Pending",
  off: "Off",
  planned: "Planned",
};

export type CanonicalColors = {
  dot: string;
  fg: string;
  bg: string;
  border: string;
};

export function canonicalStateColors(
  state: CanonicalSourceState
): CanonicalColors {
  switch (state) {
    case "live":
      return {
        dot: "var(--semantic-success)",
        fg: "var(--semantic-success)",
        bg: "var(--semantic-success-bg)",
        border: "var(--semantic-success-border)",
      };
    case "pending":
      return {
        dot: "var(--semantic-warning)",
        fg: "var(--semantic-warning)",
        bg: "var(--semantic-warning-bg)",
        border: "var(--semantic-warning-border)",
      };
    case "planned":
      return {
        dot: "var(--market-cyan)",
        fg: "var(--market-cyan)",
        bg: "var(--market-surface-raised)",
        border: "var(--market-border)",
      };
    case "off":
    default:
      return {
        dot: "var(--market-text-muted)",
        fg: "var(--market-text-muted)",
        bg: "var(--market-surface-raised)",
        border: "var(--market-border)",
      };
  }
}

export function fromSourceStatusRowKind(
  kind: "connected" | "configured" | "missing"
): CanonicalSourceState {
  if (kind === "connected") return "live";
  if (kind === "configured") return "pending";
  return "off";
}

export function fromRegistryStatus(
  status: RegistrySourceStatus
): CanonicalSourceState {
  switch (status) {
    case "Connected":
      return "live";
    case "Manual":
      return "pending";
    case "Planned":
      return "planned";
    case "Not connected":
    default:
      return "off";
  }
}

export function fromCoverageStatus(
  status: CoverageStatus
): CanonicalSourceState {
  switch (status) {
    case "Connected":
      return "live";
    case "Planned":
    case "Optional":
      return "planned";
    case "Missing":
    default:
      return "off";
  }
}
