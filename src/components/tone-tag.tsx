import { statusTokens, type StatusTone } from "@/lib/status";

type ToneTagProps = {
  label: string;
  tone: StatusTone;
};

/**
 * Small status pill used across workspace routes. Promoted from
 * inline copies that previously lived in portfolio, properties,
 * budget, documents, tasks pages so future routes can `import` it
 * instead of redefining it.
 */
export function ToneTag({ label, tone }: ToneTagProps) {
  const t = statusTokens[tone];
  return (
    <span
      className="inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium"
      style={{
        background: t.background,
        color: t.text,
        borderColor: t.border,
      }}
    >
      {label}
    </span>
  );
}
