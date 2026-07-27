import { api } from "@/lib/api";

/**
 * Countries API — /countries.
 *
 * A static reference list (not org-scoped, not paginated) used to populate the
 * employee form's country dropdown. Read-only from this client.
 */

export interface Country {
  id: string;
  name: string;
}

/** GET /countries — plain array of every country. */
export async function listCountries(): Promise<Country[]> {
  const { data } = await api.get<Country[]>("/countries");
  return data;
}
