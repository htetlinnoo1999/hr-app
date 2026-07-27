import { useMemo, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { Plus } from "lucide-react"

import { PageHeader } from "@/components/PageHeader"
import { EmployeeStatusBadge } from "@/components/EmployeeStatusBadge"
import { EmptyState, ErrorState } from "@/components/states"
import { Button } from "@/components/ui/button"
import { Pagination } from "@/components/ui/pagination"
import { Select } from "@/components/ui/select"
import { SearchInput } from "@/components/ui/search-input"
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
  EMPLOYEE_STATUS_VALUES,
  type EmployeeStatus,
} from "@/apis/employees"
import { useAllEmployees } from "@/hooks/useEmployees"
import { DEFAULT_PAGE_SIZE } from "@/lib/api"
import { humanizeEnum } from "@/lib/format"

export function EmployeesPage() {
  const navigate = useNavigate()
  // Free-text search + status are filtered client-side, so we load the full
  // set and paginate the filtered result on the client.
  const { data: employees, isLoading, isError, error } = useAllEmployees()
  const [search, setSearch] = useState("")
  const [status, setStatus] = useState<EmployeeStatus | "">("")
  const [page, setPage] = useState(1)

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

  const pageCount = Math.max(1, Math.ceil(filtered.length / DEFAULT_PAGE_SIZE))
  const safePage = Math.min(page, pageCount)
  const paged = filtered.slice(
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
            New employee
          </Button>
        }
      />

      {isLoading && <LoadingState />}
      {isError && <ErrorState error={error} />}

      {employees && (
        <>
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

          {filtered.length === 0 ? (
            <EmptyState>
              {employees.length === 0 ? (
                <>
                  No employees yet.{" "}
                  <Link
                    to="/employees/new"
                    className="text-primary underline-offset-4 hover:underline"
                  >
                    Add the first one
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
                    <TableHead>Name</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Employment</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paged.map((emp) => (
                    <TableRow
                      key={emp.id}
                      className="cursor-pointer"
                      onClick={() => navigate(`/employees/${emp.id}`)}
                    >
                      <TableCell className="font-medium">
                        {emp.firstName} {emp.lastName}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {emp.employeeCode}
                      </TableCell>
                      <TableCell>{emp.email}</TableCell>
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
              total={filtered.length}
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
