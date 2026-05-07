"use client";

import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { AiSource, MarketNoteState } from "../market-note-actions";

type AiResponseCardProps = {
  state: MarketNoteState;
  title?: string;
};

export function AiResponseCard({
  state,
  title = "AI-generated internal draft. Verify before relying.",
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

  return (
    <div className="border border-[var(--market-border)] bg-[var(--market-surface-raised)]">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--market-border)] px-3 py-2">
        <p className="text-[11px] font-semibold text-[var(--market-amber)]">
          {title}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          {copied ? (
            <span className="text-[11px] text-[var(--market-cyan)]">
              {copied}
            </span>
          ) : null}
          <AiActionButton
            label="Copy Markdown"
            onClick={() => copy("Copied", markdownWithSources)}
          />
          <AiActionButton
            label="Copy plain text"
            onClick={() => copy("Copied", plainText)}
          />
          <AiActionButton label="Share" onClick={share} />
        </div>
      </div>

      <div className="px-3 py-3">
        <MarkdownView markdown={markdown} />
      </div>

      {sources.length > 0 ? (
        <div className="border-t border-[var(--market-border)] px-3 py-3">
          <div className="mb-2 text-[11px] uppercase tracking-wide text-[var(--market-text-muted)]">
            Sources
          </div>
          <ol className="flex flex-col gap-2">
            {visibleSources.map((source, index) => (
              <SourceRow key={`${source.url}-${index}`} index={index + 1} source={source} />
            ))}
          </ol>
          {sources.length > 5 ? (
            <button
              type="button"
              onClick={() => setShowAllSources((v) => !v)}
              className="mt-3 min-h-[40px] text-xs font-semibold text-[var(--market-cyan)] hover:text-[var(--market-text)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--market-cyan)]"
            >
              {showAllSources ? "Show fewer sources" : `Show all sources (${sources.length})`}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function AiActionButton({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="min-h-[36px] border border-[var(--market-border)] px-2.5 py-1.5 text-[11px] font-semibold text-[var(--market-text-secondary)] transition hover:border-[var(--market-cyan)] hover:text-[var(--market-text)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--market-cyan)]"
    >
      {label}
    </button>
  );
}

function MarkdownView({ markdown }: { markdown: string }) {
  const blocks = parseMarkdownBlocks(markdown);
  return (
    <div className="flex flex-col gap-3 text-sm leading-6 text-[var(--market-text-secondary)]">
      {blocks.map((block, index) => {
        if (block.type === "h1") {
          return (
            <h1
              key={index}
              className="font-display text-xl font-semibold leading-tight text-[var(--market-text)]"
            >
              {renderInline(block.lines[0])}
            </h1>
          );
        }
        if (block.type === "h2") {
          return (
            <h2
              key={index}
              className="font-display text-base font-semibold leading-tight text-[var(--market-text)]"
            >
              {renderInline(block.lines[0])}
            </h2>
          );
        }
        if (block.type === "ul") {
          return (
            <ul key={index} className="ml-4 flex list-disc flex-col gap-1">
              {block.lines.map((line, lineIndex) => (
                <li key={lineIndex}>{renderInline(line)}</li>
              ))}
            </ul>
          );
        }
        if (block.type === "ol") {
          return (
            <ol key={index} className="ml-4 flex list-decimal flex-col gap-1">
              {block.lines.map((line, lineIndex) => (
                <li key={lineIndex}>{renderInline(line)}</li>
              ))}
            </ol>
          );
        }
        return (
          <p key={index}>
            {block.lines.map((line, lineIndex) => (
              <span key={lineIndex}>
                {lineIndex > 0 ? <br /> : null}
                {renderInline(line)}
              </span>
            ))}
          </p>
        );
      })}
    </div>
  );
}

type MarkdownBlock = {
  type: "h1" | "h2" | "p" | "ul" | "ol";
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

function renderInline(text: string): ReactNode[] {
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
        <strong key={`${match.index}-${token}`} className="font-semibold text-[var(--market-text)]">
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
            className="text-[var(--market-cyan)] underline-offset-4 hover:underline"
          >
            {linkMatch[1]}
          </a>
        );
      }
    } else {
      parts.push(
        <span key={`${match.index}-${token}`} className="font-data text-[var(--market-cyan)]">
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

function SourceRow({ index, source }: { index: number; source: AiSource }) {
  return (
    <li className="grid grid-cols-[auto_minmax(0,1fr)] gap-2 text-xs">
      <span className="font-data text-[var(--market-cyan)]">[{index}]</span>
      <div className="min-w-0">
        <a
          href={source.url}
          target="_blank"
          rel="noreferrer"
          className="font-semibold text-[var(--market-text)] underline-offset-4 hover:underline"
        >
          {source.title || source.domain}
        </a>
        <div className="text-[11px] text-[var(--market-text-muted)]">
          {source.domain}
          {source.usedFor ? ` · ${source.usedFor}` : ""}
        </div>
      </div>
    </li>
  );
}

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
    .map((source, index) => `[${index + 1}] ${source.title || source.domain}: ${source.url}`)
    .join("\n")}`;
}
