import { useMemo, useState, type ComponentType } from "react"
import { Link, useNavigate } from "react-router-dom"
import {
  ArrowRight,
  CalendarDays,
  Clock,
  Plane,
  Plus,
  RefreshCw,
  UserCheck,
  Users,
} from "lucide-react"

import { HeadcountChart } from "@/components/HeadcountChart"
import { LeaveStatusBadge } from "@/components/LeaveStatusBadge"
import { VisaBadge } from "@/components/VisaBadge"
import { PageHeader } from "@/components/PageHeader"
import { EmptyState, ErrorState } from "@/components/states"
import { Avatar } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Select } from "@/components/ui/select"
import { LoadingState } from "@/components/ui/spinner"
import { EMPLOYEE_STATUSES, type Employee } from "@/apis/employees"
import { LEAVE_STATUSES, type LeaveRequest } from "@/apis/leave-requests"
import { useAllEmployees, useMonthlyHeadcount } from "@/hooks/useEmployees"
import { useDashboardSummary } from "@/hooks/useDashboard"
import { useAllLeaveRequests } from "@/hooks/useLeaveRequests"
import { usePublicHolidays } from "@/hooks/usePublicHolidays"
import { cn } from "@/lib/utils"
import { formatDate, humanizeEnum } from "@/lib/format"
import { visaStatus } from "@/lib/visa"

/** "YYYY-MM-DD" for a Date (local), matching the API's day-accurate strings. */
function toKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

