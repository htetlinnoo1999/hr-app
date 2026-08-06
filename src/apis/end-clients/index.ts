import {
  api,
  fetchAllPages,
  paginationQuery,
  type Paginated,
  type PaginationParams,
} from "@/lib/api";
import { ORGANIZATION_ID_PARAM } from "@/lib/constants";

/**
 * End Clients API — /end-clients.
 *
 * A staffing placement client: the company a contractor/temp employee is
 * placed at, distinct from the employee's own Organization. Org-scoped like
 * every resource — non-ADMIN callers only see/act on their own org, and
 * reaching another org's end client by ID returns 404 (not 403).
 */

export interface EndClient {
  id: string;
  organizationId: string;
  name: string;
  contactPerson: string | null;
  email: string | null;
  whatsappNumber: string | null;
  phone: string | null;
  address: string | null;
  notes: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateEndClientInput {
  // organizationId is derived server-side from the caller's own org — not
  // accepted in the body.
  /** Required, unique within the org → 409 on conflict. */
  name: string;
  contactPerson?: string;
  email?: string;
  whatsappNumber?: string;
  phone?: string;
  address?: string;
  notes?: string;
}

/**
 * PATCH accepts the same shape, all optional. Pass null on an optional field to
 * clear it. Records cannot be moved between organizations. A name clash within
 * the org → 409.
 */
export interface UpdateEndClientInput {
  name?: string;
  contactPerson?: string | null;
  email?: string | null;
  whatsappNumber?: string | null;
  phone?: string | null;
  address?: string | null;
  notes?: string | null;
}

export interface ListEndClientsParams extends PaginationParams {
  /**
   * ADMIN only. Filters to this org. Silently ignored for non-ADMIN callers
   * (always scoped to their own org).
   */
  organizationId?: string;
}

/** POST /end-clients — own org only (403 otherwise). */
export async function createEndClient(
  input: CreateEndClientInput,
): Promise<EndClient> {
  const { data } = await api.post<EndClient>("/end-clients", input);
  return data;
}

/** GET /end-clients — scoped to the caller's org (ADMIN may filter). One page. */
export async function listEndClients(
  params: ListEndClientsParams = {},
): Promise<Paginated<EndClient>> {
  const { data } = await api.get<Paginated<EndClient>>("/end-clients", {
    params: {
      ...paginationQuery(params),
      ...(params.organizationId
        ? { [ORGANIZATION_ID_PARAM]: params.organizationId }
        : {}),
    },
  });
  return data;
}

/** Every end client across all pages — for dropdowns/lookup maps. */
export async function listAllEndClients(
  params: Omit<ListEndClientsParams, "page"> = {},
): Promise<EndClient[]> {
  return fetchAllPages((page) => listEndClients({ ...params, page }));
}

/** GET /end-clients/:id — own org only (404 otherwise). */
export async function getEndClient(id: string): Promise<EndClient> {
  const { data } = await api.get<EndClient>(
    `/end-clients/${encodeURIComponent(id)}`,
  );
  return data;
}

/** PATCH /end-clients/:id — own org only (404 otherwise). */
export async function updateEndClient(
  id: string,
  input: UpdateEndClientInput,
): Promise<EndClient> {
  const { data } = await api.patch<EndClient>(
    `/end-clients/${encodeURIComponent(id)}`,
    input,
  );
  return data;
}

/**
 * DELETE /end-clients/:id — own org only. Returns 409 if any employees are
 * still assigned to this end client (reassign/clear them first).
 */
export async function deleteEndClient(id: string): Promise<void> {
  await api.delete(`/end-clients/${encodeURIComponent(id)}`);
}
