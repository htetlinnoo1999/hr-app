import { useMemo, useState } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"

import { LeaveStatusBadge } from "@/components/LeaveStatusBadge"
import { PageHeader } from "@/components/PageHeader"
import { ErrorState } from "@/components/states"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { LoadingState } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"
import {
  canReviewLeaveRequest,
  LEAVE_STATUSES,
  LEAVE_TYPE_VALUES,
  type LeaveRequest,
  type LeaveType,
} from "@/apis/leave-requests"
import type { PublicHoliday } from "@/apis/public-holidays"
import {
  useAllLeaveRequests,
  useApproveLeaveRequest,
  useRejectLeaveRequest,
} from "@/hooks/useLeaveRequests"
import { usePublicHolidays } from "@/hooks/usePublicHolidays"
import { useEmployeeOptions } from "@/hooks/useEmployees"
import { getApiErrorMessage } from "@/lib/api"
import { canReviewLeaves } from "@/lib/constants"
import { cn } from "@/lib/utils"
import { formatDate, humanizeEnum } from "@/lib/format"
import { useAuthStore } from "@/stores/authStore"

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

/** Per-leave-type colors (the hue), tuned for light and dark. `dot` is the
 * solid legend swatch; `text`/`bg` build the chips. */
const TYPE_STYLES: Record<
  LeaveType,
  { text: string; bg: string; dot: string }
> = {
  ANNUAL: {
    text: "text-blue-700 dark:text-blue-300",
    bg: "bg-blue-500/15",
    dot: "bg-blue-500",
  },
  SICK: {
    text: "text-rose-700 dark:text-rose-300",
    bg: "bg-rose-500/15",
    dot: "bg-rose-500",
  },
  MATERNITY: {
    text: "text-pink-700 dark:text-pink-300",
    bg: "bg-pink-500/15",
    dot: "bg-pink-500",
  },
  PATERNITY: {
    text: "text-indigo-700 dark:text-indigo-300",
    bg: "bg-indigo-500/15",
    dot: "bg-indigo-500",
  },
  UNPAID: {
    text: "text-amber-700 dark:text-amber-300",
    bg: "bg-amber-500/15",
    dot: "bg-amber-500",
  },
  OTHER: {
    text: "text-slate-700 dark:text-slate-300",
    bg: "bg-slate-500/15",
    dot: "bg-slate-500",
  },
}

/** The statuses the calendar plots. Anything else (rejected/cancelled) is hidden. */
const SHOWN_STATUSES: readonly LeaveRequest["status"][] = [
  LEAVE_STATUSES.APPROVED,
  LEAVE_STATUSES.PENDING,
]

/** Chip classes: hue by leave type, fill by status (approved = solid,
 * pending = dashed outline). */
function chipClass(lr: LeaveRequest): string {
  const s = TYPE_STYLES[lr.leaveType] ?? TYPE_STYLES.OTHER
  const approved = lr.status === LEAVE_STATUSES.APPROVED
  return cn(
    "truncate rounded px-1.5 py-0.5 text-xs",
    s.text,
    approved ? s.bg : "border border-dashed border-current",
  )
}

// --- date helpers (calendar math is all local, day-granular) --------------

/** The API's date strings are day-accurate; take the "YYYY-MM-DD" prefix to
 * avoid timezone drift when bucketing into calendar days. */
function dayKey(iso: string): string {
  return iso.slice(0, 10)
}

function toKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

function addMonths(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + n, 1)
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d)
  r.setDate(r.getDate() + n)
  return r
}

