import { useState, type FormEvent } from "react"
import { Plus, X } from "lucide-react"

import { Field } from "@/components/form/Field"
import { LeaveStatusBadge } from "@/components/LeaveStatusBadge"
import { EmptyState, ErrorState } from "@/components/states"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { DateRangePicker } from "@/components/ui/date-range-picker"
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
import { canCancelLeaveRequest } from "@/apis/leave-requests"
import {
  useAllLeaveRequests,
  useCancelLeaveRequest,
  useCreateLeaveRequest,
} from "@/hooks/useLeaveRequests"
import { useAllLeaveTypes } from "@/hooks/useLeaveTypes"
import { getApiErrorMessage } from "@/lib/api"
import { formatDate, humanizeEnum } from "@/lib/format"
import { toast } from "@/stores/toastStore"

/**
 * The current employee's own leave: their requests plus a self-service request
 * form (employeeId is fixed to `employeeId` — no picker). Rendered on the
 * profile page for a logged-in employee.
 */
export function MyLeaveCard({ employeeId }: { employeeId: string }) {
  const { data, isLoading, isError, error } = useAllLeaveRequests({ employeeId })
  const cancelMut = useCancelLeaveRequest()
  const [open, setOpen] = useState(false)

  async function cancel(id: string) {
    if (!window.confirm("Cancel this leave request?")) return
    try {
      await cancelMut.mutateAsync(id)
    } catch (err) {
      toast.error(getApiErrorMessage(err))
    }
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>My leave</CardTitle>
        <Button size="sm" onClick={() => setOpen((v) => !v)}>
          <Plus />
          Request leave
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {open && (
          <RequestLeaveForm
            employeeId={employeeId}
            onDone={() => setOpen(false)}
          />
        )}

        {isLoading && <LoadingState />}
        {isError && <ErrorState error={error} />}
        {data &&
          (data.length === 0 ? (
            <EmptyState>You have no leave requests.</EmptyState>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Start</TableHead>
                  <TableHead>End</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((lr) => (
                  <TableRow key={lr.id}>
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
          ))}
      </CardContent>
    </Card>
  )
}

function RequestLeaveForm({
  employeeId,
  onDone,
}: {
  employeeId: string
  onDone: () => void
}) {
  const mut = useCreateLeaveRequest()
  const leaveTypes = useAllLeaveTypes()
  const [leaveTypeId, setLeaveTypeId] = useState("")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [reason, setReason] = useState("")
  const [error, setError] = useState<string | null>(null)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (!startDate || !endDate) {
      setError("Please select a start and end date.")
      return
    }
    if (endDate < startDate) {
      setError("End date cannot be before the start date.")
      return
    }
    try {
      await mut.mutateAsync({
        employeeId,
        leaveTypeId,
        startDate,
        endDate,
        reason: reason.trim() || undefined,
      })
      onDone()
    } catch (err) {
      setError(getApiErrorMessage(err))
    }
  }

  return (
    <form
      onSubmit={submit}
      className="grid grid-cols-1 gap-4 rounded-lg border border-border bg-muted/30 p-4 sm:grid-cols-2"
    >
      <Field label="Leave type" required>
        <Select
          required
          value={leaveTypeId}
          onChange={(e) => setLeaveTypeId(e.target.value)}
          disabled={leaveTypes.isLoading}
        >
          <option value="" disabled>
            {leaveTypes.isLoading ? "Loading…" : "Select type…"}
          </option>
          {(leaveTypes.data ?? []).map((lt) => (
            <option key={lt.id} value={lt.id}>
              {lt.name}
            </option>
          ))}
        </Select>
      </Field>
      <div className="hidden sm:block" />
      <div className="sm:col-span-2">
        <Field label="Dates" required hint="Inclusive range.">
          <DateRangePicker
            startDate={startDate}
            endDate={endDate}
            onChange={(r) => {
              setStartDate(r.startDate)
              setEndDate(r.endDate)
            }}
          />
        </Field>
      </div>
      <div className="sm:col-span-2">
        <Field label="Reason">
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Family vacation"
          />
        </Field>
      </div>
      {error && (
        <p role="alert" className="text-sm text-destructive sm:col-span-2">
          {error}
        </p>
      )}
      <div className="flex justify-end gap-2 sm:col-span-2">
        <Button type="button" variant="ghost" size="sm" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" size="sm" disabled={mut.isPending}>
          {mut.isPending ? "Submitting…" : "Submit request"}
        </Button>
      </div>
    </form>
  )
}
