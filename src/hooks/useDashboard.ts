import { useQuery } from "@tanstack/react-query";

import { getDashboardSummary } from "@/apis/dashboard";

export const dashboardKeys = {
  all: ["dashboard"] as const,
  summary: () => [...dashboardKeys.all, "summary"] as const,
};

/** The dashboard's four headline counts (server-computed). */
export function useDashboardSummary() {
  return useQuery({
    queryKey: dashboardKeys.summary(),
    queryFn: () => getDashboardSummary(),
  });
}
