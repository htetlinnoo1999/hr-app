import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Plus } from "lucide-react"

import { PageHeader } from "@/components/PageHeader"
import { EmptyState, ErrorState } from "@/components/states"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Pagination } from "@/components/ui/pagination"
import { LoadingState } from "@/components/ui/spinner"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { DEFAULT_PAGE_SIZE } from "@/lib/api"
import { useOrganizations } from "@/hooks/useOrganizations"

function ColorSwatch({ color }: { color: string | null }) {
  if (!color) return <span className="text-muted-foreground">—</span>
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className="size-3 rounded-full border border-border"
        style={{ backgroundColor: color }}
      />
      <span className="font-mono text-xs">{color}</span>
    </span>
  )
}

export function OrganizationsPage() {
  const navigate = useNavigate()
  const [page, setPage] = useState(1)
  const { data, isLoading, isError, error } = useOrganizations({
    page,
    limit: DEFAULT_PAGE_SIZE,
  })
  const orgs = data?.data
  const pageCount = data ? Math.max(1, Math.ceil(data.total / data.limit)) : 1

  return (
    <div>
      <PageHeader
        title="Organizations"
        description="Every organization on the platform."
        actions={
          <Button onClick={() => navigate("/organizations/new")}>
            <Plus />
            New organization
          </Button>
        }
      />

      {isLoading && <LoadingState />}
      {isError && <ErrorState error={error} />}

      {orgs &&
        (orgs.length === 0 ? (
          <EmptyState>No organizations yet.</EmptyState>
        ) : (
          <>
          <div className="rounded-xl border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Primary</TableHead>
                  <TableHead>Secondary</TableHead>
                  <TableHead>Default</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orgs.map((org) => (
                  <TableRow
                    key={org.id}
                    className="cursor-pointer"
                    onClick={() => navigate(`/organizations/${org.id}`)}
                  >
                    <TableCell className="font-medium">{org.name}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {org.slug}
                    </TableCell>
                    <TableCell>
                      <ColorSwatch color={org.primaryColor} />
                    </TableCell>
                    <TableCell>
                      <ColorSwatch color={org.secondaryColor} />
                    </TableCell>
                    <TableCell>
                      {org.isDefault && <Badge>Default</Badge>}
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
