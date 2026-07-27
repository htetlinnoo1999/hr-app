import {
  api,
  fetchAllPages,
  paginationQuery,
  type Paginated,
  type PaginationParams,
  type Role,
} from "@/lib/api";
import type { Organization } from "@/apis/organizations";
import type { LeaveStatus } from "@/apis/leave-requests";
import { ORGANIZATION_ID_PARAM } from "@/lib/constants";

/**
 * Employees API — /employees (plus /:id/contracts and /:id/documents).
 *
 * Org-scoped like every resource: non-ADMIN callers only see/act on their own
 * org, and reaching another org's employee by ID returns 404 (not 403). Sub-
 * resources inherit the parent employee's scoping — 404 if you can't access
 * the employee.
 */

// --- enums ----------------------------------------------------------------
// Single source of truth for the employee enums. `*_VALUES` arrays are handy
// for building select/dropdown options; the derived types stay in sync.

export const GENDERS = {
  MALE: "MALE",
  FEMALE: "FEMALE",
  OTHER: "OTHER",
} as const;
export type Gender = (typeof GENDERS)[keyof typeof GENDERS];
export const GENDER_VALUES = Object.values(GENDERS) as Gender[];

export const IDENTIFICATION_TYPES = {
  NRC: "NRC",
  PASSPORT: "PASSPORT",
} as const;
export type IdentificationType =
  (typeof IDENTIFICATION_TYPES)[keyof typeof IDENTIFICATION_TYPES];
export const IDENTIFICATION_TYPE_VALUES = Object.values(
  IDENTIFICATION_TYPES,
) as IdentificationType[];

export const EMPLOYEE_STATUSES = {
  ACTIVE: "ACTIVE",
  INACTIVE: "INACTIVE",
  ON_LEAVE: "ON_LEAVE",
  TERMINATED: "TERMINATED",
} as const;
export type EmployeeStatus =
  (typeof EMPLOYEE_STATUSES)[keyof typeof EMPLOYEE_STATUSES];
export const EMPLOYEE_STATUS_VALUES = Object.values(
  EMPLOYEE_STATUSES,
) as EmployeeStatus[];

export const EMPLOYMENT_TYPES = {
  FULL_TIME: "FULL_TIME",
  PART_TIME: "PART_TIME",
  CONTRACTOR: "CONTRACTOR",
  INTERN: "INTERN",
  TEMPORARY: "TEMPORARY",
} as const;
export type EmploymentType =
  (typeof EMPLOYMENT_TYPES)[keyof typeof EMPLOYMENT_TYPES];
export const EMPLOYMENT_TYPE_VALUES = Object.values(
  EMPLOYMENT_TYPES,
) as EmploymentType[];

export const CONTRACT_TYPES = {
  PERMANENT: "PERMANENT",
  FIXED_TERM: "FIXED_TERM",
  PROBATION: "PROBATION",
  INTERNSHIP: "INTERNSHIP",
  CONTRACTOR: "CONTRACTOR",
} as const;
export type ContractType = (typeof CONTRACT_TYPES)[keyof typeof CONTRACT_TYPES];
export const CONTRACT_TYPE_VALUES = Object.values(
  CONTRACT_TYPES,
) as ContractType[];

export const CONTRACT_STATUSES = {
  ACTIVE: "ACTIVE",
  EXPIRED: "EXPIRED",
  TERMINATED: "TERMINATED",
} as const;
export type ContractStatus =
  (typeof CONTRACT_STATUSES)[keyof typeof CONTRACT_STATUSES];
export const CONTRACT_STATUS_VALUES = Object.values(
  CONTRACT_STATUSES,
) as ContractStatus[];

// --- entities -------------------------------------------------------------
// No response schema is defined in the spec — entities are built from the
// documented fields. Timestamps are optional until verified against a live
// response.

/** Leave type as embedded on an employee's leave relations ({ id, name }). */
export interface EmbeddedLeaveType {
  id: string;
  name: string;
}

/**
 * A leave balance embedded on the single-employee fetch (`leaveBalances[]`).
 * Distinct from a standalone resource — it carries the resolved `leaveType`.
 */
export interface EmployeeLeaveBalance {
  id: string;
  employeeId: string;
  leaveTypeId: string;
  year: number;
  totalDays: number;
  usedDays: number;
  remainingDays: number;
  leaveType: EmbeddedLeaveType;
}

/**
 * A leave request embedded on the single-employee fetch (`leaveRequests[]`).
 * This shape differs from the standalone {@link LeaveRequest}: it embeds the
 * resolved `leaveType` object (not the enum), and adds `totalDays`/review
 * fields. The list is filtered to APPROVED requests server-side.
 */
