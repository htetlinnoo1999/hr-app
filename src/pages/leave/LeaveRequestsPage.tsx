import { useMemo, useState } from "react"
import { useSearchParams } from "react-router-dom"
import { Check, X } from "lucide-react"

import { LeaveStatusBadge } from "@/components/LeaveStatusBadge"
import { PageHeader } from "@/components/PageHeader"
import { EmptyState, ErrorState } from "@/components/states"
import { Button } from "@/components/ui/button"
import { Pagination } from "@/components/ui/pagination"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Select } from "@/components/ui/select"
import { LoadingState } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  canCancelLeaveRequest,
  canReviewLeaveRequest,
  LEAVE_STATUS_VALUES,
  type LeaveRequest,
  type LeaveStatus,
} from "@/apis/leave-requests"
import {
  useApproveLeaveRequest,
  useCancelLeaveRequest,
  useLeaveRequests,
  useRejectLeaveRequest,
} from "@/hooks/useLeaveRequests"
import { useAllEmployees } from "@/hooks/useEmployees"
import { DEFAULT_PAGE_SIZE, getApiErrorMessage } from "@/lib/api"
import { canReviewLeaves } from "@/lib/constants"
import { formatDate, humanizeEnum } from "@/lib/format"
import { toast } from "@/stores/toastStore"
import { useAuthStore } from "@/stores/authStore"

/** Inclusive day span between two date strings (day-accurate, TZ-safe). */
function inclusiveDays(start: string, end: string): number {
  const s = new Date(start.slice(0, 10)).getTime()
  const e = new Date(end.slice(0, 10)).getTime()
  if (Number.isNaN(s) || Number.isNaN(e)) return 0
  return Math.max(1, Math.round((e - s) / 86_400_000) + 1)
}

export function LeaveRequestsPage() {
  // Allow deep-links like /leave?status=PENDING (from the dashboard tiles).
  const [searchParams] = useSearchParams()
  const statusParam = searchParams.get("status")
  const initialStatus: LeaveStatus | "" =
    statusParam && (LEAVE_STATUS_VALUES as string[]).includes(statusParam)
      ? (statusParam as LeaveStatus)
      : ""
  const [status, setStatus] = useState<LeaveStatus | "">(initialStatus)
  const [page, setPage] = useState(1)
  const { data, isLoading, isError, error } = useLeaveRequests({
    ...(status ? { status } : {}),
    page,
    limit: DEFAULT_PAGE_SIZE,
  })
  const requests = data?.data
  const pageCount = data ? Math.max(1, Math.ceil(data.total / data.limit)) : 1
  const employees = useAllEmployees()
  const cancelMut = useCancelLeaveRequest()
  const canReview = canReviewLeaves(useAuthStore((s) => s.user))

  const employeeName = useMemo(() => {
    const map = new Map<string, string>()
    for (const e of employees.data ?? [])
      map.set(e.id, `${e.firstName} ${e.lastName}`)
    return map
  }, [employees.data])

  async function cancel(id: string) {
    if (!window.confirm("Cancel this leave request?")) return
    try {
      await cancelMut.mutateAsync(id)
    } catch (err) {
      toast.error(getApiErrorMessage(err))
    }
  }

  return (
    <div>
      <PageHeader
        title="Leave requests"
        description="Time-off requests within your organization."
      />

      <div className="mb-4 max-w-xs">
        <Select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as LeaveStatus | "")
            setPage(1)
          }}
          aria-label="Filter by status"
        >
          <option value="">All statuses</option>
          {LEAVE_STATUS_VALUES.map((s) => (
            <option key={s} value={s}>
              {humanizeEnum(s)}
            </option>
          ))}
        </Select>
      </div>

      {isLoading && <LoadingState />}
      {isError && <ErrorState error={error} />}

      {requests &&
        (requests.length === 0 ? (
          <EmptyState>
            {status
              ? "No leave requests with this status."
              : "No leave requests yet."}
          </EmptyState>
        ) : (
          <>
            <div className="rounded-xl border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Start</TableHead>
                    <TableHead>End</TableHead>
                    <TableHead className="text-right">Days</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requests.map((lr) => (
                    <TableRow key={lr.id}>
                      <TableCell className="font-medium">
                        {employeeName.get(lr.employeeId) ?? lr.employeeId}
                      </TableCell>
                      <TableCell>{humanizeEnum(lr.leaveType)}</TableCell>
                      <TableCell>{formatDate(lr.startDate)}</TableCell>
                      <TableCell>{formatDate(lr.endDate)}</TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        {inclusiveDays(lr.startDate, lr.endDate)}
                      </TableCell>
                      <TableCell>
                        <LeaveStatusBadge status={lr.status} />
                      </TableCell>
                      <TableCell>
                        <RowActions
                          request={lr}
                          canReview={canReview}
                          onCancel={() => cancel(lr.id)}
                          cancelling={cancelMut.isPending}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <Pagination
              page={page}
              pageCount={pageCount}
              total={data?.total}
              pageSize={data?.limit}
              onPageChange={setPage}
            />
          </>
        ))}
    </div>
  )
}

/** Per-row actions: approve/reject for reviewers on a pending request, plus
 * cancel. Reject opens a popover for an optional note. */
function RowActions({
  request,
  canReview,
  onCancel,
  cancelling,
}: {
  request: LeaveRequest
  canReview: boolean
  onCancel: () => void
  cancelling: boolean
}) {
  const approveMut = useApproveLeaveRequest()
  const rejectMut = useRejectLeaveRequest()
  const [rejectOpen, setRejectOpen] = useState(false)
  const [note, setNote] = useState("")

  const reviewable = canReview && canReviewLeaveRequest(request)
  const cancellable = canCancelLeaveRequest(request)
  const busy = approveMut.isPending || rejectMut.isPending

  async function approve() {
    try {
      await approveMut.mutateAsync(request.id)
    } catch (err) {
      toast.error(getApiErrorMessage(err))
    }
  }

  async function reject() {
    try {
      await rejectMut.mutateAsync({
        id: request.id,
        reviewNote: note.trim() || undefined,
      })
      setRejectOpen(false)
      setNote("")
    } catch (err) {
      toast.error(getApiErrorMessage(err))
    }
  }

  if (!reviewable && !cancellable) {
    return <div className="flex justify-end" />
  }

  return (
    <div className="flex items-center justify-end gap-1">
      {reviewable && (
        <>
          <Button size="sm" onClick={approve} disabled={busy}>
            <Check />
            {approveMut.isPending ? "Approving…" : "Approve"}
          </Button>
          <Popover open={rejectOpen} onOpenChange={setRejectOpen}>
            <PopoverTrigger
              render={
                <Button variant="destructive" size="sm" disabled={busy}>
                  <X />
                  Reject
                </Button>
              }
            />
            <PopoverContent align="end" className="w-72">
              <div className="space-y-2">
                <Textarea
                  rows={2}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Reason for rejection (optional)"
                />
                <div className="flex justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setRejectOpen(false)}
                    disabled={rejectMut.isPending}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={reject}
                    disabled={rejectMut.isPending}
                  >
                    {rejectMut.isPending ? "Rejecting…" : "Reject"}
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </>
      )}
      {cancellable && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onCancel}
          disabled={cancelling}
        >
          <X />
          Cancel
        </Button>
      )}
    </div>
  )
}
