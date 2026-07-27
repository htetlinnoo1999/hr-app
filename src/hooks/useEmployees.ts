import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import {
  createEmployee,
  createEmployeeContract,
  createEmployeeDocument,
  deleteEmployee,
  getEmployee,
  listAllEmployees,
  listEmployeeContracts,
  listEmployeeDocuments,
  listEmployeeOptions,
  listEmployees,
  updateEmployee,
  updateMyProfile,
  type CreateEmployeeContractInput,
  type CreateEmployeeDocumentInput,
  type CreateEmployeeInput,
  type ListEmployeesParams,
  type UpdateEmployeeInput,
  type UpdateMyProfileInput,
} from "@/apis/employees";
import { toast } from "@/stores/toastStore";

export const employeeKeys = {
  all: ["employees"] as const,
  list: (params?: ListEmployeesParams) =>
    [...employeeKeys.all, "list", params ?? {}] as const,
  listAll: (params?: Omit<ListEmployeesParams, "page">) =>
    [...employeeKeys.all, "list-all", params ?? {}] as const,
  options: () => [...employeeKeys.all, "options"] as const,
  detail: (id: string) => [...employeeKeys.all, "detail", id] as const,
  contracts: (id: string) => [...employeeKeys.all, id, "contracts"] as const,
  documents: (id: string) => [...employeeKeys.all, id, "documents"] as const,
};

/** One page of employees (server-side pagination). */
export function useEmployees(params: ListEmployeesParams = {}) {
  return useQuery({
    queryKey: employeeKeys.list(params),
    queryFn: () => listEmployees(params),
  });
}

/** Every employee (all pages) — for dropdowns/lookup maps. */
export function useAllEmployees(params: Omit<ListEmployeesParams, "page"> = {}) {
  return useQuery({
    queryKey: employeeKeys.listAll(params),
    queryFn: () => listAllEmployees(params),
  });
}

/** Employee id + name options for pickers (e.g. the manager dropdown). */
export function useEmployeeOptions() {
  return useQuery({
    queryKey: employeeKeys.options(),
    queryFn: () => listEmployeeOptions(),
  });
}

export function useEmployee(id: string | undefined) {
  return useQuery({
    queryKey: employeeKeys.detail(id ?? ""),
    queryFn: () => getEmployee(id as string),
    enabled: Boolean(id),
  });
}

export function useCreateEmployee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateEmployeeInput) => createEmployee(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: employeeKeys.all });
      toast.success("Employee created");
    },
  });
}

export function useUpdateEmployee(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateEmployeeInput) => updateEmployee(id, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: employeeKeys.all });
      toast.success("Employee updated");
    },
  });
}

export function useDeleteEmployee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteEmployee(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: employeeKeys.all });
      toast.success("Employee deleted");
    },
  });
}

/**
 * Update the current user's own profile (PATCH /employees/me). Invalidates the
 * employees list so the derived current employee (useCurrentEmployee) refreshes.
 */
export function useUpdateMyProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateMyProfileInput) => updateMyProfile(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: employeeKeys.all });
      toast.success("Profile updated");
    },
  });
}

export function useEmployeeContracts(id: string | undefined) {
  return useQuery({
    queryKey: employeeKeys.contracts(id ?? ""),
    queryFn: () => listEmployeeContracts(id as string),
    enabled: Boolean(id),
  });
}

export function useCreateEmployeeContract(employeeId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateEmployeeContractInput) =>
      createEmployeeContract(employeeId, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: employeeKeys.contracts(employeeId) });
      toast.success("Contract added");
    },
  });
}

export function useEmployeeDocuments(id: string | undefined) {
  return useQuery({
    queryKey: employeeKeys.documents(id ?? ""),
    queryFn: () => listEmployeeDocuments(id as string),
    enabled: Boolean(id),
  });
}

export function useCreateEmployeeDocument(employeeId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateEmployeeDocumentInput) =>
      createEmployeeDocument(employeeId, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: employeeKeys.documents(employeeId) });
      toast.success("Document added");
    },
  });
}
