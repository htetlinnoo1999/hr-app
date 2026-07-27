import { Navigate, Outlet, useLocation } from "react-router-dom"

import { useIsAuthenticated } from "@/stores/authStore"

/**
 * Guards nested routes. Unauthenticated visitors are redirected to /login,
 * preserving where they were headed so we can send them back after login.
 */
export function ProtectedRoute() {
  const isAuthenticated = useIsAuthenticated()
  const location = useLocation()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  return <Outlet />
}
