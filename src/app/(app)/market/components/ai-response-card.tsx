"use client";

/**
 * Renders an AI market note as readable Markdown with compact citations
 * and copy / plain-text / share controls.
 *
 * Two visual variants:
 *   - "light" — used by the new portfolio AI panel (warm off-white card
 *     layered over the dark dashboard).
 *   - "dark"  — used by the per-property card so the AI block continues
 *     to fit inside an existing dark card without a jarring contrast jump.
 *
 * No data fetching here. The state object is produced by server actions
 * in market-note-actions.ts.
 */

import { useMemo, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import type { AiSource, MarketNoteState } from "../market-note-actions";

type Variant = "light" | "dark";

type AiResponseCardProps = {
  state: MarketNoteState;
  variant?: Variant;
  /** Optional disclaimer override; defaults to a neutral label. */
  title?: string;
};

export function AiResponseCard({
  state,
  variant = "dark",
  title = "AI-generated internal draft. Not an appraisal. Verify before relying.",
}: AiResponseCardProps) {
  const [copied, setCopied] = useState<string | null>(null);
  const [showAllSources, setShowAllSources] = useState(false);
  const markdown = state.message || "";
  const sources = state.sources ?? [];
  const visibleSources = showAllSources ? sources : sources.slice(0, 5);
  const plainText = useMemo(
    () => markdownToPlainText(markdown, sources),
    [markdown, sources]
  );
  const markdownWithSources = useMemo(
    () => appendSources(markdown, sources),
    [markdown, sources]
  );

  const copy = async (label: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(label);
      window.setTimeout(() => setCopied(null), 1600);
    } catch {
      setCopied("Copy failed");
      window.setTimeout(() => setCopied(null), 1600);
    }
  };

  const share = async () => {
    const payload = {
      title: "Market Tracker AI analysis",
      text: plainText,
    };
    try {
      if (navigator.share) {
        await navigator.share(payload);
        setCopied("Shared");
      } else {
        await navigator.clipboard.writeText(plainText);
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
        boxShadow: variant === "light" ? "0 1px 2px rgba(15,23,42,0.05), 0 4px 12px rgba(15,23,42,0.06)" : "none",
      }}
    >
      <div
        className="flex flex-wrap items-center justify-between gap-2 border-b px-3 py-2"
        style={{ borderColor: tokens.border, background: tokens.headerSurface }}
      >
        <div className="flex flex-wrap items-center gap-2 min-w-0">
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
          <p
            className="text-[11px] font-medium"
            style={{ color: tokens.textMuted }}
          >
            {title}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {copied ? (
            <span className="text-[11px]" style={{ color: tokens.accent }}>
              {copied}
            </span>
          ) : null}
          <PillButton
            label="Copy Markdown"
            onClick={() => copy("Copied", markdownWithSources)}
            tokens={tokens}
          />
          <PillButton
            label="Copy plain text"
            onClick={() => copy("Copied", plainText)}
            tokens={tokens}
          />
          <PillButton label="Share" onClick={share} tokens={tokens} />
        </div>
      </div>

      <div className="px-4 py-4 sm:px-5">
        <MarkdownView markdown={markdown} tokens={tokens} />
      </div>

      {sources.length > 0 ? (
        <div
          className="border-t px-4 py-3 sm:px-5"
          style={{ borderColor: tokens.border, background: tokens.footerSurface }}
        >
          <div
            className="mb-2 text-[11px] uppercase tracking-wide"
            style={{ color: tokens.textMuted }}
          >
            Sources
          </div>
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
        </div>
      ) : null}
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
  badgeBg: string;
  badgeBorder: string;
  badgeText: string;
  pillSurface: string;
  pillSurfaceHover: string;
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
      badgeBg: "#EEF2FF",
      badgeBorder: "#C7D2FE",
      badgeText: "#1D4ED8",
      pillSurface: "#FFFFFF",
      pillSurfaceHover: "#F3F4F6",
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
    badgeBg: "color-mix(in srgb, var(--market-blue) 22%, transparent)",
    badgeBorder: "var(--market-border-strong)",
    badgeText: "var(--market-text)",
    pillSurface: "var(--market-surface)",
    pillSurfaceHover: "var(--market-surface-hover)",
    link: "var(--market-cyan)",
    citation: "var(--market-cyan)",
  };
}

// =============================================================
// Buttons
// =============================================================

function PillButton({
  label,
  onClick,
  tokens,
}: {
  label: string;
  onClick: () => void;
  tokens: Tokens;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex min-h-[36px] items-center justify-center rounded-full border px-3 py-1.5 text-[11px] font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2"
      style={
        {
          background: tokens.pillSurface,
          borderColor: tokens.border,
          color: tokens.text,
          outlineColor: tokens.accent,
          ["--hover-bg" as string]: tokens.pillSurfaceHover,
        } as CSSProperties
      }
      onMouseEnter={(e) => {
        e.currentTarget.style.background = tokens.pillSurfaceHover;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = tokens.pillSurface;
      }}
    >
      {label}
    </button>
  );
}

// =============================================================
// Markdown renderer (lightweight; covers h1/h2/h3, ul, ol, p, strong,
// links, and inline [n] citation markers).
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
      className="flex flex-col gap-3 text-[13.5px] leading-[1.6]"
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
              className="mt-2 font-display text-[15px] font-semibold leading-tight"
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
              className="mt-1 font-display text-[13.5px] font-semibold leading-tight"
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
            className="underline-offset-4 hover:underline"
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
// Plain-text / Markdown helpers for clipboard / share
// =============================================================

function appendSources(markdown: string, sources: AiSource[]): string {
  if (sources.length === 0) return markdown;
  const sourceLines = sources.map(
    (source, index) =>
      `[${index + 1}] ${source.title || source.domain} (${source.domain}) - ${source.url}`
  );
  return `${markdown.trim()}\n\n## Sources\n${sourceLines.join("\n")}`;
}

function markdownToPlainText(markdown: string, sources: AiSource[]): string {
  const stripped = markdown
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^[-*]\s+/gm, "- ")
    .trim();
  if (sources.length === 0) return stripped;
  return `${stripped}\n\nSources:\n${sources
    .map(
      (source, index) =>
        `[${index + 1}] ${source.title || source.domain}: ${source.url}`
    )
    .join("\n")}`;
}
