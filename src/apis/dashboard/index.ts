import { api } from "@/lib/api";
import type { EmploymentType } from "@/apis/employees";

/**
 * Dashboard API — /dashboard.
 *
 * Server-computed org summary; auto-scoped to the caller's org (no params).
 */

/** One employment-type bucket. All 5 types are always present (0-count included). */
export interface EmploymentTypeCount {
  employmentType: EmploymentType;
  count: number;
}

/**
 * One department bucket. Every department is present (even 0-count), plus a
 * trailing `departmentId: null` "Unassigned" entry for employees with no
 * department — keep it, it's meaningful data.
 */
export interface DepartmentCount {
  departmentId: string | null;
  departmentName: string;
  count: number;
}

export interface DashboardSummary {
  /** All employee records in the org, any status. */
  totalEmployees: number;
  /** Employees with status ACTIVE. */
  activeEmployees: number;
  /** Distinct employees on APPROVED leave covering today. */
  onLeaveToday: number;
  /** Leave requests with status PENDING. */
  pendingApprovals: number;
  /** Headcount per employment type (all 5, org-scoped). */
  byEmploymentType: EmploymentTypeCount[];
  /** Headcount per department, with a trailing "Unassigned" bucket. */
  byDepartment: DepartmentCount[];
}

/** GET /dashboard/summary — the four headline counts in one call. */
export async function getDashboardSummary(): Promise<DashboardSummary> {
  const { data } = await api.get<DashboardSummary>("/dashboard/summary");
  return data;
}