export function LeaveCalendarPage() {
  const [cursor, setCursor] = useState(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })

  const canReview = canReviewLeaves(useAuthStore((s) => s.user))

  // Pull everything, then keep the pending + approved leaves.
  const leaves = useAllLeaveRequests()
  const employees = useEmployeeOptions()
  const holidays = usePublicHolidays()

  const nameById = useMemo(() => {
    const map = new Map<string, string>()
    for (const e of employees.data ?? []) map.set(e.id, e.name)
    return map
  }, [employees.data])

  // Bucket holidays by calendar day (a day can carry more than one).
  const holidaysByDay = useMemo(() => {
    const map = new Map<string, PublicHoliday[]>()
    for (const h of holidays.data ?? []) {
      const key = dayKey(h.date)
      const bucket = map.get(key)
      if (bucket) bucket.push(h)
      else map.set(key, [h])
    }
    return map
  }, [holidays.data])

  // Bucket every shown leave into the calendar days it spans.
  const leavesByDay = useMemo(() => {
    const map = new Map<string, LeaveRequest[]>()
    for (const lr of leaves.data ?? []) {
      if (!SHOWN_STATUSES.includes(lr.status)) continue
      const endKey = dayKey(lr.endDate)
      const [sy, sm, sd] = dayKey(lr.startDate).split("-").map(Number)
      let cur = new Date(sy, sm - 1, sd)
      // Walk day-by-day from start to end (inclusive), guarding against a
      // malformed range where end precedes start.
      for (let i = 0; i < 366; i++) {
        const key = toKey(cur)
        if (key > endKey) break
        const bucket = map.get(key)
        if (bucket) bucket.push(lr)
        else map.set(key, [lr])
        cur = addDays(cur, 1)
      }
    }
    return map
  }, [leaves.data])

  // 6 weeks (42 cells) starting on the Sunday on/before the 1st.
  const gridStart = addDays(cursor, -cursor.getDay())
  const cells = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i))
  const todayKey = toKey(new Date())
  const monthLabel = cursor.toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Leave calendar"
        description="Who's off, and when, across your organization."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCursor(new Date())}
            >
              Today
            </Button>
            <Button
              variant="outline"
              size="icon-sm"
              aria-label="Previous month"
              onClick={() => setCursor((c) => addMonths(c, -1))}
            >
              <ChevronLeft />
            </Button>
            <Button
              variant="outline"
              size="icon-sm"
              aria-label="Next month"
              onClick={() => setCursor((c) => addMonths(c, 1))}
            >
              <ChevronRight />
            </Button>
          </div>
        }
      />

      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-lg font-semibold">{monthLabel}</h2>
        <Legend />
      </div>

      {leaves.isError && <ErrorState error={leaves.error} />}
      {leaves.isLoading && <LoadingState />}

      {!leaves.isError && !leaves.isLoading && (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <div className="min-w-176">
                {/* Weekday header */}
                <div className="grid grid-cols-7 border-b border-border">
                  {WEEKDAYS.map((w) => (
                    <div
                      key={w}
                      className="px-2 py-2 text-center text-xs font-medium text-muted-foreground"
                    >
                      {w}
                    </div>
                  ))}
                </div>

                {/* Day grid */}
                <div className="grid grid-cols-7">
                  {cells.map((date) => {
                    const key = toKey(date)
                    const inMonth = date.getMonth() === cursor.getMonth()
                    const isToday = key === todayKey
                    const dayLeaves = leavesByDay.get(key) ?? []
                    const dayHolidays = holidaysByDay.get(key) ?? []
                    const isHoliday = dayHolidays.length > 0
                    return (
                      <div
                        key={key}
                        className={cn(
                          "min-h-24 border-r border-b border-border p-1.5 last:border-r-0",
                          !inMonth && "bg-muted/30",
                          inMonth && isHoliday && "bg-emerald-500/8",
                        )}
                      >
                        <div className="mb-1 flex justify-end">
                          <span
                            className={cn(
                              "flex size-6 items-center justify-center rounded-full text-xs",
                              inMonth
                                ? "text-foreground"
                                : "text-muted-foreground",
                              isToday &&
                                "bg-primary font-semibold text-primary-foreground",
                            )}
                          >
                            {date.getDate()}
                          </span>
                        </div>
                        <DayHolidays holidays={dayHolidays} />
                        <DayLeaves
                          leaves={dayLeaves}
                          nameById={nameById}
                          canReview={canReview}
                        />
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

/** Public-holiday chips for a day — a non-working-day marker sitting above the
 * leave chips. Usually one, but a day can carry more than one. */
function DayHolidays({ holidays }: { holidays: PublicHoliday[] }) {
  if (holidays.length === 0) return null
  return (
    <div className="mb-1 space-y-1">
      {holidays.map((h) => (
        <div
          key={h.id}
          title={h.name}
          className="truncate rounded bg-emerald-500/15 px-1.5 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-300"
        >
          {h.name}
        </div>
      ))}
    </div>
  )
}

/** Up to 3 leave chips for a day, then a "+N more" hint. */
function DayLeaves({
  leaves,
  nameById,
  canReview,
}: {
  leaves: LeaveRequest[]
  nameById: Map<string, string>
  canReview: boolean
}) {
  const shown = leaves.slice(0, 3)
  const extra = leaves.length - shown.length

  return (
    <div className="space-y-1">
      {shown.map((lr) => (
        <LeaveChip
          key={lr.id}
          leave={lr}
          name={nameById.get(lr.employeeId) ?? lr.employeeId}
          canReview={canReview}
        />
      ))}
      {extra > 0 && (
        <div className="px-1.5 text-xs text-muted-foreground">+{extra} more</div>
      )}
    </div>
  )
}

/** A leave chip that opens a details popup — with approve/reject for ADMIN/HR
 * when the request is still pending. */
function LeaveChip({
  leave,
  name,
  canReview,
}: {
  leave: LeaveRequest
  name: string
  canReview: boolean
}) {
  const [open, setOpen] = useState(false)
  const [note, setNote] = useState("")
  const [error, setError] = useState<string | null>(null)
  const approveMut = useApproveLeaveRequest()
  const rejectMut = useRejectLeaveRequest()

  const reviewable = canReview && canReviewLeaveRequest(leave)
  const busy = approveMut.isPending || rejectMut.isPending

  async function approve() {
    setError(null)
    try {
      await approveMut.mutateAsync(leave.id)
      setOpen(false)
    } catch (err) {
      setError(getApiErrorMessage(err))
    }
  }

  async function reject() {
    setError(null)
    try {
      await rejectMut.mutateAsync({ id: leave.id, reviewNote: note.trim() || undefined })
      setOpen(false)
    } catch (err) {
      setError(getApiErrorMessage(err))
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        title={`${name} · ${humanizeEnum(leave.leaveType)} · ${humanizeEnum(leave.status)}`}
        className={cn(
          chipClass(leave),
          "block w-full cursor-pointer text-left outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
        )}
      >
        {name}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72">
        <div className="space-y-3">
          <div>
            <p className="text-sm font-semibold">{name}</p>
            <div className="mt-1 flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {humanizeEnum(leave.leaveType)}
              </span>
              <LeaveStatusBadge status={leave.status} />
            </div>
          </div>

          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
            <dt className="text-muted-foreground">Dates</dt>
            <dd>
              {formatDate(leave.startDate)} – {formatDate(leave.endDate)}
            </dd>
            {leave.reason && (
              <>
                <dt className="text-muted-foreground">Reason</dt>
                <dd>{leave.reason}</dd>
              </>
            )}
          </dl>

          {reviewable ? (
            <div className="space-y-2 border-t border-border pt-3">
              <Textarea
                rows={2}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Reason for rejection (optional)"
              />
              {error && (
                <p role="alert" className="text-xs text-destructive">
                  {error}
                </p>
              )}
              <div className="flex justify-end gap-2">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={reject}
                  disabled={busy}
                >
                  {rejectMut.isPending ? "Rejecting…" : "Reject"}
                </Button>
                <Button size="sm" onClick={approve} disabled={busy}>
                  {approveMut.isPending ? "Approving…" : "Approve"}
                </Button>
              </div>
            </div>
          ) : (
            leave.reviewNote && (
              <p className="border-t border-border pt-3 text-xs text-muted-foreground">
                Note: {leave.reviewNote}
              </p>
            )
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}

/** Color key: leave-type hues, plus the approved/pending fill styles. */
function Legend() {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
      {LEAVE_TYPE_VALUES.map((t) => (
        <span key={t} className="flex items-center gap-1.5 text-xs">
          <span className={cn("size-2.5 rounded-full", TYPE_STYLES[t].dot)} />
          <span className="text-muted-foreground">{humanizeEnum(t)}</span>
        </span>
      ))}
      <span className="mx-1 h-4 w-px bg-border" aria-hidden />
      <span className="flex items-center gap-1.5 text-xs">
        <span className="size-3 rounded bg-foreground/70" />
        <span className="text-muted-foreground">Approved</span>
      </span>
      <span className="flex items-center gap-1.5 text-xs">
        <span className="size-3 rounded border border-dashed border-foreground/70" />
        <span className="text-muted-foreground">Pending</span>
      </span>
      <span className="mx-1 h-4 w-px bg-border" aria-hidden />
      <span className="flex items-center gap-1.5 text-xs">
        <span className="size-2.5 rounded-full bg-emerald-500" />
        <span className="text-muted-foreground">Public holiday</span>
      </span>
    </div>
  )
}
