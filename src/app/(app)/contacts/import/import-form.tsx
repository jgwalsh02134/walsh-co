"use client";

import Link from "next/link";
import { useActionState } from "react";
import { importContactsFromCsv, type ImportResult } from "../actions";

const labelClass =
  "text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]";
const helperClass = "text-xs text-[var(--color-text-faint)]";
const inputBase =
  "w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-faint)] shadow-[var(--shadow-card)] focus:border-[var(--color-focus)] focus:outline-none focus:ring-2 focus:ring-[var(--color-focus)]/30";

export function ImportForm() {
  const [state, action, pending] = useActionState<ImportResult | null, FormData>(
    importContactsFromCsv,
    null
  );

  return (
    <form action={action} className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <label className={labelClass} htmlFor="csvFile">
          CSV file
        </label>
        <input
          id="csvFile"
          name="csvFile"
          type="file"
          accept=".csv,text/csv"
          className="block w-full cursor-pointer rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)] file:mr-3 file:rounded-[var(--radius-sm)] file:border-0 file:bg-[var(--color-surface-soft)] file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-[var(--color-text)] hover:file:bg-[var(--color-border)]"
        />
        <span className={helperClass}>
          Or paste CSV directly below. Either works.
        </span>
      </div>

      <div className="flex flex-col gap-2">
        <label className={labelClass} htmlFor="csvText">
          Paste CSV
        </label>
        <textarea
          id="csvText"
          name="csvText"
          rows={10}
          placeholder={`firstName,lastName,company,phone,email,category\nJane,Smith,Sample Plumbing,(617) 555-0100,jane@example.com,CONTRACTORS_TRADES`}
          className={`${inputBase} min-h-[180px] font-mono text-xs leading-relaxed`}
        />
      </div>

      <footer className="flex flex-wrap items-center gap-2">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex min-h-[40px] items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-primary)] bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-[var(--color-text-inverse)] hover:bg-[var(--color-primary-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)] disabled:opacity-60"
        >
          {pending ? "Importing…" : "Import contacts"}
        </button>
        <Link
          href="/contacts"
          className="inline-flex min-h-[40px] items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2 text-sm font-medium text-[var(--color-text)] hover:border-[var(--color-border-strong)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)]"
        >
          Cancel
        </Link>
      </footer>

      {state ? <ImportResultPanel result={state} /> : null}
    </form>
  );
}

function ImportResultPanel({ result }: { result: ImportResult }) {
  return (
    <div
      role="status"
      className="flex flex-col gap-3 rounded-[var(--radius-md)] border px-4 py-3 text-sm"
      style={{
        background: result.ok
          ? "var(--semantic-success-bg)"
          : "var(--semantic-warning-bg)",
        borderColor: result.ok
          ? "var(--semantic-success-border)"
          : "var(--semantic-warning-border)",
        color: "var(--color-text)",
      }}
    >
      <div className="flex flex-wrap items-baseline gap-x-5 gap-y-1">
        <span className="font-semibold text-[var(--color-text)]">
          Import {result.ok ? "complete" : "finished with issues"}
        </span>
        <span>
          <strong className="font-mono tabular-nums">
            {result.created}
          </strong>{" "}
          created
        </span>
        <span>
          <strong className="font-mono tabular-nums">
            {result.skipped}
          </strong>{" "}
          skipped
        </span>
        <span>
          <strong className="font-mono tabular-nums">
            {result.errors.length}
          </strong>{" "}
          errors
        </span>
        <span className="text-[var(--color-text-muted)]">
          {result.totalRows} row{result.totalRows === 1 ? "" : "s"} processed
        </span>
      </div>

      {result.errors.length > 0 ? (
        <details className="text-xs">
          <summary className="cursor-pointer font-semibold text-[var(--color-text)]">
            Error details
          </summary>
          <ul className="mt-2 flex flex-col gap-1 text-[var(--color-text-muted)]">
            {result.errors.slice(0, 50).map((e, i) => (
              <li key={i}>
                Row {e.row}: {e.message}
              </li>
            ))}
            {result.errors.length > 50 ? (
              <li>… {result.errors.length - 50} more</li>
            ) : null}
          </ul>
        </details>
      ) : null}

      {result.created > 0 ? (
        <Link
          href="/contacts"
          className="inline-flex w-fit min-h-[36px] items-center justify-center rounded-[var(--radius-sm)] border border-[var(--color-primary)] bg-[var(--color-primary)] px-3 py-1.5 text-xs font-semibold text-[var(--color-text-inverse)] hover:bg-[var(--color-primary-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)]"
        >
          View contacts
        </Link>
      ) : null}
    </div>
  );
}
