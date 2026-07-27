import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import {
  createDepartment,
  deleteDepartment,
  getDepartment,
  listAllDepartments,
  listDepartments,
  updateDepartment,
  type CreateDepartmentInput,
  type ListDepartmentsParams,
  type UpdateDepartmentInput,
} from "@/apis/departments";
import { toast } from "@/stores/toastStore";

export const departmentKeys = {
  all: ["departments"] as const,
  list: (params?: ListDepartmentsParams) =>
    [...departmentKeys.all, "list", params ?? {}] as const,
  listAll: (params?: Omit<ListDepartmentsParams, "page">) =>
    [...departmentKeys.all, "list-all", params ?? {}] as const,
  detail: (id: string) => [...departmentKeys.all, "detail", id] as const,
};

/** One page of departments (server-side pagination). */
export function useDepartments(params: ListDepartmentsParams = {}) {
  return useQuery({
    queryKey: departmentKeys.list(params),
    queryFn: () => listDepartments(params),
  });
}

/** Every department (all pages) — for dropdowns/lookup maps. */
export function useAllDepartments(
  params: Omit<ListDepartmentsParams, "page"> = {},
) {
  return useQuery({
    queryKey: departmentKeys.listAll(params),
    queryFn: () => listAllDepartments(params),
  });
}

export function useDepartment(id: string | undefined) {
  return useQuery({
    queryKey: departmentKeys.detail(id ?? ""),
    queryFn: () => getDepartment(id as string),
    enabled: Boolean(id),
  });
}

export function useCreateDepartment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateDepartmentInput) => createDepartment(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: departmentKeys.all });
      toast.success("Department created");
    },
  });
}

export function useUpdateDepartment(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateDepartmentInput) => updateDepartment(id, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: departmentKeys.all });
      toast.success("Department updated");
    },
  });
}

export function useDeleteDepartment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteDepartment(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: departmentKeys.all });
      toast.success("Department deleted");
    },
  });
}
