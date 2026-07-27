import { api } from "@/lib/api";

/**
 * Positions API — /positions.
 *
 * Org-scoped like every resource: non-ADMIN callers only see their own org's
 * positions. Currently read-only from this client (used to populate the
 * employee form's position dropdown).
 */

export interface Position {
  id: string;
  title: string;
  description: string | null;
  createdAt?: string;
  updatedAt?: string;
}

/** GET /positions — plain array, scoped to the caller's org. */
export async function listPositions(): Promise<Position[]> {
  const { data } = await api.get<Position[]>("/positions");
  return data;
}
