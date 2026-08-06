import { useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Pencil, Plus, Trash2 } from "lucide-react"

import { PageHeader } from "@/components/PageHeader"
import { EmptyState, ErrorState } from "@/components/states"
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
import type { EndClient } from "@/apis/end-clients"
import { useAllEndClients, useDeleteEndClient } from "@/hooks/useEndClients"
import { DEFAULT_PAGE_SIZE, getApiErrorMessage } from "@/lib/api"
import { compareValues, useSort } from "@/lib/sort"
import { toast } from "@/stores/toastStore"

type SortKey = "name" | "contactPerson" | "email"

export function EndClientsPage() {
  const navigate = useNavigate()
  // Search is filtered client-side, so load the full set and paginate the
  // filtered result on the client.
  const { data: endClients, isLoading, isError, error } = useAllEndClients()
  const deleteMut = useDeleteEndClient()
  const confirm = useConfirm()
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const sort = useSort<SortKey>("name")

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return endClients ?? []
    return (endClients ?? []).filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.contactPerson?.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q),
    )
  }, [endClients, search])

  const sorted = useMemo(() => {
    const get: Record<SortKey, (c: EndClient) => string> = {
      name: (c) => c.name,
      contactPerson: (c) => c.contactPerson ?? "",
      email: (c) => c.email ?? "",
    }
    const arr = [...filtered]
    arr.sort((a, b) => compareValues(get[sort.key](a), get[sort.key](b)))
    return sort.dir === "asc" ? arr : arr.reverse()
  }, [filtered, sort.key, sort.dir])

  const pageCount = Math.max(1, Math.ceil(sorted.length / DEFAULT_PAGE_SIZE))
  const safePage = Math.min(page, pageCount)
  const paged = sorted.slice(
    (safePage - 1) * DEFAULT_PAGE_SIZE,
    safePage * DEFAULT_PAGE_SIZE,
  )

  async function remove(client: EndClient) {
    const ok = await confirm({
      title: "Delete end client",
      description: `“${client.name}” will be permanently deleted. Employees assigned to it must be reassigned first.`,
      confirmLabel: "Delete end client",
    })
    if (!ok) return
    try {
      await deleteMut.mutateAsync(client.id)
    } catch (err) {
      // The backend returns 409 with a message naming how many employees are
      // still assigned; surface it, with a clear fallback.
      toast.error(
        getApiErrorMessage(
          err,
          "Cannot delete — employees are still assigned to this end client. Reassign or clear them first.",
        ),
      )
    }
  }

  return (
    <div>
      <PageHeader
        title="End clients"
        description="Companies your employees are placed at."
        actions={
          <Button onClick={() => navigate("/end-clients/new")}>
            <Plus />
            New end client
          </Button>
        }
      />

      {isLoading && <LoadingState />}
      {isError && <ErrorState error={error} />}

      {endClients && (
        <>
          <div className="mb-4 max-w-xs">
            <SearchInput
              placeholder="Search name, contact or email…"
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
                ? "No end clients match your search."
                : "No end clients yet."}
            </EmptyState>
          ) : (
            <>
              <div className="rounded-xl border border-border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <SortHeader label="Name" sortKey="name" state={sort} />
                      <SortHeader
                        label="Contact person"
                        sortKey="contactPerson"
                        state={sort}
                      />
                      <SortHeader label="Email" sortKey="email" state={sort} />
                      <TableHead>WhatsApp</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paged.map((c) => (
                      <TableRow key={c.id}>
                        <TableCell className="font-medium">{c.name}</TableCell>
                        <TableCell>{c.contactPerson || "—"}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {c.email || "—"}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {c.whatsappNumber || "—"}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {c.phone || "—"}
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() =>
                                navigate(`/end-clients/${c.id}/edit`)
                              }
                              aria-label="Edit"
                            >
                              <Pencil />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => remove(c)}
                              disabled={deleteMut.isPending}
                              aria-label="Delete"
                              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
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
