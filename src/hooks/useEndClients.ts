import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  createEndClient,
  deleteEndClient,
  getEndClient,
  listAllEndClients,
  listEndClients,
  updateEndClient,
  type CreateEndClientInput,
  type ListEndClientsParams,
  type UpdateEndClientInput,
} from "@/apis/end-clients";
import { toast } from "@/stores/toastStore";

export const endClientKeys = {
  all: ["end-clients"] as const,
  list: (params?: ListEndClientsParams) =>
    [...endClientKeys.all, "list", params ?? {}] as const,
  listAll: (params?: Omit<ListEndClientsParams, "page">) =>
    [...endClientKeys.all, "list-all", params ?? {}] as const,
  detail: (id: string) => [...endClientKeys.all, "detail", id] as const,
};

/** One page of end clients (server-side pagination). */
export function useEndClients(params: ListEndClientsParams = {}) {
  return useQuery({
    queryKey: endClientKeys.list(params),
    queryFn: () => listEndClients(params),
  });
}

/**
 * Every end client (all pages) — for dropdowns/lookup maps. Pass
 * `enabled: false` to skip the fetch where it isn't needed.
 */
export function useAllEndClients(
  params: Omit<ListEndClientsParams, "page"> = {},
  enabled = true,
) {
  return useQuery({
    queryKey: endClientKeys.listAll(params),
    queryFn: () => listAllEndClients(params),
    enabled,
  });
}

export function useEndClient(id: string | undefined) {
  return useQuery({
    queryKey: endClientKeys.detail(id ?? ""),
    queryFn: () => getEndClient(id as string),
    enabled: Boolean(id),
  });
}

export function useCreateEndClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateEndClientInput) => createEndClient(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: endClientKeys.all });
      toast.success("End client created");
    },
  });
}

export function useUpdateEndClient(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateEndClientInput) => updateEndClient(id, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: endClientKeys.all });
      toast.success("End client updated");
    },
  });
}

export function useDeleteEndClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteEndClient(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: endClientKeys.all });
      toast.success("End client deleted");
    },
  });
}
