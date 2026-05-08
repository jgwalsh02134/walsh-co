"use client";

/**
 * Renders an AI market note as readable Markdown with compact citations
 * and a small set of macOS-style controls (Copy, Share, Minimize, Clear).
 *
 * Two visual variants:
 *   - "light" — used by the new portfolio AI panel (warm off-white card
 *     layered over the dark dashboard).
 *   - "dark"  — used by the per-property card so the AI block continues
 *     to fit inside an existing dark card without a jarring contrast jump.
 *
 * Disclaimer language is intentionally calm: one short footer line, not a
 * flashing warning. Detailed safety constraints live in the prompts on
 * the server, not in the UI chrome.
 *
 * No data fetching here; state is produced by server actions in
 * market-note-actions.ts.
 */

import { useMemo, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import type { AiSource, MarketNoteState } from "../market-note-actions";

type Variant = "light" | "dark";

type AiResponseCardProps = {
  state: MarketNoteState;
  variant?: Variant;
  /** Optional handler — when present, a Clear button is shown that
   *  removes the rendered output. The parent owns this state. */
  onClear?: () => void;
  /** Optional override for the calm one-liner under the output. */
  footerNote?: string;
};

export function AiResponseCard({
  state,
  variant = "dark",
  onClear,
  footerNote = "Use as research support; verify key facts before decisions.",
}: AiResponseCardProps) {
  const [copied, setCopied] = useState<string | null>(null);
  const [minimized, setMinimized] = useState(false);
  const [showAllSources, setShowAllSources] = useState(false);
  const markdown = state.message || "";
  const sources = state.sources ?? [];
  const visibleSources = showAllSources ? sources : sources.slice(0, 5);

  const copyText = useMemo(
    () => buildCopyText(markdown, sources),
    [markdown, sources]
  );

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(copyText);
      setCopied("Copied");
      window.setTimeout(() => setCopied(null), 1600);
    } catch {
      setCopied("Copy failed");
      window.setTimeout(() => setCopied(null), 1600);
    }
  };

  const share = async () => {
    const payload = {
      title: "Market Tracker AI analysis",
      text: copyText,
    };
    try {
      if (navigator.share) {
        await navigator.share(payload);
        setCopied("Shared");
      } else {
        await navigator.clipboard.writeText(copyText);
        setCopied("Copied");
      }
      window.setTimeout(() => setCopied(null), 1600);
    } catch {
      setCopied("Share cancelled");
      window.setTimeout(() => setCopied(null), 1600);
    }
  };

  const tokens = themeTokens(variant);

  return (
    <div
      className="overflow-hidden border"
      style={{
        background: tokens.surface,
        borderColor: tokens.border,
        borderRadius: 14,
        color: tokens.text,
        boxShadow:
          variant === "light"
            ? "0 1px 2px rgba(15,23,42,0.05), 0 4px 12px rgba(15,23,42,0.06)"
            : "none",
      }}
    >
      <div
        className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b px-3 py-2 sm:px-4"
        style={{ borderColor: tokens.border, background: tokens.headerSurface }}
      >
        <div className="flex flex-wrap items-center gap-2 min-w-0">
          {state.providerLabel ? (
            <ProviderChip
              label={state.providerLabel}
              tokens={tokens}
              variant={variant}
            />
          ) : null}
          {state.modeLabel ? (
            <span
              className="inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold"
              style={{
                background: tokens.badgeBg,
                borderColor: tokens.badgeBorder,
                color: tokens.badgeText,
              }}
            >
              <span aria-hidden style={{ fontFamily: "serif" }}>
                Ψ
              </span>
              {state.modeLabel}
            </span>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {copied ? (
            <span className="text-[11px]" style={{ color: tokens.accent }}>
              {copied}
            </span>
          ) : null}
          <PillButton
            label={minimized ? "Expand" : "Minimize"}
            onClick={() => setMinimized((v) => !v)}
            tokens={tokens}
            ariaPressed={minimized}
          />
          <PillButton label="Copy" onClick={copy} tokens={tokens} />
          <PillButton label="Share" onClick={share} tokens={tokens} />
          {onClear ? (
            <PillButton label="Clear" onClick={onClear} tokens={tokens} />
          ) : null}
        </div>
      </div>

      {minimized ? (
        <div
          className="px-4 py-2 text-[12px]"
          style={{ color: tokens.textMuted }}
        >
          Output minimized. Use Expand to read it again, or Clear to remove it.
        </div>
      ) : (
        <>
          <div className="px-4 py-4 sm:px-5">
            <MarkdownView markdown={markdown} tokens={tokens} />
          </div>

          {sources.length > 0 || state.expectedSources ? (
            <div
              className="border-t px-4 py-3 sm:px-5"
              style={{
                borderColor: tokens.border,
                background: tokens.footerSurface,
              }}
            >
              <div
                className="mb-2 text-[11px] uppercase tracking-wide"
                style={{ color: tokens.textMuted }}
              >
                Sources
              </div>
              {sources.length === 0 ? (
                <p
                  className="text-[12px] italic"
                  style={{ color: tokens.textMuted }}
                >
                  No external sources returned by provider.
                </p>
              ) : (
                <>
                  <ol className="flex flex-col gap-2">
                    {visibleSources.map((source, index) => (
                      <SourceRow
                        key={`${source.url}-${index}`}
                        index={index + 1}
                        source={source}
                        tokens={tokens}
                      />
                    ))}
                  </ol>
                  {sources.length > 5 ? (
                    <button
                      type="button"
                      onClick={() => setShowAllSources((v) => !v)}
                      className="mt-3 min-h-[40px] rounded-full border px-3 py-1 text-xs font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2"
                      style={{
                        background: tokens.pillSurface,
                        borderColor: tokens.border,
                        color: tokens.text,
                        outlineColor: tokens.accent,
                      }}
                    >
                      {showAllSources
                        ? "Show fewer sources"
                        : `Show all sources (${sources.length})`}
                    </button>
                  ) : null}
                </>
              )}
            </div>
          ) : null}
        </>
      )}

      <div
        className="border-t px-4 py-2 text-[11px] sm:px-5"
        style={{ borderColor: tokens.border, color: tokens.textMuted }}
      >
        {footerNote}
      </div>
    </div>
  );
}

// =============================================================
// Theme tokens
// =============================================================

type Tokens = {
  surface: string;
  headerSurface: string;
  footerSurface: string;
  border: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  accent: string;
  warn: string;
  warnBg: string;
  warnBorder: string;
  badgeBg: string;
  badgeBorder: string;
  badgeText: string;
  pillSurface: string;
  pillSurfaceHover: string;
  pillBorder: string;
  pillShadow: string;
  pillShadowHover: string;
  link: string;
  citation: string;
};

function themeTokens(variant: Variant): Tokens {
  if (variant === "light") {
    return {
      surface: "#FBF8F3",
      headerSurface: "#F5F0E6",
      footerSurface: "#F8F4EB",
      border: "#E5DDD0",
      text: "#1F2937",
      textSecondary: "#475569",
      textMuted: "#6B7280",
      accent: "#2563EB",
      warn: "#B45309",
      warnBg: "#FEF3C7",
      warnBorder: "#FCD34D",
      badgeBg: "#EEF2FF",
      badgeBorder: "#C7D2FE",
      badgeText: "#1D4ED8",
      pillSurface: "#FFFFFF",
      pillSurfaceHover: "#F9FAFB",
      pillBorder: "#D1D5DB",
      pillShadow: "0 1px 1px rgba(15,23,42,0.04)",
      pillShadowHover:
        "0 1px 1px rgba(15,23,42,0.04), 0 2px 6px rgba(15,23,42,0.06)",
      link: "#1D4ED8",
      citation: "#0EA5E9",
    };
  }
  return {
    surface: "var(--market-surface-raised)",
    headerSurface: "var(--market-surface-raised)",
    footerSurface: "var(--market-surface-raised)",
    border: "var(--market-border)",
    text: "var(--market-text)",
    textSecondary: "var(--market-text-secondary)",
    textMuted: "var(--market-text-muted)",
    accent: "var(--market-cyan)",
    warn: "var(--market-amber)",
    warnBg: "color-mix(in srgb, var(--market-amber) 22%, transparent)",
    warnBorder: "var(--market-border-strong)",
    badgeBg: "color-mix(in srgb, var(--market-blue) 22%, transparent)",
    badgeBorder: "var(--market-border-strong)",
    badgeText: "var(--market-text)",
    pillSurface: "var(--market-surface)",
    pillSurfaceHover: "var(--market-surface-hover)",
    pillBorder: "var(--market-border-strong)",
    pillShadow: "none",
    pillShadowHover: "0 1px 4px rgba(0,0,0,0.25)",
    link: "var(--market-cyan)",
    citation: "var(--market-cyan)",
  };
}

// =============================================================
// Provider chip
// =============================================================

function ProviderChip({
  label,
  tokens,
  variant,
}: {
  label: "OpenAI" | "Grok";
  tokens: Tokens;
  variant: Variant;
}) {
  // The chip surface is light in both variants (pill on white) on the
  // light card; on the dark card it sits on the raised surface. Use the
  // black icon variant on the light pill, white on dark.
  const useDark = variant === "dark";
  const iconSrc =
    label === "Grok"
      ? useDark
        ? "/icons/workspace/xai-icon-white.svg"
        : "/icons/workspace/xai-icon-black.svg"
      : useDark
      ? "/icons/workspace/openai-icon-white.svg"
      : "/icons/workspace/openai-icon-black.svg";
  return (
    <span
      className="inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold"
      style={{
        background: tokens.pillSurface,
        borderColor: tokens.border,
        color: tokens.text,
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={iconSrc}
        alt=""
        aria-hidden
        width={12}
        height={12}
        style={{ display: "inline-block" }}
      />
      {label}
    </span>
  );
}

// =============================================================
// Pill button
// =============================================================

function PillButton({
  label,
  onClick,
  tokens,
  ariaPressed,
}: {
  label: string;
  onClick: () => void;
  tokens: Tokens;
  ariaPressed?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={ariaPressed}
      className="inline-flex min-h-[36px] items-center justify-center rounded-full border px-3.5 py-1.5 text-[12px] font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2"
      style={
        {
          background: tokens.pillSurface,
          borderColor: tokens.pillBorder,
          color: tokens.text,
          outlineColor: tokens.accent,
          boxShadow: tokens.pillShadow,
        } as CSSProperties
      }
      onMouseEnter={(e) => {
        e.currentTarget.style.background = tokens.pillSurfaceHover;
        e.currentTarget.style.boxShadow = tokens.pillShadowHover;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = tokens.pillSurface;
        e.currentTarget.style.boxShadow = tokens.pillShadow;
      }}
    >
      {label}
    </button>
  );
}

// =============================================================
// Markdown renderer
// =============================================================

function MarkdownView({
  markdown,
  tokens,
}: {
  markdown: string;
  tokens: Tokens;
}) {
  const blocks = parseMarkdownBlocks(markdown);
  return (
    <div
      className="flex flex-col gap-3 text-[14px] leading-[1.65] [overflow-wrap:anywhere]"
      style={{ color: tokens.textSecondary }}
    >
      {blocks.map((block, index) => {
        if (block.type === "h1") {
          return (
            <h1
              key={index}
              className="font-display text-[20px] font-semibold leading-tight"
              style={{ color: tokens.text }}
            >
              {renderInline(block.lines[0], tokens)}
            </h1>
          );
        }
        if (block.type === "h2") {
          return (
            <h2
              key={index}
              className="mt-2 font-display text-[16px] font-semibold leading-tight"
              style={{ color: tokens.text }}
            >
              {renderInline(block.lines[0], tokens)}
            </h2>
          );
        }
        if (block.type === "h3") {
          return (
            <h3
              key={index}
              className="mt-1 font-display text-[14.5px] font-semibold leading-tight"
              style={{ color: tokens.text }}
            >
              {renderInline(block.lines[0], tokens)}
            </h3>
          );
        }
        if (block.type === "ul") {
          return (
            <ul
              key={index}
              className="ml-5 flex list-disc flex-col gap-1.5 marker:text-current"
              style={{ color: tokens.textSecondary }}
            >
              {block.lines.map((line, lineIndex) => (
                <li key={lineIndex}>{renderInline(line, tokens)}</li>
              ))}
            </ul>
          );
        }
        if (block.type === "ol") {
          return (
            <ol
              key={index}
              className="ml-5 flex list-decimal flex-col gap-1.5 marker:text-current"
              style={{ color: tokens.textSecondary }}
            >
              {block.lines.map((line, lineIndex) => (
                <li key={lineIndex}>{renderInline(line, tokens)}</li>
              ))}
            </ol>
          );
        }
        return (
          <p key={index}>
            {block.lines.map((line, lineIndex) => (
              <span key={lineIndex}>
                {lineIndex > 0 ? <br /> : null}
                {renderInline(line, tokens)}
              </span>
            ))}
          </p>
        );
      })}
    </div>
  );
}

type MarkdownBlock = {
  type: "h1" | "h2" | "h3" | "p" | "ul" | "ol";
  lines: string[];
};

function parseMarkdownBlocks(markdown: string): MarkdownBlock[] {
  const blocks: MarkdownBlock[] = [];
  const lines = markdown.split("\n");
  let paragraph: string[] = [];
  let list: MarkdownBlock | null = null;

  const flushParagraph = () => {
    if (paragraph.length > 0) {
      blocks.push({ type: "p", lines: paragraph });
      paragraph = [];
    }
  };
  const flushList = () => {
    if (list) {
      blocks.push(list);
      list = null;
    }
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      flushParagraph();
      flushList();
      continue;
    }
    if (line.startsWith("### ")) {
      flushParagraph();
      flushList();
      blocks.push({ type: "h3", lines: [line.replace(/^###\s+/, "")] });
      continue;
    }
    if (line.startsWith("## ")) {
      flushParagraph();
      flushList();
      blocks.push({ type: "h2", lines: [line.replace(/^##\s+/, "")] });
      continue;
    }
    if (line.startsWith("# ")) {
      flushParagraph();
      flushList();
      blocks.push({ type: "h1", lines: [line.replace(/^#\s+/, "")] });
      continue;
    }
    if (/^[-*]\s+/.test(line)) {
      flushParagraph();
      if (!list || list.type !== "ul") {
        flushList();
        list = { type: "ul", lines: [] };
      }
      list.lines.push(line.replace(/^[-*]\s+/, ""));
      continue;
    }
    if (/^\d+\.\s+/.test(line)) {
      flushParagraph();
      if (!list || list.type !== "ol") {
        flushList();
        list = { type: "ol", lines: [] };
      }
      list.lines.push(line.replace(/^\d+\.\s+/, ""));
      continue;
    }
    flushList();
    paragraph.push(line);
  }

  flushParagraph();
  flushList();
  return blocks;
}

function renderInline(text: string, tokens: Tokens): ReactNode[] {
  const parts: ReactNode[] = [];
  const pattern = /(\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\)|\[\d+\])/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text))) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    const token = match[0];
    if (token.startsWith("**")) {
      parts.push(
        <strong
          key={`${match.index}-${token}`}
          className="font-semibold"
          style={{ color: tokens.text }}
        >
          {token.slice(2, -2)}
        </strong>
      );
    } else if (token.startsWith("[") && token.includes("](")) {
      const linkMatch = token.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      if (linkMatch) {
        parts.push(
          <a
            key={`${match.index}-${token}`}
            href={linkMatch[2]}
            target="_blank"
            rel="noreferrer"
            className="break-words underline-offset-4 hover:underline"
            style={{ color: tokens.link }}
          >
            {linkMatch[1]}
          </a>
        );
      }
    } else {
      parts.push(
        <span
          key={`${match.index}-${token}`}
          className="font-data text-[12px] align-super"
          style={{ color: tokens.citation }}
        >
          {token}
        </span>
      );
    }
    lastIndex = match.index + token.length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }
  return parts;
}

// =============================================================
// Source row
// =============================================================

function SourceRow({
  index,
  source,
  tokens,
}: {
  index: number;
  source: AiSource;
  tokens: Tokens;
}) {
  return (
    <li className="grid grid-cols-[auto_minmax(0,1fr)] gap-2 text-xs">
      <span className="font-data text-[12px]" style={{ color: tokens.citation }}>
        [{index}]
      </span>
      <div className="min-w-0">
        <a
          href={source.url}
          target="_blank"
          rel="noreferrer"
          className="block truncate font-semibold underline-offset-4 hover:underline"
          style={{ color: tokens.text }}
        >
          {source.title || source.domain}
        </a>
        <div
          className="mt-0.5 truncate text-[11px]"
          style={{ color: tokens.textMuted }}
        >
          {source.domain}
          {source.usedFor ? ` · ${source.usedFor}` : ""}
        </div>
      </div>
    </li>
  );
}

// =============================================================
// Copy text builder — Markdown-flavoured plain text with sources
// inlined at the bottom. Pastes cleanly into email and Docs.
// =============================================================

function buildCopyText(markdown: string, sources: AiSource[]): string {
  const stripped = markdown
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^[-*]\s+/gm, "- ")
    .trim();
  if (sources.length === 0) return stripped;
  const sourceLines = sources.map(
    (source, index) =>
      `[${index + 1}] ${source.title || source.domain} — ${source.url}`
  );
  return `${stripped}\n\nSources:\n${sourceLines.join("\n")}`;
}
