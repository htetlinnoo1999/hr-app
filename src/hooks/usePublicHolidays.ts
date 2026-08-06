import { useQuery } from "@tanstack/react-query";

import { listPublicHolidays } from "@/apis/public-holidays";

export const publicHolidayKeys = {
  all: ["public-holidays"] as const,
  list: () => [...publicHolidayKeys.all, "list"] as const,
};

/** All public holidays — for marking non-working days on the leave calendar. */
export function usePublicHolidays() {
  return useQuery({
    queryKey: publicHolidayKeys.list(),
    queryFn: () => listPublicHolidays(),
    // Reference data that changes at most once a year — keep it fresh for the
    // whole session.
    staleTime: Infinity,
  });
}