export interface EmployeeLeaveRequest {
  id: string;
  employeeId: string;
  leaveTypeId: string;
  /** ISO 8601 date string. */
  startDate: string;
  /** ISO 8601 date string. */
  endDate: string;
  totalDays: number;
  reason: string | null;
  /** Always APPROVED here — the embedded list is filtered server-side. */
  status: LeaveStatus;
  /** Reviewer's employee id. */
  reviewedBy: string | null;
  reviewNote: string | null;
  createdAt: string;
  updatedAt: string;
  leaveType: EmbeddedLeaveType;
}

export interface Employee {
  id: string;
  organizationId: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  /** Preferred display name, set by the employee via PATCH /employees/me. */
  nickname: string | null;
  /** Profile picture URL. Currently read-only from this client. */
  profilePicture: string | null;
  email: string;
  /** Optional secondary/personal email. May be absent on older records. */
  personalEmail?: string | null;
  role: Role;
  /** Bank name for payroll. May be absent on older records. */
  bankName?: string | null;
  phone?: string | null;
  gender: Gender | null;
  dateOfBirth: string | null;
  nationality: string | null;
  identificationType: IdentificationType | null;
  identificationNumber: string | null;
  /** Residential address. May be absent on older records. */
  address?: string | null;
  /** Bank account number for payroll. May be absent on older records. */
  bankAccountNumber?: string | null;
  hireDate: string;
  /**
   * Serialized as a decimal string by the API (e.g. "1500000"). Omitted from
   * the list projection — present on the single-employee fetch.
   */
  salary?: string;
  status: EmployeeStatus;
  employmentType: EmploymentType;
  departmentId: string | null;
  /** Assigned position (see the Positions API). Settable via create/update. */
  positionId: string | null;
  /** Country of residence (see the Countries API). Settable via create/update. */
  countryId: string | null;
  managerId: string | null;
  createdAt?: string;
  updatedAt?: string;
  // Relations the API may embed on a single-employee fetch.
  organization?: Organization;
  leaveBalances?: EmployeeLeaveBalance[];
  leaveRequests?: EmployeeLeaveRequest[];
}

export interface EmployeeContract {
  id: string;
  employeeId: string;
  contractType: ContractType;
  startDate: string;
  endDate: string | null;
  fileUrl: string | null;
  status: ContractStatus;
  createdAt?: string;
  updatedAt?: string;
}

export interface EmployeeDocument {
  id: string;
  employeeId: string;
  documentType: string;
  fileUrl: string;
  description: string | null;
  createdAt?: string;
  updatedAt?: string;
}

// --- inputs ---------------------------------------------------------------
// userId is intentionally omitted (no userId validation on this client).

export interface CreateEmployeeInput {
  /** Required. A non-ADMIN must pass their own org's id → 403 otherwise. */
  organizationId: string;
  /** Required, globally unique → 409. */
  employeeCode: string;
  firstName: string;
  lastName: string;
  /** Required, valid email, globally unique → 409. */
  email: string;
  /** Optional secondary/personal email. */
  personalEmail?: string;
  /** Required, positive, max 2 decimal places. */
  salary: number;
  phone?: string;
  gender?: Gender;
  /** ISO 8601 date string. */
  dateOfBirth?: string;
  nationality?: string;
  identificationType?: IdentificationType;
  /** Globally unique if provided → 409. */
  identificationNumber?: string;
  address?: string;
  bankName?: string;
  bankAccountNumber?: string;
  /** ISO 8601 date string. Defaults to now server-side. */
  hireDate?: string;
  /** Defaults to ACTIVE server-side. */
  status?: EmployeeStatus;
  /** Defaults to FULL_TIME server-side. */
  employmentType?: EmploymentType;
  /** Must exist and be in the same org (404 / 400). */
  departmentId?: string;
  /** Position in the same org (404 / 400 if invalid). */
  positionId?: string;
  /** Country of residence (from the Countries API). */
  countryId?: string;
  /** Existing employee in the same org (404 / 400); cannot be self → 400. */
  managerId?: string;
}

/**
 * PATCH accepts all the same fields, all optional; uniqueness/manager/
 * department checks re-run on whatever is included. A non-ADMIN cannot reassign
 * organizationId to a different org → 403.
 */
export type UpdateEmployeeInput = Partial<CreateEmployeeInput>;

/**
 * Body for PATCH /employees/me — the caller updating their own profile. The
 * API documents only `nickname` today (profile picture is not wired up yet).
 */
export interface UpdateMyProfileInput {
  nickname?: string;
}

export interface CreateEmployeeContractInput {
  contractType: ContractType;
  /** ISO 8601 date string. */
  startDate: string;
  /** ISO 8601 date string. */
  endDate?: string;
  fileUrl?: string;
  /** Defaults to ACTIVE server-side. */
  status?: ContractStatus;
}

export interface CreateEmployeeDocumentInput {
  documentType: string;
  fileUrl: string;
  description?: string;
}

