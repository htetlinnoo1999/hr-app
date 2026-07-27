import { useQuery } from "@tanstack/react-query";

import { listPositions } from "@/apis/positions";

export const positionKeys = {
  all: ["positions"] as const,
  list: () => [...positionKeys.all, "list"] as const,
};

/** All positions in the caller's org — for the employee form's dropdown. */
export function usePositions() {
  return useQuery({
    queryKey: positionKeys.list(),
    queryFn: () => listPositions(),
  });
}
