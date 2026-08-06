import { useQuery } from "@tanstack/react-query";

import { listCountries } from "@/apis/countries";

export const countryKeys = {
  all: ["countries"] as const,
  list: () => [...countryKeys.all, "list"] as const,
};

/**
 * All countries — for the employee form's country dropdown and name lookups.
 * Pass `enabled: false` to skip the fetch where it isn't needed.
 */
export function useCountries(enabled = true) {
  return useQuery({
    queryKey: countryKeys.list(),
    queryFn: () => listCountries(),
    enabled,
    // Static reference data — safe to keep fresh for the whole session.
    staleTime: Infinity,
  });
}