export interface ListEmployeesParams extends PaginationParams {
  /**
   * ADMIN only. Filters to this org. Silently ignored for non-ADMIN callers
   * (always scoped to their own org). Omit as ADMIN to get every org.
   */
  organizationId?: string;
}

// --- employees ------------------------------------------------------------

/** POST /employees — own org only (403 if organizationId ≠ own). */
export async function createEmployee(
  input: CreateEmployeeInput,
): Promise<Employee> {
  const { data } = await api.post<Employee>("/employees", input);
  return data;
}

/** GET /employees — scoped to the caller's org (ADMIN may filter/see all). One page. */
export async function listEmployees(
  params: ListEmployeesParams = {},
): Promise<Paginated<Employee>> {
  const { data } = await api.get<Paginated<Employee>>("/employees", {
    params: {
      ...paginationQuery(params),
      ...(params.organizationId
        ? { [ORGANIZATION_ID_PARAM]: params.organizationId }
        : {}),
    },
  });
  return data;
}

/** Every employee across all pages — for dropdowns/lookup maps. */
export async function listAllEmployees(
  params: Omit<ListEmployeesParams, "page"> = {},
): Promise<Employee[]> {
  return fetchAllPages((page) => listEmployees({ ...params, page }));
}

/**
 * Lightweight employee option for pickers (e.g. the manager dropdown). Reuses
 * the Employee `id`; `name` is the server-composed full name (firstName +
 * lastName), which isn't a field on Employee itself.
 */
export type EmployeeOption = Pick<Employee, "id"> & { name: string };

/** GET /employees/options — id + display name for the caller's org. */
export async function listEmployeeOptions(): Promise<EmployeeOption[]> {
  const { data } = await api.get<EmployeeOption[]>("/employees/options");
  return data;
}

/** GET /employees/:id — own org only (404 otherwise). */
export async function getEmployee(id: string): Promise<Employee> {
  const { data } = await api.get<Employee>(
    `/employees/${encodeURIComponent(id)}`,
  );
  return data;
}

/** PATCH /employees/:id — own org only (404 otherwise). */
export async function updateEmployee(
  id: string,
  input: UpdateEmployeeInput,
): Promise<Employee> {
  const { data } = await api.patch<Employee>(
    `/employees/${encodeURIComponent(id)}`,
    input,
  );
  return data;
}

/**
 * DELETE /employees/:id — own org only. Returns 409 unless the employee's
 * status is INACTIVE, so the UI must move them to INACTIVE before deleting.
 * Use canDeleteEmployee() to gate the action.
 */
export async function deleteEmployee(id: string): Promise<void> {
  await api.delete(`/employees/${encodeURIComponent(id)}`);
}

/** Whether an employee is eligible for deletion (status must be INACTIVE). */
export function canDeleteEmployee(employee: Pick<Employee, "status">): boolean {
  return employee.status === EMPLOYEE_STATUSES.INACTIVE;
}

/**
 * PATCH /employees/me — update the caller's own profile (nickname). Returns 404
 * if the account is not linked to an employee record.
 */
export async function updateMyProfile(
  input: UpdateMyProfileInput,
): Promise<Employee> {
  const { data } = await api.patch<Employee>("/employees/me", input);
  return data;
}

// --- contracts (create + list only) ---------------------------------------

/** GET /employees/:id/contracts — inherits the employee's org-scoping. */
export async function listEmployeeContracts(
  employeeId: string,
): Promise<EmployeeContract[]> {
  const { data } = await api.get<EmployeeContract[]>(
    `/employees/${encodeURIComponent(employeeId)}/contracts`,
  );
  return data;
}

/** POST /employees/:id/contracts — inherits the employee's org-scoping. */
export async function createEmployeeContract(
  employeeId: string,
  input: CreateEmployeeContractInput,
): Promise<EmployeeContract> {
  const { data } = await api.post<EmployeeContract>(
    `/employees/${encodeURIComponent(employeeId)}/contracts`,
    input,
  );
  return data;
}

// --- documents (create + list only) ---------------------------------------

/** GET /employees/:id/documents — inherits the employee's org-scoping. */
export async function listEmployeeDocuments(
  employeeId: string,
): Promise<EmployeeDocument[]> {
  const { data } = await api.get<EmployeeDocument[]>(
    `/employees/${encodeURIComponent(employeeId)}/documents`,
  );
  return data;
}

/** POST /employees/:id/documents — inherits the employee's org-scoping. */
export async function createEmployeeDocument(
  employeeId: string,
  input: CreateEmployeeDocumentInput,
): Promise<EmployeeDocument> {
  const { data } = await api.post<EmployeeDocument>(
    `/employees/${encodeURIComponent(employeeId)}/documents`,
    input,
  );
  return data;
}
