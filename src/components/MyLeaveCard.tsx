import { useRef, useState, type FormEvent } from "react"
import { Paperclip, Plus, X } from "lucide-react"

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
import {
  canCancelLeaveRequest,
  isAllowedLeaveAttachment,
  LEAVE_ATTACHMENT_ACCEPT,
  LEAVE_ATTACHMENT_MAX_BYTES,
} from "@/apis/leave-requests"
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
  const [file, setFile] = useState<File | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Sick leave (matched by type name) requires an attachment.
  const selectedType = (leaveTypes.data ?? []).find((t) => t.id === leaveTypeId)
  const isSick = selectedType ? /sick/i.test(selectedType.name) : false

  function pickFile(e: React.ChangeEvent<HTMLInputElement>) {
    setFileError(null)
    const chosen = e.target.files?.[0] ?? null
    if (!chosen) {
      setFile(null)
      return
    }
    if (!isAllowedLeaveAttachment(chosen)) {
      setFile(null)
      setFileError("Only image or PDF files are allowed.")
      return
    }
    if (chosen.size > LEAVE_ATTACHMENT_MAX_BYTES) {
      setFile(null)
      setFileError("File must be under 10 MB.")
      return
    }
    setFile(chosen)
  }

  function clearFile() {
    setFile(null)
    setFileError(null)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

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
    if (isSick && !file) {
      setError("Sick leave requires an attachment (image or PDF).")
      return
    }
    try {
      await mut.mutateAsync({
        employeeId,
        leaveTypeId,
        startDate,
        endDate,
        reason: reason.trim() || undefined,
        attachment: file ?? undefined,
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
      <div className="sm:col-span-2">
        <Field
          label={isSick ? "Attachment" : "Attachment (optional)"}
          required={isSick}
          hint={
            isSick
              ? "Required for sick leave. Image or PDF, up to 10 MB."
              : "Image or PDF, up to 10 MB."
          }
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={LEAVE_ATTACHMENT_ACCEPT}
            onChange={pickFile}
            className="hidden"
            aria-label="Leave attachment"
          />
          {file ? (
            <div className="flex items-center justify-between gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm">
              <span className="flex min-w-0 items-center gap-2">
                <Paperclip className="size-4 shrink-0 text-muted-foreground" />
                <span className="truncate">{file.name}</span>
              </span>
              <button
                type="button"
                onClick={clearFile}
                aria-label="Remove attachment"
                className="text-muted-foreground transition-colors hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </div>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
            >
              <Paperclip />
              Choose file
            </Button>
          )}
          {fileError && (
            <p role="alert" className="mt-1 text-xs text-destructive">
              {fileError}
            </p>
          )}
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
