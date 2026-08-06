import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import {
  createEmployee,
  createEmployeeAllowance,
  createEmployeeContract,
  createEmployeeDocument,
  deleteEmployee,
  deleteEmployeeAllowance,
  getEmployee,
  listAllEmployees,
  listEmployeeAllowances,
  listEmployeeContracts,
  listEmployeeDocuments,
  listEmployeeOptions,
  listEmployees,
  listMonthlyHeadcount,
  updateEmployee,
  updateEmployeeAllowance,
  updateMyProfile,
  type CreateEmployeeAllowanceInput,
  type CreateEmployeeContractInput,
  type CreateEmployeeDocumentInput,
  type CreateEmployeeInput,
  type ListEmployeesParams,
  type UpdateEmployeeAllowanceInput,
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
  headcount: (year: number) =>
    [...employeeKeys.all, "headcount", year] as const,
  detail: (id: string) => [...employeeKeys.all, "detail", id] as const,
  contracts: (id: string) => [...employeeKeys.all, id, "contracts"] as const,
  documents: (id: string) => [...employeeKeys.all, id, "documents"] as const,
  allowances: (id: string) => [...employeeKeys.all, id, "allowances"] as const,
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

/** Cumulative month-end headcount (Jan–Dec) for a year. */
export function useMonthlyHeadcount(year: number) {
  return useQuery({
    queryKey: employeeKeys.headcount(year),
    queryFn: () => listMonthlyHeadcount(year),
  });
}

/**
 * Employee id + name options for pickers (e.g. the manager dropdown). Pass
 * `enabled: false` to defer the fetch until it's actually needed.
 */
export function useEmployeeOptions(enabled = true) {
  return useQuery({
    queryKey: employeeKeys.options(),
    queryFn: () => listEmployeeOptions(),
    enabled,
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

// --- allowances -----------------------------------------------------------

export function useEmployeeAllowances(id: string | undefined) {
  return useQuery({
    queryKey: employeeKeys.allowances(id ?? ""),
    queryFn: () => listEmployeeAllowances(id as string),
    enabled: Boolean(id),
  });
}

export function useCreateEmployeeAllowance(employeeId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateEmployeeAllowanceInput) =>
      createEmployeeAllowance(employeeId, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: employeeKeys.allowances(employeeId) });
      toast.success("Allowance added");
    },
  });
}

export function useUpdateEmployeeAllowance(employeeId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      allowanceId,
      input,
    }: {
      allowanceId: string;
      input: UpdateEmployeeAllowanceInput;
    }) => updateEmployeeAllowance(employeeId, allowanceId, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: employeeKeys.allowances(employeeId) });
      toast.success("Allowance updated");
    },
  });
}

export function useDeleteEmployeeAllowance(employeeId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (allowanceId: string) =>
      deleteEmployeeAllowance(employeeId, allowanceId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: employeeKeys.allowances(employeeId) });
      toast.success("Allowance removed");
    },
  });
}
