import {
  api,
  fetchAllPages,
  paginationQuery,
  type Paginated,
  type PaginationParams,
} from "@/lib/api";
import { ORGANIZATION_ID_PARAM } from "@/lib/constants";

/**
 * Departments API — /departments.
 *
 * Full CRUD for any authenticated user within their own org (no admin gate
 * beyond the standard org-scoping). Reaching another org's department by ID
 * returns 404 (not 403) — treat as "not found".
 */

export interface Department {
  id: string;
  organizationId: string;
  name: string;
  description: string | null;
  /** Employee ID of the manager, or null if unassigned. */
  managerId: string | null;
  // Not documented in the API spec — optional until verified against a live
  // response.
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateDepartmentInput {
  // organizationId is derived server-side from the caller's own org — not
  // accepted in the body.
  /** Required, min 1 char, unique within the org (not globally) → 409. */
  name: string;
  description?: string;
  /**
   * Employee ID of the manager. Must be an existing employee in the same org
   * (404 if missing, 400 if cross-org) and not already managing another
   * department (409 if already assigned).
   */
  managerId?: string;
}

/**
 * organizationId is create-only, so it is intentionally omitted here. Pass
 * managerId: null to clear an existing manager.
 */
export interface UpdateDepartmentInput {
  name?: string;
  description?: string | null;
  managerId?: string | null;
}

export interface ListDepartmentsParams extends PaginationParams {
  /**
   * ADMIN only. Filters to this org. Silently ignored for non-ADMIN callers
   * (always scoped to their own org). Omit as ADMIN to get every org.
   */
  organizationId?: string;
}

/** POST /departments — any authenticated user, own org only. */
export async function createDepartment(
  input: CreateDepartmentInput,
): Promise<Department> {
  const { data } = await api.post<Department>("/departments", input);
  return data;
}

/** GET /departments — scoped to the caller's org (ADMIN may filter/see all). One page. */
export async function listDepartments(
  params: ListDepartmentsParams = {},
): Promise<Paginated<Department>> {
  const { data } = await api.get<Paginated<Department>>("/departments", {
    params: {
      ...paginationQuery(params),
      ...(params.organizationId
        ? { [ORGANIZATION_ID_PARAM]: params.organizationId }
        : {}),
    },
  });
  return data;
}

/** Every department across all pages — for dropdowns/lookup maps. */
export async function listAllDepartments(
  params: Omit<ListDepartmentsParams, "page"> = {},
): Promise<Department[]> {
  return fetchAllPages((page) => listDepartments({ ...params, page }));
}

/** GET /departments/:id — own org only (404 otherwise). */
export async function getDepartment(id: string): Promise<Department> {
  const { data } = await api.get<Department>(
    `/departments/${encodeURIComponent(id)}`,
  );
  return data;
}

/** PATCH /departments/:id — own org only (404 otherwise). */
export async function updateDepartment(
  id: string,
  input: UpdateDepartmentInput,
): Promise<Department> {
  const { data } = await api.patch<Department>(
    `/departments/${encodeURIComponent(id)}`,
    input,
  );
  return data;
}

/**
 * DELETE /departments/:id — own org only. Returns 409 if the department still
 * has employees or positions assigned (reassign/clear them first).
 */
export async function deleteDepartment(id: string): Promise<void> {
  await api.delete(`/departments/${encodeURIComponent(id)}`);
}
