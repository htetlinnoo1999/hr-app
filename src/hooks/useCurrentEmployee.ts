import { useEmployee } from "@/hooks/useEmployees";
import { useAuthStore } from "@/stores/authStore";

/**
 * The employee record for the logged-in user. The auth user's id IS the
 * employee id, so this is a direct GET /employees/{id} — no listing/filtering,
 * which keeps working once the employees list is paginated.
 *
 * `employee` is null while loading, or when the account has no employee record
 * (the request 404s — surfaced via isError).
 */
export function useCurrentEmployee() {
  const user = useAuthStore((s) => s.user);
  const query = useEmployee(user?.id);
  return { ...query, employee: query.data ?? null };
}
