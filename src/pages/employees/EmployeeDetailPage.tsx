import { useState, type ComponentType, type FormEvent } from "react"
import { useNavigate, useParams } from "react-router-dom"
import {
  ArrowLeft,
  Building2,
  CalendarDays,
  Mail,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react"

import { EmployeeProfileCard } from "@/components/EmployeeProfileCard"
import { EmployeeStatusBadge } from "@/components/EmployeeStatusBadge"
import { LeaveBalancesCard } from "@/components/LeaveBalancesCard"
import { Field } from "@/components/form/Field"
import { EmptyState, ErrorState } from "@/components/states"
import { Avatar } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useConfirm } from "@/components/ui/confirm-dialog"
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
  type EmployeeAllowance,
  type EmployeeStatus,
} from "@/apis/employees"
import {
  useCreateEmployeeAllowance,
  useCreateEmployeeContract,
  useCreateEmployeeDocument,
  useDeleteEmployee,
  useDeleteEmployeeAllowance,
  useEmployee,
  useEmployeeAllowances,
  useEmployeeContracts,
  useEmployeeDocuments,
  useUpdateEmployee,
  useUpdateEmployeeAllowance,
} from "@/hooks/useEmployees"
import { useAllDepartments } from "@/hooks/useDepartments"
import { getApiErrorMessage } from "@/lib/api"
import { formatDate, formatNumber, humanizeEnum } from "@/lib/format"
import { toast } from "@/stores/toastStore"

export function EmployeeDetailPage() {
  const { id = "" } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: employee, isLoading, isError, error } = useEmployee(id)

  if (isLoading) return <LoadingState />
  if (isError || !employee)
    return <ErrorState error={error} notFoundLabel="Employee not found." />

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={() => navigate("/employees")}>
          <ArrowLeft />
          Back
        </Button>
        <Button onClick={() => navigate(`/employees/${id}/edit`)}>
          <Pencil />
          Edit
        </Button>
      </div>

      <DetailHero employee={employee} />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <EmployeeProfileCard employee={employee} />
          <AllowancesCard employeeId={id} />
          <ContractsCard employeeId={id} />
          <DocumentsCard employeeId={id} />
        </div>
        <div className="space-y-6">
          <StatusCard employee={employee} />
          <LeaveBalancesCard balances={employee.leaveBalances ?? []} />
          <DangerZone employee={employee} />
        </div>
      </div>
    </div>
  )
}

// --- identity header ------------------------------------------------------

/** Banner header: gradient strip, overlapping avatar, and key facts. */
function DetailHero({ employee }: { employee: Employee }) {
  const departments = useAllDepartments()
  const fullName = `${employee.firstName} ${employee.lastName}`
  const deptName = employee.departmentId
    ? departments.data?.find((d) => d.id === employee.departmentId)?.name
    : null

  return (
    <Card className="overflow-hidden">
      <div className="h-24 bg-linear-to-r from-primary to-[oklch(0.4_0.14_var(--brand-h))]" />
      <div className="px-6 pb-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <Avatar
            name={fullName}
            src={employee.profilePicture}
            size="xl"
            className="-mt-12 ring-4 ring-card"
          />
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">{fullName}</h1>
              <EmployeeStatusBadge status={employee.status} />
            </div>
            <p className="text-sm text-muted-foreground">
              {employee.employeeCode} · {humanizeEnum(employee.employmentType)}
            </p>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2">
          <Fact icon={Mail} value={employee.email} />
          {deptName && <Fact icon={Building2} value={deptName} />}
          <Fact icon={CalendarDays} value={`Joined ${formatDate(employee.hireDate)}`} />
        </div>
      </div>
    </Card>
  )
}

function Fact({
  icon: Icon,
  value,
}: {
  icon: ComponentType<{ className?: string }>
  value: string
}) {
  return (
    <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
      <Icon className="size-4 shrink-0" />
      <span className="truncate">{value}</span>
    </span>
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

// --- allowances -----------------------------------------------------------

function AllowancesCard({ employeeId }: { employeeId: string }) {
  const { data, isLoading, isError, error } = useEmployeeAllowances(employeeId)
  const [open, setOpen] = useState(false)

  const allowances = data ?? []
  const total = allowances.reduce((sum, a) => sum + (Number(a.amount) || 0), 0)

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>Allowances</CardTitle>
        <Button size="sm" variant="outline" onClick={() => setOpen((v) => !v)}>
          <Plus />
          Add allowance
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {open && (
          <AddAllowanceForm
            employeeId={employeeId}
            onDone={() => setOpen(false)}
          />
        )}
        {isLoading && <LoadingState />}
        {isError && <ErrorState error={error} />}
        {data &&
          (allowances.length === 0 ? (
            <EmptyState>No recurring allowances.</EmptyState>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead className="text-right">Monthly amount</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allowances.map((a) => (
                  <AllowanceRow
                    key={a.id}
                    employeeId={employeeId}
                    allowance={a}
                  />
                ))}
                <TableRow>
                  <TableCell className="font-medium">
                    Total allowances
                  </TableCell>
                  <TableCell className="text-right font-medium tabular-nums">
                    {formatNumber(total)}
                  </TableCell>
                  <TableCell />
                </TableRow>
              </TableBody>
            </Table>
          ))}
      </CardContent>
    </Card>
  )
}

