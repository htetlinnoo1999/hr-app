import { Navigate, Outlet } from "react-router-dom"

import { canManageOrganizations } from "@/lib/constants"
import { useAuthStore } from "@/stores/authStore"

/**
 * Guards the Organizations management section. Only the org-management user
 * (organizationId === ORG_MANAGEMENT_ORGANIZATION_ID) may enter; everyone else
 * is redirected to /employees.
 */
export function OrgManagementRoute() {
  const user = useAuthStore((s) => s.user)
  if (!canManageOrganizations(user)) {
    return <Navigate to="/employees" replace />
  }
  return <Outlet />
}
