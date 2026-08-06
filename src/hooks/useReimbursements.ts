import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  approveReimbursement,
  cancelReimbursement,
  createReimbursement,
  getReimbursement,
  listAllReimbursements,
  listReimbursements,
  markReimbursementPaid,
  rejectReimbursement,
  type CreateReimbursementInput,
  type ListReimbursementsParams,
  type ReviewReimbursementInput,
} from "@/apis/reimbursements";
import { toast } from "@/stores/toastStore";

export const reimbursementKeys = {
  all: ["reimbursements"] as const,
  list: (params?: ListReimbursementsParams) =>
    [...reimbursementKeys.all, "list", params ?? {}] as const,
  listAll: (params?: Omit<ListReimbursementsParams, "page">) =>
    [...reimbursementKeys.all, "list-all", params ?? {}] as const,
  detail: (id: string) => [...reimbursementKeys.all, "detail", id] as const,
};

/** One page of reimbursements (server-side pagination). */
export function useReimbursements(params: ListReimbursementsParams = {}) {
  return useQuery({
    queryKey: reimbursementKeys.list(params),
    queryFn: () => listReimbursements(params),
  });
}

/** Every matching reimbursement (all pages) — for an employee's own list. */
export function useAllReimbursements(
  params: Omit<ListReimbursementsParams, "page"> = {},
  enabled = true,
) {
  return useQuery({
    queryKey: reimbursementKeys.listAll(params),
    queryFn: () => listAllReimbursements(params),
    enabled,
  });
}

export function useReimbursement(id: string | undefined) {
  return useQuery({
    queryKey: reimbursementKeys.detail(id ?? ""),
    queryFn: () => getReimbursement(id as string),
    enabled: Boolean(id),
  });
}

export function useCreateReimbursement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateReimbursementInput) => createReimbursement(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: reimbursementKeys.all });
      toast.success("Reimbursement submitted");
    },
  });
}

export function useCancelReimbursement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => cancelReimbursement(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: reimbursementKeys.all });
      toast.success("Reimbursement cancelled");
    },
  });
}

export function useApproveReimbursement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reviewNote }: { id: string; reviewNote?: string }) =>
      approveReimbursement(id, { reviewNote }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: reimbursementKeys.all });
      toast.success("Reimbursement approved");
    },
  });
}

export function useRejectReimbursement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reviewNote }: { id: string; reviewNote?: string }) =>
      rejectReimbursement(id, { reviewNote } as ReviewReimbursementInput),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: reimbursementKeys.all });
      toast.success("Reimbursement rejected");
    },
  });
}

export function useMarkReimbursementPaid() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => markReimbursementPaid(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: reimbursementKeys.all });
      toast.success("Marked as paid");
    },
  });
}
