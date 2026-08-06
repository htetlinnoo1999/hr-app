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
  /**
   * Optional supporting document — an image or PDF. When present, the request
   * is sent as multipart/form-data. Required by the UI for sick leave.
   */
  attachment?: File;
}

// --- attachments ----------------------------------------------------------

/**
 * Multipart field name for the uploaded file. Not documented in the OpenAPI
 * spec (which only lists the JSON body), so this is the assumed name — change
 * it here if the backend expects a different one.
 */
export const LEAVE_ATTACHMENT_FIELD = "attachment";

/** `accept` attribute for the file input — images and PDF only. */
export const LEAVE_ATTACHMENT_ACCEPT = "image/*,application/pdf";

/** Max attachment size (10 MB). */
export const LEAVE_ATTACHMENT_MAX_BYTES = 10 * 1024 * 1024;

/** Whether a file is an allowed leave attachment (image or PDF). */
export function isAllowedLeaveAttachment(file: File): boolean {
  return file.type.startsWith("image/") || file.type === "application/pdf";
}

export interface ListLeaveRequestsParams extends PaginationParams {
  /** Filter by status (server-side). */
  status?: LeaveStatus;
  /** Filter to one employee (server-side). */
  employeeId?: string;
}

/**
 * POST /leave-requests — submit a leave request. With an `attachment` the body
 * is multipart/form-data; otherwise it's plain JSON.
 */
export async function createLeaveRequest(
  input: CreateLeaveRequestInput,
): Promise<LeaveRequest> {
  const { attachment, ...rest } = input;

  if (attachment) {
    const form = new FormData();
    form.append("employeeId", rest.employeeId);
    form.append("leaveTypeId", rest.leaveTypeId);
    form.append("startDate", rest.startDate);
    form.append("endDate", rest.endDate);
    if (rest.reason) form.append("reason", rest.reason);
    form.append(LEAVE_ATTACHMENT_FIELD, attachment);

    const { data } = await api.post<LeaveRequest>("/leave-requests", form, {
      // Drop the instance's JSON default so axios sets multipart + boundary.
      headers: { "Content-Type": undefined },
    });
    return data;
  }

  const { data } = await api.post<LeaveRequest>("/leave-requests", rest);
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
