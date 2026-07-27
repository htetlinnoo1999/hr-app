/**
 * Role constants — the single source of truth for the three roles the API
 * defines. The `Role` type in the API layer is derived from these values.
 *
 * Scope semantics (enforced server-side — the client must not assume more):
 *  - ADMIN       Platform staff. Bypasses org scoping; sees/manages every org.
 *                May pass `organizationId` on list endpoints to filter; omitting
 *                it returns data across all orgs.
 *  - HR_MANAGER  Confined to their own `user.organizationId`.
 *  - EMPLOYEE    Identical permissions to HR_MANAGER today — NOT read-only and
 *                NOT self-scoped. Do not build UI that assumes otherwise.
 */
export const ROLES = {
  ADMIN: "ADMIN",
  HR_MANAGER: "HR_MANAGER",
  EMPLOYEE: "EMPLOYEE",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

/** Every role the API recognizes, as an array (e.g. for iteration/validation). */
export const ALL_ROLES = Object.values(ROLES) as Role[];

/**
 * Query param name for org filtering on list endpoints. Only meaningful for
 * ADMIN — for any non-ADMIN caller the API silently ignores it and scopes to
 * their own org, so the frontend should only ever send it for an ADMIN user.
 */
export const ORGANIZATION_ID_PARAM = "organizationId";

/**
 * The Organizations management section (multi-org list + org CRUD) is shown
 * ONLY to the user whose organizationId matches this value; that user sees the
 * full list of every org. Everyone else never sees the section.
 *
 * Configured via VITE_ORG_MANAGEMENT_ORGANIZATION_ID (see .env). While it is
 * empty/unset, the Organizations section is hidden for everyone.
 */
export const ORG_MANAGEMENT_ORGANIZATION_ID: string =
  import.meta.env.VITE_ORG_MANAGEMENT_ORGANIZATION_ID ?? "";

/** Whether the given user may access the Organizations management section. */
export function canManageOrganizations(
  user: { organizationId: string | null } | null,
): boolean {
  return (
    ORG_MANAGEMENT_ORGANIZATION_ID !== "" &&
    user?.organizationId === ORG_MANAGEMENT_ORGANIZATION_ID
  );
}

/**
 * Whether the user may review (approve/reject) leave requests. Limited to
 * ADMIN and HR_MANAGER; the server enforces this regardless.
 */
export function canReviewLeaves(user: { role?: Role } | null): boolean {
  return user?.role === ROLES.ADMIN || user?.role === ROLES.HR_MANAGER;
}
