"use client";

import type { AiProviderName } from "@/lib/ai";

/**
 * Reusable, accessible provider segmented control.
 *
 * Used in:
 * - Portfolio Market Research panel (cream theme)
 * - Per-property AI analysis (market dark theme)
 * - Future: Documents review, Settings, etc.
 *
 * Designed for seamless mobile / tablet / desktop:
 * - Minimum 36-40px touch targets
 * - Horizontal scroll on very small screens if needed
 * - Proper ARIA (tablist / tab)
 * - Disabled state with tooltip for unavailable provider
 */

export type AiProviderSegmentedProps = {
  provider: AiProviderName;
  onChange: (provider: AiProviderName) => void;
  xaiAvailable: boolean;
  /** Optional label shown above the control */
  label?: string;
  /** Visual density variant */
  size?: "default" | "compact";
  /** When true, uses the dark-on-light market palette (for use inside the cream AI panel) */
  lightTheme?: boolean;
};

export function AiProviderSegmented({
  provider,
  onChange,
  xaiAvailable,
  label = "AI provider",
  size = "default",
  lightTheme = false,
}: AiProviderSegmentedProps) {
  const isCompact = size === "compact";

  const containerStyle = lightTheme
    ? { background: "#FFFFFF", borderColor: "#E5DDD0" }
    : { background: "var(--market-surface-raised)", borderColor: "var(--market-border)" };

  const activeStyle = lightTheme
    ? { background: "#1F2937", color: "#FBF8F3" }
    : { background: "var(--market-blue)", color: "var(--market-text)" };

  const inactiveStyle = lightTheme
    ? { background: "transparent", color: "#475569" }
    : { background: "transparent", color: "var(--market-text-muted)" };

  return (
    <div className="flex flex-col gap-1.5">
      <span
        className={`text-[11px] font-semibold uppercase tracking-wider ${lightTheme ? "" : "text-[var(--market-text-muted)]"}`}
        style={lightTheme ? { color: "#6B7280" } : undefined}
      >
        {label}
      </span>

      <div
        role="tablist"
        aria-label="AI provider"
        className={`inline-flex w-full max-w-full items-center overflow-x-auto rounded-full border p-0.5 ${isCompact ? "text-xs" : "text-[12.5px]"}`}
        style={containerStyle}
      >
        <ProviderButton
          active={provider === "openai"}
          onClick={() => onChange("openai")}
          label="OpenAI"
          icon={
            <ProviderIcon
              src={
                provider === "openai"
                  ? "/icons/workspace/openai-icon-white.svg"
                  : "/icons/workspace/openai-icon-black.svg"
              }
            />
          }
          activeStyle={activeStyle}
          inactiveStyle={inactiveStyle}
          isCompact={isCompact}
        />

        <ProviderButton
          active={provider === "xai"}
          onClick={() => {
            if (xaiAvailable) onChange("xai");
          }}
          label="Grok"
          icon={
            <ProviderIcon
              src={
                provider === "xai"
                  ? "/icons/workspace/xai-icon-white.svg"
                  : "/icons/workspace/xai-icon-black.svg"
              }
            />
          }
          disabled={!xaiAvailable}
          tooltip={xaiAvailable ? undefined : "xAI API key not configured on server."}
          activeStyle={activeStyle}
          inactiveStyle={inactiveStyle}
          isCompact={isCompact}
        />
      </div>
    </div>
  );
}

function ProviderIcon({ src }: { src: string }) {
  return (
    <span aria-hidden className="inline-flex h-4 w-4 shrink-0 items-center justify-center">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" width={14} height={14} />
    </span>
  );
}

function ProviderButton({
  active,
  onClick,
  label,
  icon,
  disabled,
  tooltip,
  activeStyle,
  inactiveStyle,
  isCompact,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  icon?: React.ReactNode;
  disabled?: boolean;
  tooltip?: string;
  activeStyle: React.CSSProperties;
  inactiveStyle: React.CSSProperties;
  isCompact?: boolean;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      disabled={disabled}
      title={tooltip}
      onClick={onClick}
      className={`inline-flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${isCompact ? "min-h-[32px] text-xs" : "min-h-[36px] text-[12.5px]"}`}
      style={active ? activeStyle : inactiveStyle}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}
