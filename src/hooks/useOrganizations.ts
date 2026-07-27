import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import {
  createOrganization,
  deleteOrganization,
  getOrganization,
  getOrganizationBranding,
  listAllOrganizations,
  listOrganizations,
  updateOrganization,
  type CreateOrganizationInput,
  type ListOrganizationsParams,
  type UpdateOrganizationInput,
} from "@/apis/organizations";
import { toast } from "@/stores/toastStore";

export const organizationKeys = {
  all: ["organizations"] as const,
  list: (params?: ListOrganizationsParams) =>
    [...organizationKeys.all, "list", params ?? {}] as const,
  listAll: (params?: Omit<ListOrganizationsParams, "page">) =>
    [...organizationKeys.all, "list-all", params ?? {}] as const,
  detail: (id: string) => [...organizationKeys.all, "detail", id] as const,
  branding: (id: string) => [...organizationKeys.all, id, "branding"] as const,
};

/** One page of organizations (server-side pagination). */
export function useOrganizations(params: ListOrganizationsParams = {}) {
  return useQuery({
    queryKey: organizationKeys.list(params),
    queryFn: () => listOrganizations(params),
  });
}

/** Every organization (all pages) — for dropdowns/lookup maps. */
export function useAllOrganizations(
  params: Omit<ListOrganizationsParams, "page"> = {},
) {
  return useQuery({
    queryKey: organizationKeys.listAll(params),
    queryFn: () => listAllOrganizations(params),
  });
}

export function useOrganization(id: string | undefined) {
  return useQuery({
    queryKey: organizationKeys.detail(id ?? ""),
    queryFn: () => getOrganization(id as string),
    enabled: Boolean(id),
  });
}

export function useOrganizationBranding(id: string | undefined) {
  return useQuery({
    queryKey: organizationKeys.branding(id ?? ""),
    queryFn: () => getOrganizationBranding(id as string),
    enabled: Boolean(id),
  });
}

export function useCreateOrganization() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateOrganizationInput) => createOrganization(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: organizationKeys.all });
      toast.success("Organization created");
    },
  });
}

export function useUpdateOrganization(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateOrganizationInput) => updateOrganization(id, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: organizationKeys.all });
      toast.success("Organization updated");
    },
  });
}

export function useDeleteOrganization() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteOrganization(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: organizationKeys.all });
      toast.success("Organization deleted");
    },
  });
}
