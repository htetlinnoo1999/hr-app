import {
  api,
  fetchAllPages,
  paginationQuery,
  type Paginated,
  type PaginationParams,
} from "@/lib/api";

/**
 * Leave requests API — /leave-requests.
 *
 * Org-scoped like every resource. The frontend can submit, list, read, and
 * cancel a PENDING request, and (ADMIN/HR) approve or reject one.
 */

export const LEAVE_TYPES = {
  ANNUAL: "ANNUAL",
  SICK: "SICK",
  MATERNITY: "MATERNITY",
  PATERNITY: "PATERNITY",
  UNPAID: "UNPAID",
  OTHER: "OTHER",
} as const;
export type LeaveType = (typeof LEAVE_TYPES)[keyof typeof LEAVE_TYPES];
export const LEAVE_TYPE_VALUES = Object.values(LEAVE_TYPES) as LeaveType[];

/**
 * Leave status. NOTE: not documented in the API spec — inferred from the
 * "cancel a pending request" semantics. Verify against a live response before
 * relying on the non-PENDING/CANCELLED members.
 */
export const LEAVE_STATUSES = {
  PENDING: "PENDING",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
  CANCELLED: "CANCELLED",
} as const;
export type LeaveStatus = (typeof LEAVE_STATUSES)[keyof typeof LEAVE_STATUSES];
export const LEAVE_STATUS_VALUES = Object.values(LEAVE_STATUSES) as LeaveStatus[];

export interface LeaveRequest {
  id: string;
  employeeId: string;
  leaveType: LeaveType;
  startDate: string;
  endDate: string;
  reason: string | null;
  status: LeaveStatus;
  /** Reviewer's note, set when a request is approved/rejected. */
  reviewNote?: string | null;
  /** Reviewer's employee id. */
  reviewedBy?: string | null;
  // Org id and timestamps aren't documented — optional until verified.
  organizationId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateLeaveRequestInput {
  employeeId: string;
  /** Id of the leave type (from the Leave Types API), not the enum. */
  leaveTypeId: string;
  /** ISO 8601 date string (first day). */
  startDate: string;
  /** ISO 8601 date string (last day, inclusive). */
  endDate: string;
  reason?: string;
}

export interface ListLeaveRequestsParams extends PaginationParams {
  /** Filter by status (server-side). */
  status?: LeaveStatus;
  /** Filter to one employee (server-side). */
  employeeId?: string;
}

/** POST /leave-requests — submit a leave request. */
export async function createLeaveRequest(
  input: CreateLeaveRequestInput,
): Promise<LeaveRequest> {
  const { data } = await api.post<LeaveRequest>("/leave-requests", input);
  return data;
}

/** GET /leave-requests — list within the caller's org, optionally filtered. One page. */
export async function listLeaveRequests(
  params: ListLeaveRequestsParams = {},
): Promise<Paginated<LeaveRequest>> {
  const query: Record<string, string | number> = {
    ...paginationQuery(params),
  };
  if (params.status) query.status = params.status;
  if (params.employeeId) query.employeeId = params.employeeId;
  const { data } = await api.get<Paginated<LeaveRequest>>("/leave-requests", {
    params: Object.keys(query).length ? query : undefined,
  });
  return data;
}

/** Every matching leave request across all pages — for lookups/aggregates. */
export async function listAllLeaveRequests(
  params: Omit<ListLeaveRequestsParams, "page"> = {},
): Promise<LeaveRequest[]> {
  return fetchAllPages((page) => listLeaveRequests({ ...params, page }));
}

/** GET /leave-requests/:id — own org only (404 otherwise). */
export async function getLeaveRequest(id: string): Promise<LeaveRequest> {
  const { data } = await api.get<LeaveRequest>(
    `/leave-requests/${encodeURIComponent(id)}`,
  );
  return data;
}

/**
 * PATCH /leave-requests/:id/cancel — cancel a PENDING request. Fails (409/400)
 * if the request is no longer pending.
 */
export async function cancelLeaveRequest(id: string): Promise<LeaveRequest> {
  const { data } = await api.patch<LeaveRequest>(
    `/leave-requests/${encodeURIComponent(id)}/cancel`,
  );
  return data;
}

/** Whether a request can still be cancelled (must be PENDING). */
export function canCancelLeaveRequest(
  request: Pick<LeaveRequest, "status">,
): boolean {
  return request.status === LEAVE_STATUSES.PENDING;
}

export interface RejectLeaveRequestInput {
  /** Optional note explaining the rejection. */
  reviewNote?: string;
}

/** PATCH /leave-requests/:id/approve — approve a PENDING request (ADMIN/HR). */
export async function approveLeaveRequest(id: string): Promise<LeaveRequest> {
  const { data } = await api.patch<LeaveRequest>(
    `/leave-requests/${encodeURIComponent(id)}/approve`,
  );
  return data;
}

/** PATCH /leave-requests/:id/reject — reject a PENDING request (ADMIN/HR). */
export async function rejectLeaveRequest(
  id: string,
  input: RejectLeaveRequestInput = {},
): Promise<LeaveRequest> {
  const { data } = await api.patch<LeaveRequest>(
    `/leave-requests/${encodeURIComponent(id)}/reject`,
    input,
  );
  return data;
}

/** Whether a request can be approved/rejected (must be PENDING). */
export function canReviewLeaveRequest(
  request: Pick<LeaveRequest, "status">,
): boolean {
  return request.status === LEAVE_STATUSES.PENDING;
}
