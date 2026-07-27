import { QueryClient } from "@tanstack/react-query";

/**
 * Shared React Query client. Server data (employees, orgs, …) is fetched and
 * cached here; auth state stays in the zustand store.
 *
 * A 401 is handled globally by the axios interceptor (it logs the user out),
 * so there's no point retrying those — and cross-org access returns 404, which
 * is a real "not found", also not worth retrying.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
  },
});
