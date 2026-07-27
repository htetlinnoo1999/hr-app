/** Format an ISO date string as e.g. "Jun 15, 1995". Returns "—" if empty. */
export function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/**
 * Format a numeric amount with thousands separators. Accepts a number or a
 * decimal string (the API serializes salary as a string like "1500000").
 */
export function formatNumber(
  value: number | string | null | undefined,
): string {
  if (value == null || value === "") return "—";
  const n = typeof value === "string" ? Number(value) : value;
  if (Number.isNaN(n)) return String(value);
  return n.toLocaleString();
}

/** Turn an enum-ish token like ON_LEAVE into "On leave". */
export function humanizeEnum(value: string | null | undefined): string {
  if (!value) return "—";
  const lower = value.replace(/_/g, " ").toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

/**
 * Two-letter avatar acronym from first + last name (e.g. "Jane Doe" → "JD").
 * Falls back to the first two characters of `fallback` (an email), then "?".
 */
export function initials(
  first?: string | null,
  last?: string | null,
  fallback?: string | null,
): string {
  const a = first?.trim().charAt(0) ?? "";
  const b = last?.trim().charAt(0) ?? "";
  const fromName = (a + b).toUpperCase();
  if (fromName) return fromName;
  return (fallback?.trim().slice(0, 2) || "?").toUpperCase();
}
