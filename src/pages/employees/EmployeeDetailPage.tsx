import { useState, type FormEvent } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { ArrowLeft, Pencil, Plus, Trash2 } from "lucide-react"

import { EmployeeProfileCard } from "@/components/EmployeeProfileCard"
import { LeaveBalancesCard } from "@/components/LeaveBalancesCard"
import { Field } from "@/components/form/Field"
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
  canDeleteEmployee,
  CONTRACT_TYPE_VALUES,
  EMPLOYEE_STATUS_VALUES,
  type Employee,
  type EmployeeStatus,
} from "@/apis/employees"
import {
  useCreateEmployeeContract,
  useCreateEmployeeDocument,
  useDeleteEmployee,
  useEmployee,
  useEmployeeContracts,
  useEmployeeDocuments,
  useUpdateEmployee,
} from "@/hooks/useEmployees"
import { getApiErrorMessage } from "@/lib/api"
import { formatDate, humanizeEnum } from "@/lib/format"

export function EmployeeDetailPage() {
  const { id = "" } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: employee, isLoading, isError, error } = useEmployee(id)

  if (isLoading) return <LoadingState />
  if (isError || !employee)
    return <ErrorState error={error} notFoundLabel="Employee not found." />

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${employee.firstName} ${employee.lastName}`}
        description={employee.employeeCode}
        actions={
          <>
            <Button variant="outline" onClick={() => navigate("/employees")}>
              <ArrowLeft />
              Back
            </Button>
            <Button onClick={() => navigate(`/employees/${id}/edit`)}>
              <Pencil />
              Edit
            </Button>
          </>
        }
      />

      <EmployeeProfileCard employee={employee} />
      <LeaveBalancesCard balances={employee.leaveBalances ?? []} />
      <StatusCard employee={employee} />
      <ContractsCard employeeId={id} />
      <DocumentsCard employeeId={id} />
      <DangerZone employee={employee} />
    </div>
  )
}

// --- contracts ------------------------------------------------------------

function ContractsCard({ employeeId }: { employeeId: string }) {
  const { data, isLoading, isError, error } = useEmployeeContracts(employeeId)
  const [open, setOpen] = useState(false)

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>Contracts</CardTitle>
        <Button size="sm" variant="outline" onClick={() => setOpen((v) => !v)}>
          <Plus />
          Add contract
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {open && (
          <AddContractForm employeeId={employeeId} onDone={() => setOpen(false)} />
        )}
        {isLoading && <LoadingState />}
        {isError && <ErrorState error={error} />}
        {data &&
          (data.length === 0 ? (
            <EmptyState>No contracts recorded.</EmptyState>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Start</TableHead>
                  <TableHead>End</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>{humanizeEnum(c.contractType)}</TableCell>
                    <TableCell>{formatDate(c.startDate)}</TableCell>
                    <TableCell>{formatDate(c.endDate)}</TableCell>
                    <TableCell>
                      <Badge variant="neutral">{humanizeEnum(c.status)}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ))}
      </CardContent>
    </Card>
  )
}

function AddContractForm({
  employeeId,
  onDone,
}: {
  employeeId: string
  onDone: () => void
}) {
  const mut = useCreateEmployeeContract(employeeId)
  const [contractType, setContractType] = useState("")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [fileUrl, setFileUrl] = useState("")
  const [error, setError] = useState<string | null>(null)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    try {
      await mut.mutateAsync({
        contractType: contractType as (typeof CONTRACT_TYPE_VALUES)[number],
        startDate,
        endDate: endDate || undefined,
        fileUrl: fileUrl || undefined,
      })
      onDone()
    } catch (err) {
      setError(getApiErrorMessage(err))
    }
  }

  return (
    <form
      onSubmit={submit}
      className="grid grid-cols-1 gap-4 rounded-lg border border-border bg-muted/30 p-4 sm:grid-cols-2"
    >
      <Field label="Contract type" required>
        <Select
          required
          value={contractType}
          onChange={(e) => setContractType(e.target.value)}
        >
          <option value="" disabled>
            Select…
          </option>
          {CONTRACT_TYPE_VALUES.map((t) => (
            <option key={t} value={t}>
              {humanizeEnum(t)}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="File URL">
        <Input value={fileUrl} onChange={(e) => setFileUrl(e.target.value)} />
      </Field>
      <Field label="Start date" required>
        <Input
          type="date"
          required
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
        />
      </Field>
      <Field label="End date">
        <Input
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
        />
      </Field>
      {error && (
        <p role="alert" className="text-sm text-destructive sm:col-span-2">
          {error}
        </p>
      )}
      <div className="flex justify-end gap-2 sm:col-span-2">
        <Button type="button" variant="ghost" size="sm" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" size="sm" disabled={mut.isPending}>
          {mut.isPending ? "Adding…" : "Add contract"}
        </Button>
      </div>
    </form>
  )
}

// --- documents ------------------------------------------------------------

function DocumentsCard({ employeeId }: { employeeId: string }) {
  const { data, isLoading, isError, error } = useEmployeeDocuments(employeeId)
  const [open, setOpen] = useState(false)

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>Documents</CardTitle>
        <Button size="sm" variant="outline" onClick={() => setOpen((v) => !v)}>
          <Plus />
          Add document
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {open && (
          <AddDocumentForm employeeId={employeeId} onDone={() => setOpen(false)} />
        )}
        {isLoading && <LoadingState />}
        {isError && <ErrorState error={error} />}
        {data &&
          (data.length === 0 ? (
            <EmptyState>No documents uploaded.</EmptyState>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>File</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell>{d.documentType}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {d.description || "—"}
                    </TableCell>
                    <TableCell>
                      <a
                        href={d.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary underline-offset-4 hover:underline"
                      >
                        Open
                      </a>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ))}
      </CardContent>
    </Card>
  )
}

function AddDocumentForm({
  employeeId,
  onDone,
}: {
  employeeId: string
  onDone: () => void
}) {
  const mut = useCreateEmployeeDocument(employeeId)
  const [documentType, setDocumentType] = useState("")
  const [fileUrl, setFileUrl] = useState("")
  const [description, setDescription] = useState("")
  const [error, setError] = useState<string | null>(null)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    try {
      await mut.mutateAsync({
        documentType,
        fileUrl,
        description: description || undefined,
      })
      onDone()
    } catch (err) {
      setError(getApiErrorMessage(err))
    }
  }

  return (
    <form
      onSubmit={submit}
      className="grid grid-cols-1 gap-4 rounded-lg border border-border bg-muted/30 p-4 sm:grid-cols-2"
    >
      <Field label="Document type" required>
        <Input
          required
          value={documentType}
          onChange={(e) => setDocumentType(e.target.value)}
          placeholder="Educational Certificate"
        />
      </Field>
      <Field label="File URL" required>
        <Input
          required
          value={fileUrl}
          onChange={(e) => setFileUrl(e.target.value)}
        />
      </Field>
      <Field label="Description" htmlFor="doc-desc">
        <Textarea
          id="doc-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </Field>
      {error && (
        <p role="alert" className="text-sm text-destructive sm:col-span-2">
          {error}
        </p>
      )}
      <div className="flex justify-end gap-2 sm:col-span-2">
        <Button type="button" variant="ghost" size="sm" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" size="sm" disabled={mut.isPending}>
          {mut.isPending ? "Adding…" : "Add document"}
        </Button>
      </div>
    </form>
  )
}

// --- status ---------------------------------------------------------------

function StatusCard({ employee }: { employee: Employee }) {
  const updateMut = useUpdateEmployee(employee.id)
  const [status, setStatus] = useState<EmployeeStatus>(employee.status)
  const [error, setError] = useState<string | null>(null)
  const changed = status !== employee.status

  async function save() {
    setError(null)
    try {
      await updateMut.mutateAsync({ status })
    } catch (err) {
      setError(getApiErrorMessage(err))
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Status</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap items-end gap-3">
          <Field label="Employment status" htmlFor="employee-status">
            <div className="w-52">
              <Select
                id="employee-status"
                value={status}
                onChange={(e) => setStatus(e.target.value as EmployeeStatus)}
              >
                {EMPLOYEE_STATUS_VALUES.map((s) => (
                  <option key={s} value={s}>
                    {humanizeEnum(s)}
                  </option>
                ))}
              </Select>
            </div>
          </Field>
          <Button
            size="sm"
            onClick={save}
            disabled={!changed || updateMut.isPending}
          >
            {updateMut.isPending ? "Updating…" : "Update status"}
          </Button>
        </div>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
      </CardContent>
    </Card>
  )
}

// --- danger zone ----------------------------------------------------------

function DangerZone({ employee }: { employee: Employee }) {
  const navigate = useNavigate()
  const deleteMut = useDeleteEmployee()
  const [error, setError] = useState<string | null>(null)
  const deletable = canDeleteEmployee(employee)

  async function remove() {
    if (!window.confirm("Delete this employee? This cannot be undone.")) return
    setError(null)
    try {
      await deleteMut.mutateAsync(employee.id)
      navigate("/employees")
    } catch (err) {
      setError(getApiErrorMessage(err))
    }
  }

  return (
    <Card className="border-destructive/30">
      <CardHeader>
        <CardTitle className="text-destructive">Danger zone</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          An employee must be <strong>Inactive</strong> before they can be
          deleted. Change their status above first.
        </p>
        <Button
          variant="destructive"
          size="sm"
          onClick={remove}
          disabled={!deletable || deleteMut.isPending}
          title={deletable ? undefined : "Set the employee to Inactive first"}
        >
          <Trash2 />
          {deleteMut.isPending ? "Deleting…" : "Delete employee"}
        </Button>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
