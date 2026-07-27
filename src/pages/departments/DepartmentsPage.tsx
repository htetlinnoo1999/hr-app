import { useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Pencil, Plus, Trash2 } from "lucide-react"

import { PageHeader } from "@/components/PageHeader"
import { EmptyState, ErrorState } from "@/components/states"
import { Button } from "@/components/ui/button"
import { Pagination } from "@/components/ui/pagination"
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
import { useDeleteDepartment, useAllDepartments } from "@/hooks/useDepartments"
import { useAllEmployees } from "@/hooks/useEmployees"
import { DEFAULT_PAGE_SIZE, getApiErrorMessage } from "@/lib/api"
import { toast } from "@/stores/toastStore"

export function DepartmentsPage() {
  const navigate = useNavigate()
  // Search is filtered client-side, so load the full set and paginate the
  // filtered result on the client.
  const { data: departments, isLoading, isError, error } = useAllDepartments()
  const employees = useAllEmployees()
  const deleteMut = useDeleteDepartment()
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)

  const employeeName = useMemo(() => {
    const map = new Map<string, string>()
    for (const e of employees.data ?? [])
      map.set(e.id, `${e.firstName} ${e.lastName}`)
    return map
  }, [employees.data])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return departments ?? []
    return (departments ?? []).filter((d) =>
      d.name.toLowerCase().includes(q),
    )
  }, [departments, search])

  const pageCount = Math.max(1, Math.ceil(filtered.length / DEFAULT_PAGE_SIZE))
  const safePage = Math.min(page, pageCount)
  const paged = filtered.slice(
    (safePage - 1) * DEFAULT_PAGE_SIZE,
    safePage * DEFAULT_PAGE_SIZE,
  )

  async function remove(id: string, name: string) {
    if (!window.confirm(`Delete department “${name}”?`)) return
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

          {filtered.length === 0 ? (
            <EmptyState>
              {search ? "No departments match your search." : "No departments yet."}
            </EmptyState>
          ) : (
            <>
            <div className="rounded-xl border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Manager</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paged.map((d) => (
                    <TableRow key={d.id}>
                      <TableCell className="font-medium">{d.name}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {d.description || "—"}
                      </TableCell>
                      <TableCell>
                        {d.managerId
                          ? (employeeName.get(d.managerId) ?? "—")
                          : "—"}
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => navigate(`/departments/${d.id}/edit`)}
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
                          >
                            <Trash2 />
                          </Button>
                        </div>
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
