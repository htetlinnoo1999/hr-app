import { useMemo, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { Plus } from "lucide-react"

import { PageHeader } from "@/components/PageHeader"
import { EmployeeStatusBadge } from "@/components/EmployeeStatusBadge"
import { VisaBadge } from "@/components/VisaBadge"
import { EmptyState, ErrorState } from "@/components/states"
import { Avatar } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Pagination } from "@/components/ui/pagination"
import { Select } from "@/components/ui/select"
import { SearchInput } from "@/components/ui/search-input"
import { SortHeader } from "@/components/ui/sortable-header"
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
  EMPLOYEE_STATUSES,
  EMPLOYEE_STATUS_VALUES,
  type Employee,
  type EmployeeStatus,
} from "@/apis/employees"
import { useAllEmployees } from "@/hooks/useEmployees"
import { useAllDepartments } from "@/hooks/useDepartments"
import { DEFAULT_PAGE_SIZE } from "@/lib/api"
import { humanizeEnum } from "@/lib/format"
import { compareValues, useSort } from "@/lib/sort"

type SortKey = "name" | "code" | "department" | "employment" | "status"

export function EmployeesPage() {
  const navigate = useNavigate()
  // Free-text search + status are filtered client-side, so we load the full
  // set and paginate the filtered result on the client.
  const { data: employees, isLoading, isError, error } = useAllEmployees()
  const departments = useAllDepartments()
  const [search, setSearch] = useState("")
  const [status, setStatus] = useState<EmployeeStatus | "">("")
  const [page, setPage] = useState(1)
  const sort = useSort<SortKey>("name")

  const deptName = useMemo(() => {
    const map = new Map<string, string>()
    for (const d of departments.data ?? []) map.set(d.id, d.name)
    return map
  }, [departments.data])

  const departmentOf = (e: Employee) =>
    e.departmentId ? (deptName.get(e.departmentId) ?? "") : ""

  const counts = useMemo(() => {
    const list = employees ?? []
    return {
      total: list.length,
      active: list.filter((e) => e.status === EMPLOYEE_STATUSES.ACTIVE).length,
      onLeave: list.filter((e) => e.status === EMPLOYEE_STATUSES.ON_LEAVE)
        .length,
      inactive: list.filter(
        (e) =>
          e.status === EMPLOYEE_STATUSES.INACTIVE ||
          e.status === EMPLOYEE_STATUSES.TERMINATED,
      ).length,
    }
  }, [employees])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return (employees ?? []).filter((e) => {
      if (status && e.status !== status) return false
      if (!q) return true
      return (
        `${e.firstName} ${e.lastName}`.toLowerCase().includes(q) ||
        e.employeeCode.toLowerCase().includes(q) ||
        e.email.toLowerCase().includes(q)
      )
    })
  }, [employees, search, status])

  const sorted = useMemo(() => {
    const get: Record<SortKey, (e: Employee) => string> = {
      name: (e) => `${e.firstName} ${e.lastName}`,
      code: (e) => e.employeeCode,
      department: (e) =>
        e.departmentId ? (deptName.get(e.departmentId) ?? "") : "",
      employment: (e) => e.employmentType,
      status: (e) => e.status,
    }
    const arr = [...filtered]
    arr.sort((a, b) => compareValues(get[sort.key](a), get[sort.key](b)))
    return sort.dir === "asc" ? arr : arr.reverse()
  }, [filtered, sort.key, sort.dir, deptName])

  const pageCount = Math.max(1, Math.ceil(sorted.length / DEFAULT_PAGE_SIZE))
  const safePage = Math.min(page, pageCount)
  const paged = sorted.slice(
    (safePage - 1) * DEFAULT_PAGE_SIZE,
    safePage * DEFAULT_PAGE_SIZE,
  )

  return (
    <div>
      <PageHeader
        title="Employees"
        description="People across your organization."
        actions={
          <Button onClick={() => navigate("/employees/new")}>
            <Plus />
            Onboard new employee
          </Button>
        }
      />

      {isLoading && <LoadingState />}
      {isError && <ErrorState error={error} />}

      {employees && (
        <>
          <div className="mb-4 flex flex-wrap items-center gap-x-6 gap-y-2">
            <Stat label="Total" value={counts.total} />
            <Stat label="Active" value={counts.active} />
            <Stat label="On leave" value={counts.onLeave} />
            <Stat label="Inactive" value={counts.inactive} />
          </div>

          <div className="mb-4 flex flex-wrap items-center gap-3">
            <div className="max-w-xs flex-1">
              <SearchInput
                placeholder="Search name, code or email…"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setPage(1)
                }}
              />
            </div>
            <div className="w-44">
              <Select
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value as EmployeeStatus | "")
                  setPage(1)
                }}
                aria-label="Filter by status"
              >
                <option value="">All statuses</option>
                {EMPLOYEE_STATUS_VALUES.map((s) => (
                  <option key={s} value={s}>
                    {humanizeEnum(s)}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          {sorted.length === 0 ? (
            <EmptyState>
              {employees.length === 0 ? (
                <>
                  No employees yet.{" "}
                  <Link
                    to="/employees/new"
                    className="text-primary underline-offset-4 hover:underline"
                  >
                    Onboard the first one
                  </Link>
                  .
                </>
              ) : (
                "No employees match your filters."
              )}
            </EmptyState>
          ) : (
            <>
              <div className="rounded-xl border border-border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <SortHeader label="Name" sortKey="name" state={sort} />
                      <SortHeader label="Code" sortKey="code" state={sort} />
                      <TableHead>Email</TableHead>
                      <SortHeader
                        label="Department"
                        sortKey="department"
                        state={sort}
                      />
                      <SortHeader
                        label="Employment"
                        sortKey="employment"
                        state={sort}
                      />
                      <SortHeader label="Status" sortKey="status" state={sort} />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paged.map((emp) => (
                      <TableRow
                        key={emp.id}
                        className="cursor-pointer"
                        onClick={() => navigate(`/employees/${emp.id}`)}
                      >
                        <TableCell>
                          <div className="flex items-center gap-2.5">
                            <Avatar
                              name={`${emp.firstName} ${emp.lastName}`}
                              src={emp.profilePicture}
                              size="sm"
                            />
                            <span className="font-medium">
                              {emp.firstName} {emp.lastName}
                            </span>
                            <VisaBadge visaEndDate={emp.visaEndDate} />
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {emp.employeeCode}
                        </TableCell>
                        <TableCell>{emp.email}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {departmentOf(emp) || "—"}
                        </TableCell>
                        <TableCell>{humanizeEnum(emp.employmentType)}</TableCell>
                        <TableCell>
                          <EmployeeStatusBadge status={emp.status} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <Pagination
                page={safePage}
                pageCount={pageCount}
                total={sorted.length}
                pageSize={DEFAULT_PAGE_SIZE}
                onPageChange={setPage}
              />
            </>
          )}
        </>
      )}
    </div>
  )
}

/** Compact labelled figure for the summary strip. */
function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <span className="text-lg font-semibold tabular-nums">{value}</span>
      <span className="text-sm text-muted-foreground">{label}</span>
    </div>
  )
}
