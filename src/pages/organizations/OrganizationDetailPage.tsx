import { useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { ArrowLeft, Check, Pencil, Trash2, X } from "lucide-react"

import { PageHeader } from "@/components/PageHeader"
import { EmptyState, ErrorState } from "@/components/states"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { LoadingState } from "@/components/ui/spinner"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { LeaveType } from "@/apis/leave-types"
import {
  useDeleteOrganization,
  useOrganization,
  useOrganizationBranding,
} from "@/hooks/useOrganizations"
import { useAllLeaveTypes, useUpdateLeaveType } from "@/hooks/useLeaveTypes"
import { getApiErrorMessage } from "@/lib/api"
import { toast } from "@/stores/toastStore"

function Swatch({ label, color }: { label: string; color: string | null }) {
  return (
    <div className="flex items-center gap-2">
      <span
        className="size-6 rounded-md border border-border"
        style={{ backgroundColor: color ?? "transparent" }}
      />
      <div className="text-sm">
        <div className="text-muted-foreground">{label}</div>
        <div className="font-mono text-xs">{color ?? "—"}</div>
      </div>
    </div>
  )
}

export function OrganizationDetailPage() {
  const { id = "" } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: org, isLoading, isError, error } = useOrganization(id)
  const branding = useOrganizationBranding(id)
  const deleteMut = useDeleteOrganization()
  const [deleteError, setDeleteError] = useState<string | null>(null)

  if (isLoading) return <LoadingState />
  if (isError || !org)
    return <ErrorState error={error} notFoundLabel="Organization not found." />

  async function remove() {
    if (!window.confirm("Delete this organization? This cannot be undone."))
      return
    setDeleteError(null)
    try {
      await deleteMut.mutateAsync(id)
      navigate("/organizations")
    } catch (err) {
      setDeleteError(getApiErrorMessage(err))
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={org.name}
        description={org.slug}
        actions={
          <>
            <Button variant="outline" onClick={() => navigate("/organizations")}>
              <ArrowLeft />
              Back
            </Button>
            <Button onClick={() => navigate(`/organizations/${id}/edit`)}>
              <Pencil />
              Edit
            </Button>
          </>
        }
      />

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Details</CardTitle>
          {org.isDefault && <Badge>Default</Badge>}
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2 [&>dt]:text-sm [&>dt]:text-muted-foreground [&>dd]:text-sm">
            <dt>Name</dt>
            <dd>{org.name}</dd>
            <dt>Slug</dt>
            <dd className="font-mono text-xs">{org.slug}</dd>
            <dt>Logo</dt>
            <dd>
              {org.logo ? (
                <a
                  href={org.logo}
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary underline-offset-4 hover:underline"
                >
                  Open
                </a>
              ) : (
                "—"
              )}
            </dd>
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Branding</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {branding.isLoading && <LoadingState />}
          {branding.isError && <ErrorState error={branding.error} />}
          {branding.data && (
            <div className="flex flex-wrap gap-8">
              <Swatch label="Primary" color={branding.data.primaryColor} />
              <Swatch label="Secondary" color={branding.data.secondaryColor} />
              {branding.data.logo && (
                <img
                  src={branding.data.logo}
                  alt={`${org.name} logo`}
                  className="h-10 max-w-40 object-contain"
                />
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <LeaveTypesCard organizationId={id} />

      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle className="text-destructive">Danger zone</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Deleting is blocked while the organization still has employees.
          </p>
          <Button
            variant="destructive"
            size="sm"
            onClick={remove}
            disabled={deleteMut.isPending}
          >
            <Trash2 />
            {deleteMut.isPending ? "Deleting…" : "Delete organization"}
          </Button>
          {deleteError && (
            <p role="alert" className="text-sm text-destructive">
              {deleteError}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// --- leave types ----------------------------------------------------------

function LeaveTypesCard({ organizationId }: { organizationId: string }) {
  const { data, isLoading, isError, error } = useAllLeaveTypes(organizationId)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Leave types</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading && <LoadingState />}
        {isError && <ErrorState error={error} />}
        {data &&
          (data.length === 0 ? (
            <EmptyState>No leave types.</EmptyState>
          ) : (
            <div className="rounded-xl border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Days / year</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((lt) => (
                    <LeaveTypeRow key={lt.id} leaveType={lt} />
                  ))}
                </TableBody>
              </Table>
            </div>
          ))}
      </CardContent>
    </Card>
  )
}

/** One leave-type row with inline editing of `daysPerYear` (the only field
 * this client can change). */
function LeaveTypeRow({ leaveType }: { leaveType: LeaveType }) {
  const mut = useUpdateLeaveType()
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(String(leaveType.daysPerYear))

  function startEditing() {
    setValue(String(leaveType.daysPerYear))
    setEditing(true)
  }

  async function save() {
    const days = Number(value)
    if (!Number.isFinite(days) || days < 0) {
      toast.error("Enter a valid number of days.")
      return
    }
    try {
      await mut.mutateAsync({ id: leaveType.id, daysPerYear: days })
      setEditing(false)
    } catch (err) {
      toast.error(getApiErrorMessage(err))
    }
  }

  return (
    <TableRow>
      <TableCell className="font-medium">{leaveType.name}</TableCell>
      <TableCell>
        {editing ? (
          <div className="w-28">
            <Input
              type="number"
              min="0"
              step="1"
              autoFocus
              value={value}
              onChange={(e) => setValue(e.target.value)}
            />
          </div>
        ) : (
          leaveType.daysPerYear
        )}
      </TableCell>
      <TableCell>
        <div className="flex justify-end gap-1">
          {editing ? (
            <>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={save}
                disabled={mut.isPending}
                aria-label="Save"
              >
                <Check />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setEditing(false)}
                disabled={mut.isPending}
                aria-label="Cancel"
              >
                <X />
              </Button>
            </>
          ) : (
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={startEditing}
              aria-label="Edit"
            >
              <Pencil />
            </Button>
          )}
        </div>
      </TableCell>
    </TableRow>
  )
}
