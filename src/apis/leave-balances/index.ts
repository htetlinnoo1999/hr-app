import { api } from "@/lib/api";

/**
 * Leave Balances API — /leave-balances.
 *
 * A per-employee, per-year allowance for one leave type. Org-scoped via the
 * employee. Only the create path is used from this client today (onboarding).
 */

export interface LeaveBalance {
  id: string;
  employeeId: string;
  leaveTypeId: string;
  year: number;
  totalDays: number;
  usedDays?: number;
  remainingDays?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateLeaveBalanceInput {
  employeeId: string;
  leaveTypeId: string;
  /** Calendar year the balance applies to. */
  year: number;
  /** Total days granted for the year. */
  totalDays: number;
}

/** POST /leave-balances — grant one leave-type balance to an employee. */
export async function createLeaveBalance(
  input: CreateLeaveBalanceInput,
): Promise<LeaveBalance> {
  const { data } = await api.post<LeaveBalance>("/leave-balances", input);
  return data;
}

/** One balance in a bulk request. */
export interface BulkLeaveBalanceItem {
  leaveTypeId: string;
  totalDays: number;
}

export interface CreateLeaveBalancesBulkInput {
  employeeId: string;
  year: number;
  balances: BulkLeaveBalanceItem[];
}

/**
 * Result of a bulk create. Existing (employee, leaveType, year) balances are
 * silently skipped (counted, not failed). `data` holds only what was created —
 * diff its leaveTypeIds against the submitted ones to learn which were skipped.
 */
export interface BulkLeaveBalancesResult {
  created: number;
  skipped: number;
  data: LeaveBalance[];
}

/**
 * POST /leave-balances/bulk — grant several leave-type balances in one call
 * (ADMIN/HR only). Idempotent: re-submitting skips ones that already exist.
 * The same leaveTypeId must not appear twice in `balances` (400).
 */
export async function createLeaveBalancesBulk(
  input: CreateLeaveBalancesBulkInput,
): Promise<BulkLeaveBalancesResult> {
  const { data } = await api.post<BulkLeaveBalancesResult>(
    "/leave-balances/bulk",
    input,
  );
  return data;
}
