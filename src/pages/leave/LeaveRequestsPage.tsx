import { useMemo, useState } from "react"
import { X } from "lucide-react"

import { LeaveStatusBadge } from "@/components/LeaveStatusBadge"
import { PageHeader } from "@/components/PageHeader"
import { EmptyState, ErrorState } from "@/components/states"
import { Button } from "@/components/ui/button"
import { Pagination } from "@/components/ui/pagination"
import { Select } from "@/components/ui/select"
import { LoadingState } from "@/components/ui/spinner"
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
  LEAVE_STATUS_VALUES,
  type LeaveStatus,
} from "@/apis/leave-requests"
import {
  useCancelLeaveRequest,
  useLeaveRequests,
} from "@/hooks/useLeaveRequests"
import { useAllEmployees } from "@/hooks/useEmployees"
import { DEFAULT_PAGE_SIZE, getApiErrorMessage } from "@/lib/api"
import { formatDate, humanizeEnum } from "@/lib/format"
import { toast } from "@/stores/toastStore"

export function LeaveRequestsPage() {
  const [status, setStatus] = useState<LeaveStatus | "">("")
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
                    <TableCell>
                      <LeaveStatusBadge status={lr.status} />
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end">
                        {canCancelLeaveRequest(lr) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => cancel(lr.id)}
                            disabled={cancelMut.isPending}
                          >
                            <X />
                            Cancel
                          </Button>
                        )}
                      </div>
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
