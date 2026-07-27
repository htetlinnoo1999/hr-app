import {
  api,
  fetchAllPages,
  paginationQuery,
  type Paginated,
  type PaginationParams,
} from "@/lib/api";
import { ORGANIZATION_ID_PARAM } from "@/lib/constants";

/**
 * Leave types API — /leave-types.
 *
 * Org-scoped like every resource. These are the per-org leave categories (e.g.
 * "Annual Leave") and their yearly allowance. This client only reads the list
 * and updates `daysPerYear` — no create/delete.
 */

export interface LeaveType {
  id: string;
  name: string;
  /** Yearly allowance in days — the only field editable from this client. */
  daysPerYear: number;
  organizationId?: string;
  description?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface ListLeaveTypesParams extends PaginationParams {
  /**
   * ADMIN only. Filters to this org. Silently ignored for non-ADMIN callers
   * (always scoped to their own org).
   */
  organizationId?: string;
}

export interface UpdateLeaveTypeInput {
  daysPerYear: number;
}

/** GET /leave-types — scoped to the caller's org (ADMIN may filter). One page. */
export async function listLeaveTypes(
  params: ListLeaveTypesParams = {},
): Promise<Paginated<LeaveType>> {
  const { data } = await api.get<Paginated<LeaveType>>("/leave-types", {
    params: {
      ...paginationQuery(params),
      ...(params.organizationId
        ? { [ORGANIZATION_ID_PARAM]: params.organizationId }
        : {}),
    },
  });
  return data;
}

/** Every leave type across all pages — the org has only a handful. */
export async function listAllLeaveTypes(
  params: Omit<ListLeaveTypesParams, "page"> = {},
): Promise<LeaveType[]> {
  return fetchAllPages((page) => listLeaveTypes({ ...params, page }));
}

/** PATCH /leave-types/:id — update the yearly allowance only. */
export async function updateLeaveType(
  id: string,
  input: UpdateLeaveTypeInput,
): Promise<LeaveType> {
  const { data } = await api.patch<LeaveType>(
    `/leave-types/${encodeURIComponent(id)}`,
    input,
  );
  return data;
}
