import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  listAllLeaveTypes,
  updateLeaveType,
  type ListLeaveTypesParams,
  type UpdateLeaveTypeInput,
} from "@/apis/leave-types";
import { toast } from "@/stores/toastStore";

export const leaveTypeKeys = {
  all: ["leave-types"] as const,
  listAll: (params?: Omit<ListLeaveTypesParams, "page">) =>
    [...leaveTypeKeys.all, "list-all", params ?? {}] as const,
};

/** Every leave type in the given org (defaults to the caller's own org). */
export function useAllLeaveTypes(organizationId?: string) {
  const params = organizationId ? { organizationId } : {};
  return useQuery({
    queryKey: leaveTypeKeys.listAll(params),
    queryFn: () => listAllLeaveTypes(params),
  });
}

/** PATCH /leave-types/:id — update the yearly allowance. */
export function useUpdateLeaveType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: UpdateLeaveTypeInput & { id: string }) =>
      updateLeaveType(id, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: leaveTypeKeys.all });
      toast.success("Leave type updated");
    },
  });
}
