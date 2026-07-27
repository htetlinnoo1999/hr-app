import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import {
  approveLeaveRequest,
  cancelLeaveRequest,
  createLeaveRequest,
  getLeaveRequest,
  listAllLeaveRequests,
  listLeaveRequests,
  rejectLeaveRequest,
  type CreateLeaveRequestInput,
  type ListLeaveRequestsParams,
} from "@/apis/leave-requests";
import { toast } from "@/stores/toastStore";

export const leaveRequestKeys = {
  all: ["leave-requests"] as const,
  list: (params?: ListLeaveRequestsParams) =>
    [...leaveRequestKeys.all, "list", params ?? {}] as const,
  listAll: (params?: Omit<ListLeaveRequestsParams, "page">) =>
    [...leaveRequestKeys.all, "list-all", params ?? {}] as const,
  detail: (id: string) => [...leaveRequestKeys.all, "detail", id] as const,
};

/** One page of leave requests (server-side pagination). */
export function useLeaveRequests(params: ListLeaveRequestsParams = {}) {
  return useQuery({
    queryKey: leaveRequestKeys.list(params),
    queryFn: () => listLeaveRequests(params),
  });
}

/** Every matching leave request (all pages) — for lookups/aggregates. */
export function useAllLeaveRequests(
  params: Omit<ListLeaveRequestsParams, "page"> = {},
) {
  return useQuery({
    queryKey: leaveRequestKeys.listAll(params),
    queryFn: () => listAllLeaveRequests(params),
  });
}

export function useLeaveRequest(id: string | undefined) {
  return useQuery({
    queryKey: leaveRequestKeys.detail(id ?? ""),
    queryFn: () => getLeaveRequest(id as string),
    enabled: Boolean(id),
  });
}

export function useCreateLeaveRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateLeaveRequestInput) => createLeaveRequest(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: leaveRequestKeys.all });
      toast.success("Leave request submitted");
    },
  });
}

export function useCancelLeaveRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => cancelLeaveRequest(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: leaveRequestKeys.all });
      toast.success("Leave request cancelled");
    },
  });
}

/** Approve a pending leave request (ADMIN/HR). */
export function useApproveLeaveRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => approveLeaveRequest(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: leaveRequestKeys.all });
      toast.success("Leave request approved");
    },
  });
}

/** Reject a pending leave request, with an optional note (ADMIN/HR). */
export function useRejectLeaveRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reviewNote }: { id: string; reviewNote?: string }) =>
      rejectLeaveRequest(id, { reviewNote }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: leaveRequestKeys.all });
      toast.success("Leave request rejected");
    },
  });
}
