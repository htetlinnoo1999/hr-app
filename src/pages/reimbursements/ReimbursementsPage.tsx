import { useMemo, useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { BadgeCheck, Check, Plus, X } from "lucide-react"

import { PageHeader } from "@/components/PageHeader"
import { ReimbursementStatusBadge } from "@/components/ReimbursementStatusBadge"
import { EmptyState, ErrorState } from "@/components/states"
import { Button } from "@/components/ui/button"
import { useConfirm } from "@/components/ui/confirm-dialog"
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
  canCancelReimbursement,
  canMarkReimbursementPaid,
  canReviewReimbursement,
  REIMBURSEMENT_STATUS_VALUES,
  type Reimbursement,
  type ReimbursementStatus,
} from "@/apis/reimbursements"
import {
  useApproveReimbursement,
  useCancelReimbursement,
  useMarkReimbursementPaid,
  useRejectReimbursement,
  useReimbursements,
} from "@/hooks/useReimbursements"
import { useAllEmployees } from "@/hooks/useEmployees"
import { useAllDepartments } from "@/hooks/useDepartments"
import { DEFAULT_PAGE_SIZE, getApiErrorMessage } from "@/lib/api"
import { formatDate, formatNumber, humanizeEnum } from "@/lib/format"
import { toast } from "@/stores/toastStore"
import { useAuthStore } from "@/stores/authStore"

export function ReimbursementsPage() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)

  const [searchParams] = useSearchParams()
  const statusParam = searchParams.get("status")
  const initialStatus: ReimbursementStatus | "" =
    statusParam &&
    (REIMBURSEMENT_STATUS_VALUES as string[]).includes(statusParam)
      ? (statusParam as ReimbursementStatus)
      : ""
  const [status, setStatus] = useState<ReimbursementStatus | "">(initialStatus)
  const [page, setPage] = useState(1)

  const { data, isLoading, isError, error } = useReimbursements({
    ...(status ? { status } : {}),
    page,
    limit: DEFAULT_PAGE_SIZE,
  })
  const rows = data?.data
  const pageCount = data ? Math.max(1, Math.ceil(data.total / data.limit)) : 1

  const employees = useAllEmployees()
  const departments = useAllDepartments()

  const nameById = useMemo(() => {
    const map = new Map<string, string>()
    for (const e of employees.data ?? [])
      map.set(e.id, `${e.firstName} ${e.lastName}`)
    return map
  }, [employees.data])

  // employeeId → the head of that employee's department (for approval rights).
  const deptHeadForEmployee = useMemo(() => {
    const headByDept = new Map<string, string | null>()
    for (const d of departments.data ?? []) headByDept.set(d.id, d.managerId)
    const map = new Map<string, string | null>()
    for (const e of employees.data ?? [])
      map.set(e.id, e.departmentId ? (headByDept.get(e.departmentId) ?? null) : null)
    return map
  }, [employees.data, departments.data])

  return (
    <div>
      <PageHeader
        title="Reimbursements"
        description="Expense requests, approvals and payments."
        actions={
          <Button onClick={() => navigate("/reimbursements/new")}>
            <Plus />
            New reimbursement
          </Button>
        }
      />

      <div className="mb-4 max-w-xs">
        <Select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as ReimbursementStatus | "")
            setPage(1)
          }}
          aria-label="Filter by status"
        >
          <option value="">All statuses</option>
          {REIMBURSEMENT_STATUS_VALUES.map((s) => (
            <option key={s} value={s}>
              {humanizeEnum(s)}
            </option>
          ))}
        </Select>
      </div>

      {isLoading && <LoadingState />}
      {isError && <ErrorState error={error} />}

      {rows &&
        (rows.length === 0 ? (
          <EmptyState>
            {status
              ? "No reimbursements with this status."
              : "No reimbursements yet."}
          </EmptyState>
        ) : (
          <>
            <div className="rounded-xl border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Expense date</TableHead>
                    <TableHead>Receipt</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">
                        {nameById.get(r.employeeId) ?? r.employeeId}
                      </TableCell>
                      <TableCell>{r.category}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatNumber(r.amount)}
                      </TableCell>
                      <TableCell>{formatDate(r.expenseDate)}</TableCell>
                      <TableCell>
                        {r.receiptUrl ? (
                          <a
                            href={r.receiptUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-primary underline-offset-4 hover:underline"
                          >
                            View
                          </a>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell>
                        <ReimbursementStatusBadge status={r.status} />
                      </TableCell>
                      <TableCell>
                        <RowActions
                          reimbursement={r}
                          canReview={canReviewReimbursement(r, {
                            userId: user?.id,
                            role: user?.role,
                            departmentHeadId: deptHeadForEmployee.get(
                              r.employeeId,
                            ),
                          })}
                          canPay={canMarkReimbursementPaid(r, user?.role)}
                          canCancel={canCancelReimbursement(r, user?.id)}
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

function RowActions({
  reimbursement,
  canReview,
  canPay,
  canCancel,
}: {
  reimbursement: Reimbursement
  canReview: boolean
  canPay: boolean
  canCancel: boolean
}) {
  const confirm = useConfirm()
  const approveMut = useApproveReimbursement()
  const rejectMut = useRejectReimbursement()
  const payMut = useMarkReimbursementPaid()
  const cancelMut = useCancelReimbursement()
  const [rejectOpen, setRejectOpen] = useState(false)
  const [note, setNote] = useState("")

  const id = reimbursement.id
  const busy =
    approveMut.isPending ||
    rejectMut.isPending ||
    payMut.isPending ||
    cancelMut.isPending

  async function approve() {
    try {
      await approveMut.mutateAsync({ id })
    } catch (err) {
      toast.error(getApiErrorMessage(err))
    }
  }

  async function reject() {
    try {
      await rejectMut.mutateAsync({ id, reviewNote: note.trim() || undefined })
      setRejectOpen(false)
      setNote("")
    } catch (err) {
      toast.error(getApiErrorMessage(err))
    }
  }

  async function pay() {
    const ok = await confirm({
      title: "Mark as paid",
      description: `Confirm the ${formatNumber(reimbursement.amount)} reimbursement has been paid out.`,
      confirmLabel: "Mark paid",
      destructive: false,
    })
    if (!ok) return
    try {
      await payMut.mutateAsync(id)
    } catch (err) {
      toast.error(getApiErrorMessage(err))
    }
  }

  async function cancel() {
    const ok = await confirm({
      title: "Cancel reimbursement",
      description: "This withdraws the request. You can submit a new one later.",
      confirmLabel: "Cancel reimbursement",
      destructive: false,
    })
    if (!ok) return
    try {
      await cancelMut.mutateAsync(id)
    } catch (err) {
      toast.error(getApiErrorMessage(err))
    }
  }

  if (!canReview && !canPay && !canCancel) {
    return <div className="flex justify-end" />
  }

  return (
    <div className="flex items-center justify-end gap-1">
      {canReview && (
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
      {canPay && (
        <Button size="sm" onClick={pay} disabled={busy}>
          <BadgeCheck />
          {payMut.isPending ? "Saving…" : "Mark paid"}
        </Button>
      )}
      {canCancel && (
        <Button variant="ghost" size="sm" onClick={cancel} disabled={busy}>
          <X />
          Cancel
        </Button>
      )}
    </div>
  )
}
