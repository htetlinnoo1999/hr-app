import {
  api,
  fetchAllPages,
  paginationQuery,
  type Paginated,
  type PaginationParams,
} from "@/lib/api";
import { ORGANIZATION_ID_PARAM } from "@/lib/constants";

/**
 * Organizations API — /organizations.
 *
 * Scoping (enforced server-side): non-ADMIN callers only ever see/act on their
 * own org. Reaching another org's resource by ID returns 404 (not 403) — treat
 * that as "not found", never "access denied". List/create are ADMIN-only.
 */

export interface Organization {
  id: string;
  name: string;
  slug: string;
  primaryColor: string | null;
  secondaryColor: string | null;
  logo: string | null;
  isDefault: boolean;
  // Timestamps are not documented in the API spec — included as optional since
  // they are conventionally present. Verify against a live response before
  // relying on them.
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Resolved branding for an org (GET /:id/branding). Missing fields on a
 * non-default org fall back to the org with isDefault: true.
 */
export interface OrganizationBranding {
  primaryColor: string | null;
  secondaryColor: string | null;
  logo: string | null;
}

/**
 * Slug rule from the API: lowercase alphanumeric + hyphens only. Exported for
 * client-side form validation; the server enforces it regardless.
 */
export const ORGANIZATION_SLUG_PATTERN = /^[a-z0-9-]+$/;

export interface CreateOrganizationInput {
  /** Required, min 2 chars, must be unique (409 on conflict). */
  name: string;
  /** Required, must match ORGANIZATION_SLUG_PATTERN, must be unique (409). */
  slug: string;
  primaryColor?: string;
  secondaryColor?: string;
  logo?: string;
  /** ADMIN only — 403 for anyone else, even on their own org. */
  isDefault?: boolean;
}

export type UpdateOrganizationInput = Partial<CreateOrganizationInput>;

export interface ListOrganizationsParams extends PaginationParams {
  /**
   * ADMIN only. Filters the list to this org. Silently ignored for non-ADMIN
   * callers (they are always scoped to their own org). Omit as ADMIN to get
   * every org across all tenants.
   */
  organizationId?: string;
}

/** POST /organizations — ADMIN only (403 otherwise). */
export async function createOrganization(
  input: CreateOrganizationInput,
): Promise<Organization> {
  const { data } = await api.post<Organization>("/organizations", input);
  return data;
}

/** GET /organizations — ADMIN only (403 otherwise). One page. */
export async function listOrganizations(
  params: ListOrganizationsParams = {},
): Promise<Paginated<Organization>> {
  const { data } = await api.get<Paginated<Organization>>("/organizations", {
    params: {
      ...paginationQuery(params),
      ...(params.organizationId
        ? { [ORGANIZATION_ID_PARAM]: params.organizationId }
        : {}),
    },
  });
  return data;
}

/** Every organization across all pages — for dropdowns/lookup maps. */
export async function listAllOrganizations(
  params: Omit<ListOrganizationsParams, "page"> = {},
): Promise<Organization[]> {
  return fetchAllPages((page) => listOrganizations({ ...params, page }));
}

/** GET /organizations/:id — any authenticated user, own org only (404 otherwise). */
export async function getOrganization(id: string): Promise<Organization> {
  const { data } = await api.get<Organization>(
    `/organizations/${encodeURIComponent(id)}`,
  );
  return data;
}

/** GET /organizations/slug/:slug — any authenticated user, own org only (404 otherwise). */
export async function getOrganizationBySlug(
  slug: string,
): Promise<Organization> {
  const { data } = await api.get<Organization>(
    `/organizations/slug/${encodeURIComponent(slug)}`,
  );
  return data;
}

/** GET /organizations/:id/branding — any authenticated user, own org only. */
export async function getOrganizationBranding(
  id: string,
): Promise<OrganizationBranding> {
  const { data } = await api.get<OrganizationBranding>(
    `/organizations/${encodeURIComponent(id)}/branding`,
  );
  return data;
}

/** PATCH /organizations/:id — any authenticated user, own org only (404 otherwise). */
export async function updateOrganization(
  id: string,
  input: UpdateOrganizationInput,
): Promise<Organization> {
  const { data } = await api.patch<Organization>(
    `/organizations/${encodeURIComponent(id)}`,
    input,
  );
  return data;
}

/**
 * DELETE /organizations/:id — ADMIN only. Returns 409 if the org still has
 * employees.
 */
export async function deleteOrganization(id: string): Promise<void> {
  await api.delete(`/organizations/${encodeURIComponent(id)}`);
}
