"use client";

import { useState, useEffect } from "react";
import { Search, RefreshCw, Edit, Eye, BarChart3 } from "lucide-react";
import Link from "next/link";

import { trackedProperties } from "@/lib/market-data";

interface MarketCommandProps {
  open: boolean;
  onClose: () => void;
}

interface CommandAction {
  label: string;
  icon: React.ReactNode;
  action?: () => void;
  href?: string;
}

export function MarketCommand({ open, onClose }: MarketCommandProps) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Parse natural language commands
  const parseCommand = (q: string): CommandAction[] => {
    const lower = q.toLowerCase().trim();
    const results: CommandAction[] = [];

    // Global actions
    if (lower.includes("refresh all") || lower === "refresh") {
      results.push({
        label: "Refresh all data sources",
        icon: <RefreshCw className="h-4 w-4" />,
        action: () => {
          onClose();
          window.dispatchEvent(new CustomEvent("market:refresh-all"));
        },
      });
    }

    if (lower.includes("manual") || lower.includes("edit data")) {
      results.push({
        label: "Go to Manual Data page",
        icon: <Edit className="h-4 w-4" />,
        href: "/market/manual",
      });
    }

    // Property-specific commands
    trackedProperties.forEach((prop) => {
      const addrLower = prop.address.toLowerCase();
      const shortName = prop.address.split(" ")[0].toLowerCase(); // e.g. "322" or "Loudonwood"

      if (
        lower.includes(shortName) ||
        lower.includes(addrLower) ||
        (prop.slug && lower.includes(prop.slug.toLowerCase()))
      ) {
        // Refresh specific property (future: wire to per-property refresh)
        results.push({
          label: `Refresh data for ${prop.address}`,
          icon: <RefreshCw className="h-4 w-4" />,
          action: () => {
            onClose();
            // For now dispatch global + highlight
            window.dispatchEvent(new CustomEvent("market:refresh-all"));
            window.location.href = `/market?highlight=${prop.id}`;
          },
        });

        results.push({
          label: `View comps for ${prop.address}`,
          icon: <BarChart3 className="h-4 w-4" />,
          href: `/market?highlight=${prop.id}&tab=details`,
        });

        results.push({
          label: `Edit manual data for ${prop.address}`,
          icon: <Edit className="h-4 w-4" />,
          href: `/market/manual?propertyId=${prop.id}`,
        });

        results.push({
          label: `Open details for ${prop.address}`,
          icon: <Eye className="h-4 w-4" />,
          href: `/market?highlight=${prop.id}`,
        });
      }
    });

    return results.slice(0, 6);
  };

  const dynamicActions = parseCommand(query);

  const filteredProperties = trackedProperties
    .filter((p) =>
      p.address.toLowerCase().includes(query.toLowerCase()) ||
      p.city.toLowerCase().includes(query.toLowerCase())
    )
    .slice(0, 6);

  const allResults = [
    ...dynamicActions,
    ...filteredProperties.map((prop) => ({
      label: `${prop.address} (${prop.city})`,
      icon: <Eye className="h-4 w-4" />,
      href: `/market?highlight=${prop.id}`,
    })),
  ].slice(0, 10);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!open) return;

      if (e.key === "Escape") {
        onClose();
      }

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, allResults.length - 1));
      }

      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      }

      if (e.key === "Enter" && allResults[selectedIndex]) {
        e.preventDefault();
        const result = allResults[selectedIndex];
        onClose();
        if (result.href) {
          window.location.href = result.href;
        } else if (result.action) {
          result.action();
        }
      }
    };

    if (open) {
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose, selectedIndex, allResults]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center pt-[12vh]">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />

      <div className="relative w-full max-w-2xl mx-4 bg-[var(--market-surface)] border border-[var(--market-border-strong)] rounded-xl shadow-2xl overflow-hidden">
        {/* Search Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--market-border)]">
          <Search className="h-5 w-5 text-[var(--market-text-muted)]" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command: refresh 322, comps for Loudonwood, edit Momrow..."
            className="flex-1 bg-transparent text-lg placeholder:text-[var(--market-text-muted)] focus:outline-none font-medium"
          />
          <kbd className="hidden sm:block text-[10px] px-1.5 py-0.5 rounded bg-[var(--market-surface-raised)] border border-[var(--market-border)] text-[var(--market-text-muted)]">
            ESC
          </kbd>
        </div>

        <div className="max-h-[460px] overflow-auto py-2 text-sm">
          {allResults.length > 0 ? (
            <div className="px-2">
              {allResults.map((result, index) => {
                const isSelected = index === selectedIndex;
                const content = (
                  <>
                    {result.icon}
                    <span>{result.label}</span>
                  </>
                );

                return result.href ? (
                  <Link
                    key={index}
                    href={result.href}
                    onClick={onClose}
                    className={`flex items-center gap-3 px-3 py-2 rounded-md ${isSelected ? "bg-[var(--market-surface-raised)]" : "hover:bg-[var(--market-surface-raised)]"}`}
                  >
                    {content}
                  </Link>
                ) : (
                  <button
                    key={index}
                    onClick={result.action}
                    className={`flex w-full items-center gap-3 px-3 py-2 rounded-md text-left ${isSelected ? "bg-[var(--market-surface-raised)]" : "hover:bg-[var(--market-surface-raised)]"}`}
                  >
                    {content}
                  </button>
                );
              })}
            </div>
          ) : (
            query && (
              <div className="px-4 py-8 text-center text-[var(--market-text-muted)]">
                No matches for “{query}”. Try “refresh 322”, “comps Loudonwood”, or a property address.
              </div>
            )
          )}

          {!query && (
            <div className="px-3 text-[10px] text-[var(--market-text-muted)]">
              Examples: <span className="font-mono">refresh 322</span>, <span className="font-mono">comps for Loudonwood</span>, <span className="font-mono">edit Momrow</span>
            </div>
          )}
        </div>

        <div className="border-t border-[var(--market-border)] px-4 py-2 text-[10px] text-[var(--market-text-muted)] flex justify-between">
          <span>↑↓ Navigate • Enter Select • Type natural commands</span>
          <span>⌘K anywhere</span>
        </div>
      </div>
    </div>
  );
}
