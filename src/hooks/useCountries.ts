import { useQuery } from "@tanstack/react-query";

import { listCountries } from "@/apis/countries";

export const countryKeys = {
  all: ["countries"] as const,
  list: () => [...countryKeys.all, "list"] as const,
};

/** All countries — for the employee form's country dropdown. */
export function useCountries() {
  return useQuery({
    queryKey: countryKeys.list(),
    queryFn: () => listCountries(),
    // Static reference data — safe to keep fresh for the whole session.
    staleTime: Infinity,
  });
}
