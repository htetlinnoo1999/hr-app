import {
  api,
  fetchAllPages,
  paginationQuery,
  type Paginated,
  type PaginationParams,
} from "@/lib/api";
import { ROLES, type Role } from "@/lib/constants";

/**
 * Reimbursements API — /reimbursements.
 *
 * Employees submit expense reimbursements; the employee's DEPARTMENT HEAD (or
 * HR/admin) approves/rejects; HR/admin then marks APPROVED ones as PAID. Note
 * the approver is the department head — NOT the employee's direct manager (that
 * differs from leave requests). Org-scoped like every resource.
 */

export const REIMBURSEMENT_STATUSES = {
  PENDING: "PENDING",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
  CANCELLED: "CANCELLED",
  PAID: "PAID",
} as const;
export type ReimbursementStatus =
  (typeof REIMBURSEMENT_STATUSES)[keyof typeof REIMBURSEMENT_STATUSES];
export const REIMBURSEMENT_STATUS_VALUES = Object.values(
  REIMBURSEMENT_STATUSES,
) as ReimbursementStatus[];

export interface Reimbursement {
  id: string;
  employeeId: string;
  /** Serialized as a decimal string by the API. Format with formatNumber. */
  amount: string | number;
  category: string;
  description: string | null;
  /** ISO 8601 date of the expense. */
  expenseDate: string;
  receiptUrl: string | null;
  status: ReimbursementStatus;
  reviewedBy: string | null;
  reviewNote: string | null;
  paidBy: string | null;
  paidAt: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateReimbursementInput {
  /** Whose expense this is. Non-HR callers can only submit for themselves. */
  employeeId: string;
  amount: number;
  category: string;
  description?: string;
  /** ISO 8601 date string (YYYY-MM-DD). */
  expenseDate: string;
  /** Optional receipt — an image or PDF. Sent as multipart/form-data. */
  receipt?: File;
}

export interface ReviewReimbursementInput {
  reviewNote?: string;
}

export interface ListReimbursementsParams extends PaginationParams {
  employeeId?: string;
  status?: ReimbursementStatus;
}

// --- receipts / categories ------------------------------------------------

/** `accept` for the receipt file input — images and PDF only. */
export const REIMBURSEMENT_RECEIPT_ACCEPT = "image/*,application/pdf";
/** Max receipt size (10 MB). */
export const REIMBURSEMENT_RECEIPT_MAX_BYTES = 10 * 1024 * 1024;
/** Whether a file is an allowed receipt (image or PDF). */
export function isAllowedReceipt(file: File): boolean {
  return file.type.startsWith("image/") || file.type === "application/pdf";
}

/** Client-maintained category suggestions — there's no server-side list. */
export const REIMBURSEMENT_CATEGORIES = [
  "Travel",
  "Meals",
  "Accommodation",
  "Office supplies",
  "Software",
  "Training",
  "Health",
  "Other",
];

// --- requests -------------------------------------------------------------

/**
 * POST /reimbursements — multipart/form-data. 400 if the employee has no
 * department, or their department has no head assigned (surface that clearly).
 */
export async function createReimbursement(
  input: CreateReimbursementInput,
): Promise<Reimbursement> {
  const form = new FormData();
  form.append("employeeId", input.employeeId);
  form.append("amount", String(input.amount));
  form.append("category", input.category);
  if (input.description) form.append("description", input.description);
  form.append("expenseDate", input.expenseDate);
  if (input.receipt) form.append("receipt", input.receipt);

  const { data } = await api.post<Reimbursement>("/reimbursements", form, {
    // Drop the instance JSON default so axios sets the multipart boundary.
    headers: { "Content-Type": undefined },
  });
  return data;
}

/** GET /reimbursements — one page, optionally filtered by employee/status. */
export async function listReimbursements(
  params: ListReimbursementsParams = {},
): Promise<Paginated<Reimbursement>> {
  const query: Record<string, string | number> = { ...paginationQuery(params) };
  if (params.employeeId) query.employeeId = params.employeeId;
  if (params.status) query.status = params.status;
  const { data } = await api.get<Paginated<Reimbursement>>("/reimbursements", {
    params: Object.keys(query).length ? query : undefined,
  });
  return data;
}

/** Every matching reimbursement across all pages. */
export async function listAllReimbursements(
  params: Omit<ListReimbursementsParams, "page"> = {},
): Promise<Reimbursement[]> {
  return fetchAllPages((page) => listReimbursements({ ...params, page }));
}

/** GET /reimbursements/:id. */
export async function getReimbursement(id: string): Promise<Reimbursement> {
  const { data } = await api.get<Reimbursement>(
    `/reimbursements/${encodeURIComponent(id)}`,
  );
  return data;
}

/** PATCH /reimbursements/:id/cancel — requester cancels their own PENDING one. */
export async function cancelReimbursement(id: string): Promise<Reimbursement> {
  const { data } = await api.patch<Reimbursement>(
    `/reimbursements/${encodeURIComponent(id)}/cancel`,
  );
  return data;
}

/** PATCH /reimbursements/:id/approve — department head or HR/admin. */
export async function approveReimbursement(
  id: string,
  input: ReviewReimbursementInput = {},
): Promise<Reimbursement> {
  const { data } = await api.patch<Reimbursement>(
    `/reimbursements/${encodeURIComponent(id)}/approve`,
    input,
  );
  return data;
}

/** PATCH /reimbursements/:id/reject — department head or HR/admin. */
export async function rejectReimbursement(
  id: string,
  input: ReviewReimbursementInput = {},
): Promise<Reimbursement> {
  const { data } = await api.patch<Reimbursement>(
    `/reimbursements/${encodeURIComponent(id)}/reject`,
    input,
  );
  return data;
}

/** PATCH /reimbursements/:id/mark-paid — HR/admin only, APPROVED → PAID. */
export async function markReimbursementPaid(
  id: string,
): Promise<Reimbursement> {
  const { data } = await api.patch<Reimbursement>(
    `/reimbursements/${encodeURIComponent(id)}/mark-paid`,
  );
  return data;
}

// --- permission helpers (server enforces regardless) ----------------------

/**
 * Whether the caller may approve/reject a reimbursement: it must be PENDING,
 * not their own, and they're either HR/admin or the head of the requester's
 * department (`departmentHeadId` resolved by the caller).
 */
export function canReviewReimbursement(
  r: Pick<Reimbursement, "status" | "employeeId">,
  ctx: { userId?: string; role?: Role; departmentHeadId?: string | null },
): boolean {
  if (r.status !== REIMBURSEMENT_STATUSES.PENDING) return false;
  if (ctx.userId && r.employeeId === ctx.userId) return false;
  if (ctx.role === ROLES.ADMIN || ctx.role === ROLES.HR_MANAGER) return true;
  return Boolean(
    ctx.userId && ctx.departmentHeadId && ctx.departmentHeadId === ctx.userId,
  );
}

/** Whether the caller (HR/admin) may mark an APPROVED reimbursement as paid. */
export function canMarkReimbursementPaid(
  r: Pick<Reimbursement, "status">,
  role: Role | undefined,
): boolean {
  return (
    r.status === REIMBURSEMENT_STATUSES.APPROVED &&
    (role === ROLES.ADMIN || role === ROLES.HR_MANAGER)
  );
}

/** Whether the caller may cancel this reimbursement (their own, still PENDING). */
export function canCancelReimbursement(
  r: Pick<Reimbursement, "status" | "employeeId">,
  userId: string | undefined,
): boolean {
  return r.status === REIMBURSEMENT_STATUSES.PENDING && r.employeeId === userId;
}
