import { useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Pencil, Plus, Trash2 } from "lucide-react"

import { PageHeader } from "@/components/PageHeader"
import { EmptyState, ErrorState } from "@/components/states"
import { Avatar } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Pagination } from "@/components/ui/pagination"
import { SearchInput } from "@/components/ui/search-input"
import { useConfirm } from "@/components/ui/confirm-dialog"
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
import type { Department } from "@/apis/departments"
import { useDeleteDepartment, useAllDepartments } from "@/hooks/useDepartments"
import { useAllEmployees } from "@/hooks/useEmployees"
import { DEFAULT_PAGE_SIZE, getApiErrorMessage } from "@/lib/api"
import { compareValues, useSort } from "@/lib/sort"
import { toast } from "@/stores/toastStore"

type SortKey = "name" | "manager" | "headcount"

export function DepartmentsPage() {
  const navigate = useNavigate()
  // Search is filtered client-side, so load the full set and paginate the
  // filtered result on the client.
  const { data: departments, isLoading, isError, error } = useAllDepartments()
  const employees = useAllEmployees()
  const deleteMut = useDeleteDepartment()
  const confirm = useConfirm()
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const sort = useSort<SortKey>("name")

  const employeeName = useMemo(() => {
    const map = new Map<string, string>()
    for (const e of employees.data ?? [])
      map.set(e.id, `${e.firstName} ${e.lastName}`)
    return map
  }, [employees.data])

  // Headcount per department (by employees' departmentId).
  const headcount = useMemo(() => {
    const map = new Map<string, number>()
    for (const e of employees.data ?? []) {
      if (e.departmentId)
        map.set(e.departmentId, (map.get(e.departmentId) ?? 0) + 1)
    }
    return map
  }, [employees.data])

  const managerNameOf = (d: Department) =>
    d.managerId ? (employeeName.get(d.managerId) ?? "") : ""

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return departments ?? []
    return (departments ?? []).filter((d) => d.name.toLowerCase().includes(q))
  }, [departments, search])

  const sorted = useMemo(() => {
    const get: Record<SortKey, (d: Department) => string | number> = {
      name: (d) => d.name,
      manager: (d) => (d.managerId ? (employeeName.get(d.managerId) ?? "") : ""),
      headcount: (d) => headcount.get(d.id) ?? 0,
    }
    const arr = [...filtered]
    arr.sort((a, b) => compareValues(get[sort.key](a), get[sort.key](b)))
    return sort.dir === "asc" ? arr : arr.reverse()
  }, [filtered, sort.key, sort.dir, employeeName, headcount])

  const pageCount = Math.max(1, Math.ceil(sorted.length / DEFAULT_PAGE_SIZE))
  const safePage = Math.min(page, pageCount)
  const paged = sorted.slice(
    (safePage - 1) * DEFAULT_PAGE_SIZE,
    safePage * DEFAULT_PAGE_SIZE,
  )

  async function remove(id: string, name: string) {
    const ok = await confirm({
      title: "Delete department",
      description: `“${name}” will be permanently deleted.`,
      confirmLabel: "Delete department",
    })
    if (!ok) return
    try {
      await deleteMut.mutateAsync(id)
    } catch (err) {
      toast.error(getApiErrorMessage(err))
    }
  }

  return (
    <div>
      <PageHeader
        title="Departments"
        description="Teams within your organization."
        actions={
          <Button onClick={() => navigate("/departments/new")}>
            <Plus />
            New department
          </Button>
        }
      />

      {isLoading && <LoadingState />}
      {isError && <ErrorState error={error} />}

      {departments && (
        <>
          <div className="mb-4 max-w-xs">
            <SearchInput
              placeholder="Search departments…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
            />
          </div>

          {sorted.length === 0 ? (
            <EmptyState>
              {search
                ? "No departments match your search."
                : "No departments yet."}
            </EmptyState>
          ) : (
            <>
              <div className="rounded-xl border border-border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <SortHeader label="Name" sortKey="name" state={sort} />
                      <TableHead>Description</TableHead>
                      <SortHeader
                        label="Manager"
                        sortKey="manager"
                        state={sort}
                      />
                      <SortHeader
                        label="Employees"
                        sortKey="headcount"
                        state={sort}
                      />
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paged.map((d) => {
                      const manager = managerNameOf(d)
                      return (
                        <TableRow key={d.id}>
                          <TableCell className="font-medium">{d.name}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {d.description || "—"}
                          </TableCell>
                          <TableCell>
                            {manager ? (
                              <div className="flex items-center gap-2">
                                <Avatar name={manager} size="sm" />
                                <span>{manager}</span>
                              </div>
                            ) : (
                              "—"
                            )}
                          </TableCell>
                          <TableCell className="tabular-nums text-muted-foreground">
                            {headcount.get(d.id) ?? 0}
                          </TableCell>
                          <TableCell>
                            <div className="flex justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                onClick={() =>
                                  navigate(`/departments/${d.id}/edit`)
                                }
                                aria-label="Edit"
                              >
                                <Pencil />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                onClick={() => remove(d.id, d.name)}
                                disabled={deleteMut.isPending}
                                aria-label="Delete"
                                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                              >
                                <Trash2 />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })}
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