function AllowanceRow({
  employeeId,
  allowance,
}: {
  employeeId: string
  allowance: EmployeeAllowance
}) {
  const updateMut = useUpdateEmployeeAllowance(employeeId)
  const deleteMut = useDeleteEmployeeAllowance(employeeId)
  const confirm = useConfirm()
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(allowance.name)
  const [amount, setAmount] = useState(String(allowance.amount))
  const [error, setError] = useState<string | null>(null)

  function reset() {
    setName(allowance.name)
    setAmount(String(allowance.amount))
    setError(null)
  }

  async function save() {
    setError(null)
    const amt = Number(amount)
    if (!name.trim() || Number.isNaN(amt) || amt < 0) {
      setError("Enter a name and a valid amount.")
      return
    }
    try {
      await updateMut.mutateAsync({
        allowanceId: allowance.id,
        input: { name: name.trim(), amount: amt },
      })
      setEditing(false)
    } catch (err) {
      setError(getApiErrorMessage(err))
    }
  }

  async function remove() {
    const ok = await confirm({
      title: "Remove allowance",
      description: `“${allowance.name}” will be removed from this employee.`,
      confirmLabel: "Remove allowance",
    })
    if (!ok) return
    try {
      await deleteMut.mutateAsync(allowance.id)
    } catch (err) {
      toast.error(getApiErrorMessage(err))
    }
  }

  if (editing) {
    return (
      <TableRow>
        <TableCell>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </TableCell>
        <TableCell>
          <Input
            type="number"
            min="0"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="text-right"
          />
        </TableCell>
        <TableCell>
          <div className="flex justify-end gap-1">
            <Button size="sm" onClick={save} disabled={updateMut.isPending}>
              {updateMut.isPending ? "Saving…" : "Save"}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                reset()
                setEditing(false)
              }}
              disabled={updateMut.isPending}
            >
              Cancel
            </Button>
          </div>
          {error && (
            <p className="mt-1 text-right text-xs text-destructive">{error}</p>
          )}
        </TableCell>
      </TableRow>
    )
  }

  return (
    <TableRow>
      <TableCell className="font-medium">{allowance.name}</TableCell>
      <TableCell className="text-right tabular-nums">
        {formatNumber(allowance.amount)}
      </TableCell>
      <TableCell>
        <div className="flex justify-end gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => {
              reset()
              setEditing(true)
            }}
            aria-label="Edit allowance"
          >
            <Pencil />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={remove}
            disabled={deleteMut.isPending}
            aria-label="Delete allowance"
            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
          >
            <Trash2 />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  )
}

function AddAllowanceForm({
  employeeId,
  onDone,
}: {
  employeeId: string
  onDone: () => void
}) {
  const mut = useCreateEmployeeAllowance(employeeId)
  const [name, setName] = useState("")
  const [amount, setAmount] = useState("")
  const [error, setError] = useState<string | null>(null)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    const amt = Number(amount)
    if (!name.trim() || Number.isNaN(amt) || amt < 0) {
      setError("Enter a name and a valid amount.")
      return
    }
    try {
      await mut.mutateAsync({ name: name.trim(), amount: amt })
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
      <Field label="Name" required>
        <Input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Housing"
        />
      </Field>
      <Field label="Monthly amount" required>
        <Input
          required
          type="number"
          min="0"
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="200000"
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
          {mut.isPending ? "Adding…" : "Add allowance"}
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
  const confirm = useConfirm()
  const [error, setError] = useState<string | null>(null)
  const deletable = canDeleteEmployee(employee)

  async function remove() {
    const ok = await confirm({
      title: "Delete employee",
      description: `${employee.firstName} ${employee.lastName} will be permanently deleted. This cannot be undone.`,
      confirmLabel: "Delete employee",
    })
    if (!ok) return
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
          An employee must be <strong>Inactive</strong> or{" "}
          <strong>Terminated</strong> before they can be deleted. Change their
          status above first.
        </p>
        <Button
          variant="destructive"
          size="sm"
          onClick={remove}
          disabled={!deletable || deleteMut.isPending}
          title={
            deletable
              ? undefined
              : "Set the employee to Inactive or Terminated first"
          }
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
