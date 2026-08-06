/** Visa-expiry status, for compliance surfacing. */

export type VisaStatus = "none" | "ok" | "expiring" | "expired";

/** A visa within this many months of expiry counts as "expiring soon". */
export const VISA_EXPIRING_MONTHS = 2;

/**
 * Classify a visa end date relative to today: past → "expired", within
 * {@link VISA_EXPIRING_MONTHS} months → "expiring", otherwise "ok" (or "none"
 * when unset). Dates are compared day-accurately in local time.
 */
export function visaStatus(
  visaEndDate: string | null | undefined,
  now = new Date(),
): VisaStatus {
  if (!visaEndDate) return "none";

  const [y, m, d] = visaEndDate.slice(0, 10).split("-").map(Number);
  const end = new Date(y, m - 1, d);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (end < today) return "expired";

  // Today + 2 months (JS normalizes month/day overflow, incl. year rollover).
  const threshold = new Date(
    today.getFullYear(),
    today.getMonth() + VISA_EXPIRING_MONTHS,
    today.getDate(),
  );
  if (end <= threshold) return "expiring";

  return "ok";
}