export function DashboardPage() {
  const navigate = useNavigate()
  const summary = useDashboardSummary()
  const employees = useAllEmployees()
  const leaves = useAllLeaveRequests()
  const holidays = usePublicHolidays()

  const todayKey = toKey(new Date())

  function refresh() {
    summary.refetch()
    employees.refetch()
    leaves.refetch()
    holidays.refetch()
  }
  const refreshing =
    summary.isFetching ||
    employees.isFetching ||
    leaves.isFetching ||
    holidays.isFetching

  const currentYear = new Date().getFullYear()
  const [year, setYear] = useState(currentYear)
  const headcount = useMonthlyHeadcount(year)
  const years = Array.from({ length: 6 }, (_, i) => currentYear - i)

  const nameById = useMemo(() => {
    const map = new Map<string, string>()
    for (const e of employees.data ?? [])
      map.set(e.id, `${e.firstName} ${e.lastName}`)
    return map
  }, [employees.data])

  // Approved leaves that span today → who is off right now.
  const offToday = useMemo(() => {
    return (leaves.data ?? []).filter(
      (l) =>
        l.status === LEAVE_STATUSES.APPROVED &&
        l.startDate.slice(0, 10) <= todayKey &&
        todayKey <= l.endDate.slice(0, 10),
    )
  }, [leaves.data, todayKey])

  const pending = useMemo(
    () =>
      (leaves.data ?? []).filter((l) => l.status === LEAVE_STATUSES.PENDING),
    [leaves.data],
  )

  // Headline counts: prefer the server summary, fall back to the fetched lists
  // (already loaded for the cards/charts) so the tiles still work if it errors.
  const s = summary.data
  const totalEmployees = s?.totalEmployees ?? employees.data?.length ?? 0
  const activeEmployees =
    s?.activeEmployees ??
    (employees.data?.filter((e) => e.status === EMPLOYEE_STATUSES.ACTIVE)
      .length ??
      0)
  const onLeaveTodayCount =
    s?.onLeaveToday ?? new Set(offToday.map((l) => l.employeeId)).size
  const pendingCount = s?.pendingApprovals ?? pending.length

  // Breakdowns come straight from the summary. Employment types render as-is
  // (all 5, 0-count included). Departments: real ones by size, "Unassigned"
  // (departmentId: null) kept last and styled muted.
  const byEmploymentType = (s?.byEmploymentType ?? []).map((r) => ({
    label: humanizeEnum(r.employmentType),
    value: r.count,
  }))

  const byDepartment = useMemo(() => {
    const rows = s?.byDepartment ?? []
    const real = rows
      .filter((r) => r.departmentId !== null)
      .sort((a, b) => b.count - a.count)
    const unassigned = rows.filter((r) => r.departmentId === null)
    return [...real, ...unassigned].map((r) => ({
      label: r.departmentName,
      value: r.count,
      muted: r.departmentId === null,
    }))
  }, [s?.byDepartment])

  const visaAlerts = useMemo(() => {
    return (employees.data ?? [])
      .filter((e) => {
        const s = visaStatus(e.visaEndDate)
        return s === "expiring" || s === "expired"
      })
      .sort((a, b) => (a.visaEndDate ?? "").localeCompare(b.visaEndDate ?? ""))
  }, [employees.data])

  const upcomingHolidays = useMemo(() => {
    return (holidays.data ?? [])
      .filter((h) => h.date.slice(0, 10) >= todayKey)
      .sort((a, b) => a.date.localeCompare(b.date))
  }, [holidays.data, todayKey])

  if (employees.isLoading) return <LoadingState />
  if (employees.isError) return <ErrorState error={employees.error} />

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Your organization at a glance."
        actions={
          <>
            <Button
              variant="outline"
              onClick={refresh}
              disabled={refreshing}
              aria-label="Refresh"
            >
              <RefreshCw className={refreshing ? "animate-spin" : undefined} />
              Refresh
            </Button>
            <Button onClick={() => navigate("/employees/new")}>
              <Plus />
              Onboard new employee
            </Button>
          </>
        }
      />

      {/* KPI tiles — server-computed headline counts (GET /dashboard/summary). */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="Total employees"
          value={totalEmployees}
          icon={Users}
          to="/employees"
        />
        <StatTile
          label="Active employees"
          value={activeEmployees}
          icon={UserCheck}
        />
        <StatTile
          label="On leave today"
          value={onLeaveTodayCount}
          icon={Plane}
          to="/leave?status=APPROVED"
        />
        <StatTile
          label="Pending approvals"
          value={pendingCount}
          icon={Clock}
          to="/leave?status=PENDING"
          emphasize={pendingCount > 0}
        />
      </div>

      {/* Headcount over time — cumulative month-end, by year. */}
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <div>
            <CardTitle>Headcount over {year}</CardTitle>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Cumulative employees at each month’s end.
            </p>
          </div>
          <div className="w-28">
            <Select
              value={String(year)}
              onChange={(e) => setYear(Number(e.target.value))}
              aria-label="Year"
            >
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {headcount.isLoading ? (
            <LoadingState />
          ) : headcount.isError ? (
            <ErrorState error={headcount.error} />
          ) : (
            <HeadcountChart data={headcount.data ?? []} />
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <PendingApprovalsCard
          requests={pending}
          nameById={nameById}
          loading={leaves.isLoading}
        />
        <div className="space-y-6">
          <OnLeaveTodayCard offToday={offToday} nameById={nameById} />
          <UpcomingHolidaysCard holidays={upcomingHolidays} todayKey={todayKey} />
        </div>
      </div>

      {visaAlerts.length > 0 && <VisaAttentionCard employees={visaAlerts} />}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Headcount by department</CardTitle>
          </CardHeader>
          <CardContent>
            {summary.isLoading ? (
              <LoadingState />
            ) : summary.isError ? (
              <ErrorState error={summary.error} />
            ) : (
              <BarList rows={byDepartment} unit="person" />
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Employment type</CardTitle>
          </CardHeader>
          <CardContent>
            {summary.isLoading ? (
              <LoadingState />
            ) : summary.isError ? (
              <ErrorState error={summary.error} />
            ) : (
              <BarList rows={byEmploymentType} unit="person" />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// --- KPI tile -------------------------------------------------------------

function StatTile({
  label,
  value,
  icon: Icon,
  to,
  emphasize,
}: {
  label: string
  value: number
  icon: ComponentType<{ className?: string }>
  to?: string
  emphasize?: boolean
}) {
  const inner = (
    <Card
      className={cn(
        "h-full transition-colors",
        to && "hover:border-primary/40",
        emphasize && "border-primary/40",
      )}
    >
      <CardContent className="flex items-center justify-between gap-4 py-5">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-1 text-3xl font-semibold tracking-tight tabular-nums">
            {value}
          </p>
        </div>
        <span
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-lg",
            emphasize
              ? "bg-primary text-primary-foreground"
              : "bg-accent text-accent-foreground",
          )}
        >
          <Icon className="size-5" />
        </span>
      </CardContent>
    </Card>
  )
  return to ? (
    <Link to={to} className="block">
      {inner}
    </Link>
  ) : (
    inner
  )
}

// --- pending approvals ----------------------------------------------------

function PendingApprovalsCard({
  requests,
  nameById,
  loading,
}: {
  requests: LeaveRequest[]
  nameById: Map<string, string>
  loading: boolean
}) {
  const shown = requests.slice(0, 6)
  return (
    <Card className="lg:col-span-2">
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>Pending approvals</CardTitle>
        {requests.length > 0 && (
          <Button variant="ghost" size="sm" render={<Link to="/leave" />}>
            Review all
            <ArrowRight />
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {loading ? (
          <LoadingState />
        ) : requests.length === 0 ? (
          <EmptyState>You’re all caught up — no requests waiting.</EmptyState>
        ) : (
          <ul className="divide-y divide-border">
            {shown.map((lr) => (
              <li
                key={lr.id}
                className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {nameById.get(lr.employeeId) ?? lr.employeeId}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {humanizeEnum(lr.leaveType)} · {formatDate(lr.startDate)} –{" "}
                    {formatDate(lr.endDate)}
                  </p>
                </div>
                <LeaveStatusBadge status={lr.status} />
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}

// --- who's on leave today -------------------------------------------------

function OnLeaveTodayCard({
  offToday,
  nameById,
}: {
  offToday: LeaveRequest[]
  nameById: Map<string, string>
}) {
  const shown = offToday.slice(0, 6)
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>On leave today</CardTitle>
        {offToday.length > 0 && (
          <Badge variant="neutral">{offToday.length}</Badge>
        )}
      </CardHeader>
      <CardContent>
        {offToday.length === 0 ? (
          <p className="text-sm text-muted-foreground">Everyone’s in today.</p>
        ) : (
          <ul className="space-y-2.5">
            {shown.map((lr) => {
              const name = nameById.get(lr.employeeId) ?? lr.employeeId
              return (
                <li key={lr.id} className="flex items-center gap-2.5">
                  <Avatar name={name} size="sm" />
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">
                    {name}
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {humanizeEnum(lr.leaveType)}
                  </span>
                </li>
              )
            })}
            {offToday.length > shown.length && (
              <li className="text-xs text-muted-foreground">
                +{offToday.length - shown.length} more
              </li>
            )}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}

// --- upcoming public holidays ---------------------------------------------

function UpcomingHolidaysCard({
  holidays,
  todayKey,
}: {
  holidays: { id: string; name: string; date: string }[]
  todayKey: string
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Upcoming holidays</CardTitle>
      </CardHeader>
      <CardContent>
        {holidays.length === 0 ? (
          <p className="text-sm text-muted-foreground">None scheduled.</p>
        ) : (
          <ul className="-mr-2 max-h-64 space-y-2.5 overflow-y-auto pr-2">
            {holidays.map((h) => {
              const isToday = h.date.slice(0, 10) === todayKey
              return (
                <li key={h.id} className="flex items-center gap-2.5">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    <CalendarDays className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">
                    {h.name}
                  </span>
                  <span
                    className={cn(
                      "shrink-0 text-xs",
                      isToday
                        ? "font-medium text-emerald-600 dark:text-emerald-400"
                        : "text-muted-foreground",
                    )}
                  >
                    {isToday ? "Today" : formatDate(h.date)}
                  </span>
                </li>
              )
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}

// --- visa compliance ------------------------------------------------------

function VisaAttentionCard({ employees }: { employees: Employee[] }) {
  const shown = employees.slice(0, 8)
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <div>
          <CardTitle>Visa attention</CardTitle>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Employees with an expired or soon-to-expire visa.
          </p>
        </div>
        <Badge variant="neutral">{employees.length}</Badge>
      </CardHeader>
      <CardContent>
        <ul className="divide-y divide-border">
          {shown.map((e) => (
            <li
              key={e.id}
              className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0"
            >
              <Link
                to={`/employees/${e.id}`}
                className="flex min-w-0 items-center gap-2.5 hover:underline"
              >
                <Avatar name={`${e.firstName} ${e.lastName}`} size="sm" />
                <span className="truncate text-sm font-medium">
                  {e.firstName} {e.lastName}
                </span>
              </Link>
              <div className="flex shrink-0 items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  {formatDate(e.visaEndDate)}
                </span>
                <VisaBadge visaEndDate={e.visaEndDate} />
              </div>
            </li>
          ))}
        </ul>
        {employees.length > shown.length && (
          <p className="mt-2 text-xs text-muted-foreground">
            +{employees.length - shown.length} more
          </p>
        )}
      </CardContent>
    </Card>
  )
}

// --- single-hue magnitude bars --------------------------------------------

/** Horizontal bars for a single measure across categories. One hue (brand) +
 * direct labels — color reinforces, it never carries identity. A `muted` row
 * (e.g. "Unassigned") is greyed to read as not-a-real-category. */
function BarList({
  rows,
  unit,
}: {
  rows: { label: string; value: number; muted?: boolean }[]
  unit: string
}) {
  if (rows.length === 0) {
    return <EmptyState>No data yet.</EmptyState>
  }
  const max = Math.max(...rows.map((r) => r.value), 1)
  return (
    <div className="space-y-2.5">
      {rows.map((row) => (
        <div key={row.label} className="grid grid-cols-[8rem_1fr_2rem] items-center gap-3">
          <span
            className={cn(
              "truncate text-sm",
              row.muted && "text-muted-foreground italic",
            )}
            title={row.label}
          >
            {row.label}
          </span>
          <div
            className="h-2.5 overflow-hidden rounded-full bg-muted"
            role="img"
            aria-label={`${row.label}: ${row.value} ${unit}${row.value === 1 ? "" : "s"}`}
          >
            <div
              className={cn(
                "h-full rounded-full",
                row.muted ? "bg-muted-foreground/40" : "bg-primary",
              )}
              // Zero renders as an empty track; non-zero gets a visible minimum.
              style={{
                width:
                  row.value === 0
                    ? "0%"
                    : `${Math.max((row.value / max) * 100, 4)}%`,
              }}
            />
          </div>
          <span className="text-right text-sm tabular-nums text-muted-foreground">
            {row.value}
          </span>
        </div>
      ))}
    </div>
  )
}
