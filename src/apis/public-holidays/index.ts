import { api } from "@/lib/api";

/**
 * Public Holidays API — /public-holidays.
 *
 * A reference list of statutory public holidays (not paginated). Read-only from
 * this client — used to mark non-working days on the leave calendar.
 *
 * NOTE: the API spec documents the endpoint but not its response schema (it
 * only says "Array of all public holidays"). The shape below is inferred from
 * convention; `countryId` is optional because holidays may be country-specific
 * (relevant for cross-border/EOR orgs) or global. Verify against a live
 * response before relying on the exact field names.
 */

export interface PublicHoliday {
  id: string;
  /** Holiday name, e.g. "New Year's Day". */
  name: string;
  /** ISO 8601 date string (day-accurate). */
  date: string;
  /** Country the holiday applies to (Countries API), if country-specific. */
  countryId?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

/** GET /public-holidays — plain array of every public holiday. */
export async function listPublicHolidays(): Promise<PublicHoliday[]> {
  const { data } = await api.get<PublicHoliday[]>("/public-holidays");
  return data;
}
