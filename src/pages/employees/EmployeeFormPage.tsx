import { useState, type FormEvent } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { ArrowLeft, ArrowRight, Check, Plus, Trash2 } from "lucide-react"

import { Field } from "@/components/form/Field"
import { PageHeader } from "@/components/PageHeader"
import { EmptyState, ErrorState } from "@/components/states"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { SearchableSelect } from "@/components/ui/searchable-select"
import { Select } from "@/components/ui/select"
import { LoadingState } from "@/components/ui/spinner"
import {
  EMPLOYEE_STATUS_VALUES,
  EMPLOYMENT_TYPE_VALUES,
  GENDER_VALUES,
  IDENTIFICATION_TYPE_VALUES,
  createEmployeeAllowance,
  type CreateEmployeeInput,
  type Employee,
  type EmployeeStatus,
  type EmploymentType,
  type Gender,
  type IdentificationType,
} from "@/apis/employees"
import { createLeaveBalancesBulk } from "@/apis/leave-balances"
import {
  useCreateEmployee,
  useEmployee,
  useEmployeeOptions,
  useUpdateEmployee,
} from "@/hooks/useEmployees"
import { useAllDepartments } from "@/hooks/useDepartments"
import { useAllEndClients } from "@/hooks/useEndClients"
import { useAllLeaveTypes } from "@/hooks/useLeaveTypes"
import { usePositions } from "@/hooks/usePositions"
import { useCountries } from "@/hooks/useCountries"
import { getApiErrorMessage } from "@/lib/api"
import { humanizeEnum } from "@/lib/format"
import { cn } from "@/lib/utils"
import { toast } from "@/stores/toastStore"

type FormValues = Record<
  | "employeeCode"
  | "firstName"
  | "lastName"
  | "email"
  | "personalEmail"
  | "phone"
  | "gender"
  | "dateOfBirth"
  | "nationality"
  | "identificationType"
  | "identificationNumber"
  | "visaEndDate"
  | "address"
  | "bankName"
  | "bankAccountNumber"
  | "hireDate"
  | "salary"
  | "status"
  | "employmentType"
  | "departmentId"
  | "positionId"
  | "countryId"
  | "endClientId"
  | "managerId",
  string
>

function emptyValues(): FormValues {
  return {
    employeeCode: "",
    firstName: "",
    lastName: "",
    email: "",
    personalEmail: "",
    phone: "",
    gender: "",
    dateOfBirth: "",
    nationality: "",
    identificationType: "",
    identificationNumber: "",
    visaEndDate: "",
    address: "",
    bankName: "",
    bankAccountNumber: "",
    hireDate: "",
    salary: "",
    status: "",
    employmentType: "",
    departmentId: "",
    positionId: "",
    countryId: "",
    endClientId: "",
    managerId: "",
  }
}

/**
 * `<input type="date">` only shows a value in strict YYYY-MM-DD form, so take
 * the date prefix (the API may return a full ISO timestamp).
 */
function toDateInput(value: string | null | undefined): string {
  return value ? value.slice(0, 10) : "";
}

function valuesFromEmployee(e: Employee): FormValues {
  return {
    employeeCode: e.employeeCode,
    firstName: e.firstName,
    lastName: e.lastName,
    email: e.email,
    personalEmail: e.personalEmail ?? "",
    phone: e.phone ?? "",
    gender: e.gender ?? "",
    dateOfBirth: toDateInput(e.dateOfBirth),
    nationality: e.nationality ?? "",
    identificationType: e.identificationType ?? "",
    identificationNumber: e.identificationNumber ?? "",
    visaEndDate: toDateInput(e.visaEndDate),
    address: e.address ?? "",
    bankName: e.bankName ?? "",
    bankAccountNumber: e.bankAccountNumber ?? "",
    hireDate: toDateInput(e.hireDate),
    salary: e.salary != null ? String(e.salary) : "",
    status: e.status,
    employmentType: e.employmentType,
    departmentId: e.departmentId ?? "",
    positionId: e.positionId ?? "",
    countryId: e.countryId ?? "",
    endClientId: e.endClientId ?? "",
    managerId: e.managerId ?? "",
  }
}

/** Drop empty strings so we only send fields the user actually filled in. */
function buildPayload(v: FormValues): CreateEmployeeInput {
  const opt = (s: string) => (s.trim() === "" ? undefined : s.trim())
  return {
    employeeCode: v.employeeCode.trim(),
    firstName: v.firstName.trim(),
    lastName: v.lastName.trim(),
    email: v.email.trim(),
    personalEmail: opt(v.personalEmail),
    salary: Number(v.salary),
    phone: opt(v.phone),
    gender: opt(v.gender) as Gender | undefined,
    dateOfBirth: opt(v.dateOfBirth),
    nationality: opt(v.nationality),
    identificationType: opt(v.identificationType) as
      | IdentificationType
      | undefined,
    identificationNumber: opt(v.identificationNumber),
    visaEndDate: opt(v.visaEndDate),
    address: opt(v.address),
    bankName: opt(v.bankName),
    bankAccountNumber: opt(v.bankAccountNumber),
    hireDate: opt(v.hireDate),
    status: opt(v.status) as EmployeeStatus | undefined,
    employmentType: opt(v.employmentType) as EmploymentType | undefined,
    departmentId: opt(v.departmentId),
    positionId: opt(v.positionId),
    countryId: opt(v.countryId),
    endClientId: opt(v.endClientId),
    managerId: opt(v.managerId),
  }
}

/** Outer loader: resolves the existing employee (edit) before mounting the form. */
export function EmployeeFormPage() {
  const { id } = useParams<{ id: string }>()
  const isEdit = Boolean(id)
  const existing = useEmployee(isEdit ? id : undefined)

  if (isEdit) {
    if (existing.isLoading) return <LoadingState />
    if (existing.isError || !existing.data)
      return (
        <ErrorState error={existing.error} notFoundLabel="Employee not found." />
      )
    return (
      <EmployeeForm
        id={id}
        initial={valuesFromEmployee(existing.data)}
      />
    )
  }

  return <OnboardingWizard />
}

function EmployeeForm({
  id,
  initial,
}: {
  id?: string
  initial: FormValues
}) {
  const isEdit = Boolean(id)
  const navigate = useNavigate()

  const departments = useAllDepartments()
  const endClients = useAllEndClients()
  const positions = usePositions()
  const countries = useCountries()
  const managers = useEmployeeOptions()

  const createMut = useCreateEmployee()
  const updateMut = useUpdateEmployee(id ?? "")

  const [values, setValues] = useState<FormValues>(initial)
  const [error, setError] = useState<string | null>(null)

  const set = (key: keyof FormValues) => (value: string) =>
    setValues((v) => ({ ...v, [key]: value }))

  async function handleSubmit(ev: FormEvent) {
    ev.preventDefault()
    setError(null)
    const payload = buildPayload(values)
    try {
      if (isEdit) {
        await updateMut.mutateAsync(payload)
        navigate(`/employees/${id}`)
      } else {
        const created = await createMut.mutateAsync(payload)
        navigate(`/employees/${created.id}`)
      }
    } catch (err) {
      setError(getApiErrorMessage(err))
    }
  }

  const submitting = createMut.isPending || updateMut.isPending
  // GET /employees/options is already scoped to the caller's org; just drop the
  // employee being edited (they can't be their own manager → 400).
  const managerOptions = (managers.data ?? []).filter((m) => m.id !== id)

  return (
    <div>
      <PageHeader
        title={isEdit ? "Edit employee" : "New employee"}
        actions={
          <Button variant="outline" onClick={() => navigate(-1)}>
            <ArrowLeft />
            Back
          </Button>
        }
      />

      <Card>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6" noValidate>
            <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Employee code" htmlFor="employeeCode" required>
                <Input
                  id="employeeCode"
                  required
                  value={values.employeeCode}
                  onChange={(e) => set("employeeCode")(e.target.value)}
                  placeholder="EMP-0001"
                />
              </Field>
              <Field label="Email" htmlFor="email" required>
                <Input
                  id="email"
                  type="email"
                  required
                  value={values.email}
                  onChange={(e) => set("email")(e.target.value)}
                />
              </Field>
              <Field label="Personal email" htmlFor="personalEmail">
                <Input
                  id="personalEmail"
                  type="email"
                  value={values.personalEmail}
                  onChange={(e) => set("personalEmail")(e.target.value)}
                />
              </Field>
              <Field label="First name" htmlFor="firstName" required>
                <Input
                  id="firstName"
                  required
                  value={values.firstName}
                  onChange={(e) => set("firstName")(e.target.value)}
                />
              </Field>
              <Field label="Last name" htmlFor="lastName" required>
                <Input
                  id="lastName"
                  required
                  value={values.lastName}
                  onChange={(e) => set("lastName")(e.target.value)}
                />
              </Field>
              <Field
                label="Salary"
                htmlFor="salary"
                required
                hint="Monthly, positive number."
              >
                <Input
                  id="salary"
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  value={values.salary}
                  onChange={(e) => set("salary")(e.target.value)}
                />
              </Field>
              <Field label="Phone" htmlFor="phone">
                <Input
                  id="phone"
                  value={values.phone}
                  onChange={(e) => set("phone")(e.target.value)}
                />
              </Field>
              <Field label="Gender" htmlFor="gender">
                <Select
                  id="gender"
                  value={values.gender}
                  onChange={(e) => set("gender")(e.target.value)}
                >
                  <option value="">—</option>
                  {GENDER_VALUES.map((g) => (
                    <option key={g} value={g}>
                      {humanizeEnum(g)}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Date of birth" htmlFor="dateOfBirth">
                <Input
                  id="dateOfBirth"
                  type="date"
                  value={values.dateOfBirth}
                  onChange={(e) => set("dateOfBirth")(e.target.value)}
                />
              </Field>
              <Field label="Nationality" htmlFor="nationality">
                <Input
                  id="nationality"
                  value={values.nationality}
                  onChange={(e) => set("nationality")(e.target.value)}
                />
              </Field>
              <Field label="Country of origin" htmlFor="countryId">
                <SearchableSelect
                  inputId="countryId"
                  placeholder="Search country…"
                  isLoading={countries.isLoading}
                  value={values.countryId}
                  onChange={set("countryId")}
                  options={(countries.data ?? []).map((c) => ({
                    value: c.id,
                    label: c.name,
                  }))}
                />
              </Field>
              <Field label="ID type" htmlFor="identificationType">
                <Select
                  id="identificationType"
                  value={values.identificationType}
                  onChange={(e) => set("identificationType")(e.target.value)}
                >
                  <option value="">—</option>
                  {IDENTIFICATION_TYPE_VALUES.map((t) => (
                    <option key={t} value={t}>
                      {humanizeEnum(t)}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Number" htmlFor="identificationNumber">
                <Input
                  id="identificationNumber"
                  value={values.identificationNumber}
                  onChange={(e) => set("identificationNumber")(e.target.value)}
                />
              </Field>
              <Field
                label="Visa end date"
                htmlFor="visaEndDate"
                hint="Work visa expiry, for compliance tracking."
              >
                <Input
                  id="visaEndDate"
                  type="date"
                  value={values.visaEndDate}
                  onChange={(e) => set("visaEndDate")(e.target.value)}
                />
              </Field>
              <Field label="Address" htmlFor="address">
                <Input
                  id="address"
                  value={values.address}
                  onChange={(e) => set("address")(e.target.value)}
                />
              </Field>
              <Field label="Bank name" htmlFor="bankName">
                <Input
                  id="bankName"
                  value={values.bankName}
                  onChange={(e) => set("bankName")(e.target.value)}
                />
              </Field>
              <Field label="Bank account number" htmlFor="bankAccountNumber">
                <Input
                  id="bankAccountNumber"
                  value={values.bankAccountNumber}
                  onChange={(e) => set("bankAccountNumber")(e.target.value)}
                />
              </Field>
              <Field label="Hire date" htmlFor="hireDate" hint="Defaults to today.">
                <Input
                  id="hireDate"
                  type="date"
                  value={values.hireDate}
                  onChange={(e) => set("hireDate")(e.target.value)}
                />
              </Field>
              <Field label="Status" htmlFor="status">
                <Select
                  id="status"
                  value={values.status}
                  onChange={(e) => set("status")(e.target.value)}
                >
                  <option value="">Active (default)</option>
                  {EMPLOYEE_STATUS_VALUES.map((s) => (
                    <option key={s} value={s}>
                      {humanizeEnum(s)}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Employment type" htmlFor="employmentType">
                <Select
                  id="employmentType"
                  value={values.employmentType}
                  onChange={(e) => set("employmentType")(e.target.value)}
                >
                  <option value="">Full time (default)</option>
                  {EMPLOYMENT_TYPE_VALUES.map((t) => (
                    <option key={t} value={t}>
                      {humanizeEnum(t)}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Department" htmlFor="departmentId">
                <Select
                  id="departmentId"
                  value={values.departmentId}
                  onChange={(e) => set("departmentId")(e.target.value)}
                >
                  <option value="">—</option>
                  {(departments.data ?? []).map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="End client" htmlFor="endClientId">
                <SearchableSelect
                  inputId="endClientId"
                  placeholder="Search end client…"
                  isLoading={endClients.isLoading}
                  value={values.endClientId}
                  onChange={set("endClientId")}
                  options={(endClients.data ?? []).map((c) => ({
                    value: c.id,
                    label: c.name,
                  }))}
                />
              </Field>
              <Field label="Position" htmlFor="positionId">
                <SearchableSelect
                  inputId="positionId"
                  placeholder="Search position…"
                  isLoading={positions.isLoading}
                  value={values.positionId}
                  onChange={set("positionId")}
                  options={(positions.data ?? []).map((p) => ({
                    value: p.id,
                    label: p.title,
                  }))}
                />
              </Field>
              <Field
                label="Manager"
                htmlFor="managerId"
                hint="Reports to another employee in the same org."
              >
                <SearchableSelect
                  inputId="managerId"
                  placeholder="Search manager…"
                  isLoading={managers.isLoading}
                  value={values.managerId}
                  onChange={set("managerId")}
                  options={managerOptions.map((m) => ({
                    value: m.id,
                    label: m.name,
                  }))}
                />
              </Field>
            </section>

            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(-1)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting
                  ? "Saving…"
                  : isEdit
                    ? "Save changes"
                    : "Create employee"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

// --- onboarding wizard (create) -------------------------------------------

const WIZARD_STEPS = [
  { title: "Personal", hint: "Who they are" },
  { title: "Leave", hint: "Time-off balances" },
  { title: "Role & pay", hint: "Department, salary, allowances" },
] as const

interface AllowanceDraft {
  name: string
  amount: string
}

interface LeaveRow {
  leaveTypeId: string
  days: string
}

/**
 * Three-step onboarding flow for creating an employee. Steps: personal info →
 * leave balances → role/compensation/allowances. Leave balances and allowances
 * are sub-resources, so they're collected here and POSTed after the employee is
 * created.
 */
function OnboardingWizard() {
  const navigate = useNavigate()
  const departments = useAllDepartments()
  const endClients = useAllEndClients()
  const positions = usePositions()
  const countries = useCountries()
  const managers = useEmployeeOptions()
  const leaveTypes = useAllLeaveTypes()
  const createMut = useCreateEmployee()

  const currentYear = new Date().getFullYear()
  const [step, setStep] = useState(0)
  const [values, setValues] = useState<FormValues>(emptyValues())
  const [allowances, setAllowances] = useState<AllowanceDraft[]>([])
  const [leaveYear, setLeaveYear] = useState(currentYear)
  // null until seeded from the org's leave types (each with its default days).
  const [leaveRows, setLeaveRows] = useState<LeaveRow[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const set = (key: keyof FormValues) => (value: string) =>
    setValues((v) => ({ ...v, [key]: value }))

  // Seed one row per configured leave type once the list arrives (render-phase
  // init — the React-recommended alternative to a setState effect).
  if (leaveRows === null && leaveTypes.data) {
    setLeaveRows(
      leaveTypes.data.map((lt) => ({
        leaveTypeId: lt.id,
        days: String(lt.daysPerYear ?? ""),
      })),
    )
  }
  const rows = leaveRows ?? []

  function validateStep(s: number): string | null {
    if (s === 0) {
      if (
        !values.firstName.trim() ||
        !values.lastName.trim() ||
        !values.employeeCode.trim() ||
        !values.email.trim()
      )
        return "Enter first name, last name, employee code and email."
    }
    if (s === 2) {
      const salary = Number(values.salary)
      if (values.salary.trim() === "" || Number.isNaN(salary) || salary < 0)
        return "Enter a valid salary."
    }
    return null
  }

  function next() {
    const err = validateStep(step)
    if (err) {
      setError(err)
      return
    }
    setError(null)
    setStep((s) => Math.min(s + 1, WIZARD_STEPS.length - 1))
  }

  function goBack() {
    setError(null)
    if (step === 0) navigate(-1)
    else setStep((s) => s - 1)
  }

  async function submit() {
    const err = validateStep(2)
    if (err) {
      setError(err)
      return
    }
    setError(null)
    setSubmitting(true)
    try {
      const created = await createMut.mutateAsync(buildPayload(values))
      const notes: string[] = []

      // Allowances — one call per row (sub-resource, no bulk endpoint).
      const allowanceTasks = allowances
        .map((a) => ({ name: a.name.trim(), amount: Number(a.amount) }))
        .filter((a) => a.name && !Number.isNaN(a.amount) && a.amount >= 0)
        .map((a) => createEmployeeAllowance(created.id, a))
      const allowanceResults = await Promise.allSettled(allowanceTasks)
      const allowanceFailed = allowanceResults.filter(
        (r) => r.status === "rejected",
      ).length
      if (allowanceFailed > 0) notes.push(`${allowanceFailed} allowance(s) failed`)

      // Leave balances — the whole batch in one bulk call.
      const balanceItems = rows
        .map((r) => ({ leaveTypeId: r.leaveTypeId, totalDays: Number(r.days) }))
        .filter(
          (b) =>
            b.leaveTypeId &&
            !Number.isNaN(b.totalDays) &&
            b.totalDays >= 0,
        )
      if (balanceItems.length > 0) {
        try {
          const res = await createLeaveBalancesBulk({
            employeeId: created.id,
            year: leaveYear,
            balances: balanceItems,
          })
          if (res.skipped > 0)
            notes.push(`${res.skipped} leave balance(s) already existed`)
        } catch {
          notes.push("leave balances couldn't be saved")
        }
      }

      if (notes.length > 0)
        toast.error(
          `Employee onboarded, but: ${notes.join("; ")}. Adjust from the profile.`,
        )

      navigate(`/employees/${created.id}`)
    } catch (err) {
      setError(getApiErrorMessage(err))
      setSubmitting(false)
    }
  }

  const isLast = step === WIZARD_STEPS.length - 1

  return (
    <div>
      <PageHeader
        title="Onboard new employee"
        description="A few steps to get them set up."
        actions={
          <Button variant="outline" onClick={() => navigate(-1)}>
            <ArrowLeft />
            Back
          </Button>
        }
      />

      <Card>
        <CardContent className="space-y-6">
          <Stepper step={step} onStepClick={(i) => i < step && setStep(i)} />

          {step === 0 && <PersonalStep values={values} set={set} countries={countries} />}

          {step === 1 && (
            <LeaveStep
              leaveTypes={leaveTypes}
              year={leaveYear}
              onYearChange={setLeaveYear}
              rows={rows}
              setRows={setLeaveRows}
            />
          )}

          {step === 2 && (
            <RolePayStep
              values={values}
              set={set}
              departments={departments}
              positions={positions}
              managers={managers}
              endClients={endClients}
              allowances={allowances}
              setAllowances={setAllowances}
            />
          )}

          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}

          <div className="flex justify-between border-t border-border pt-4">
            <Button variant="outline" type="button" onClick={goBack}>
              {step === 0 ? (
                "Cancel"
              ) : (
                <>
                  <ArrowLeft />
                  Back
                </>
              )}
            </Button>
            {isLast ? (
              <Button type="button" onClick={submit} disabled={submitting}>
                {submitting ? "Onboarding…" : "Complete onboarding"}
              </Button>
            ) : (
              <Button type="button" onClick={next}>
                Next
                <ArrowRight />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function Stepper({
  step,
  onStepClick,
}: {
  step: number
  onStepClick: (index: number) => void
}) {
  return (
    <ol className="flex items-center gap-2">
      {WIZARD_STEPS.map((s, i) => {
        const done = i < step
        const active = i === step
        return (
          <li key={s.title} className="flex flex-1 items-center gap-2">
            <button
              type="button"
              onClick={() => onStepClick(i)}
              disabled={i >= step}
              className={cn(
                "flex items-center gap-2.5 rounded-lg px-1 py-1 text-left outline-none",
                done && "cursor-pointer",
              )}
            >
              <span
                className={cn(
                  "flex size-8 shrink-0 items-center justify-center rounded-full border text-sm font-semibold transition-colors",
                  active && "border-primary bg-primary text-primary-foreground",
                  done && "border-primary bg-primary/10 text-primary",
                  !active && !done && "border-border text-muted-foreground",
                )}
              >
                {done ? <Check className="size-4" /> : i + 1}
              </span>
              <span className="hidden sm:block">
                <span
                  className={cn(
                    "block text-sm font-medium",
                    active || done ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  {s.title}
                </span>
                <span className="block text-xs text-muted-foreground">
                  {s.hint}
                </span>
              </span>
            </button>
            {i < WIZARD_STEPS.length - 1 && (
              <span
                className={cn(
                  "h-px flex-1",
                  i < step ? "bg-primary/40" : "bg-border",
                )}
              />
            )}
          </li>
        )
      })}
    </ol>
  )
}

type SetFn = (key: keyof FormValues) => (value: string) => void

function PersonalStep({
  values,
  set,
  countries,
}: {
  values: FormValues
  set: SetFn
  countries: ReturnType<typeof useCountries>
}) {
  return (
    <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <Field label="First name" htmlFor="firstName" required>
        <Input
          id="firstName"
          value={values.firstName}
          onChange={(e) => set("firstName")(e.target.value)}
        />
      </Field>
      <Field label="Last name" htmlFor="lastName" required>
        <Input
          id="lastName"
          value={values.lastName}
          onChange={(e) => set("lastName")(e.target.value)}
        />
      </Field>
      <Field label="Employee code" htmlFor="employeeCode" required>
        <Input
          id="employeeCode"
          value={values.employeeCode}
          onChange={(e) => set("employeeCode")(e.target.value)}
          placeholder="EMP-0001"
        />
      </Field>
      <Field label="Email" htmlFor="email" required>
        <Input
          id="email"
          type="email"
          value={values.email}
          onChange={(e) => set("email")(e.target.value)}
        />
      </Field>
      <Field label="Personal email" htmlFor="personalEmail">
        <Input
          id="personalEmail"
          type="email"
          value={values.personalEmail}
          onChange={(e) => set("personalEmail")(e.target.value)}
        />
      </Field>
      <Field label="Phone" htmlFor="phone">
        <Input
          id="phone"
          value={values.phone}
          onChange={(e) => set("phone")(e.target.value)}
        />
      </Field>
      <Field label="Gender" htmlFor="gender">
        <Select
          id="gender"
          value={values.gender}
          onChange={(e) => set("gender")(e.target.value)}
        >
          <option value="">—</option>
          {GENDER_VALUES.map((g) => (
            <option key={g} value={g}>
              {humanizeEnum(g)}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Date of birth" htmlFor="dateOfBirth">
        <Input
          id="dateOfBirth"
          type="date"
          value={values.dateOfBirth}
          onChange={(e) => set("dateOfBirth")(e.target.value)}
        />
      </Field>
      <Field label="Nationality" htmlFor="nationality">
        <Input
          id="nationality"
          value={values.nationality}
          onChange={(e) => set("nationality")(e.target.value)}
        />
      </Field>
      <Field label="Country of origin" htmlFor="countryId">
        <SearchableSelect
          inputId="countryId"
          placeholder="Search country…"
          isLoading={countries.isLoading}
          value={values.countryId}
          onChange={set("countryId")}
          options={(countries.data ?? []).map((c) => ({
            value: c.id,
            label: c.name,
          }))}
        />
      </Field>
      <Field label="ID type" htmlFor="identificationType">
        <Select
          id="identificationType"
          value={values.identificationType}
          onChange={(e) => set("identificationType")(e.target.value)}
        >
          <option value="">—</option>
          {IDENTIFICATION_TYPE_VALUES.map((t) => (
            <option key={t} value={t}>
              {humanizeEnum(t)}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="ID number" htmlFor="identificationNumber">
        <Input
          id="identificationNumber"
          value={values.identificationNumber}
          onChange={(e) => set("identificationNumber")(e.target.value)}
        />
      </Field>
      <Field
        label="Visa end date"
        htmlFor="visaEndDate"
        hint="Work visa expiry, for compliance tracking."
      >
        <Input
          id="visaEndDate"
          type="date"
          value={values.visaEndDate}
          onChange={(e) => set("visaEndDate")(e.target.value)}
        />
      </Field>
      <Field label="Address" htmlFor="address">
        <Input
          id="address"
          value={values.address}
          onChange={(e) => set("address")(e.target.value)}
        />
      </Field>
    </section>
  )
}

function LeaveStep({
  leaveTypes,
  year,
  onYearChange,
  rows,
  setRows,
}: {
  leaveTypes: ReturnType<typeof useAllLeaveTypes>
  year: number
  onYearChange: (year: number) => void
  rows: LeaveRow[]
  setRows: React.Dispatch<React.SetStateAction<LeaveRow[] | null>>
}) {
  const types = leaveTypes.data ?? []
  const now = new Date().getFullYear()
  const years = [now - 1, now, now + 1]

  // Leave types already chosen — used to prevent picking the same one twice.
  const usedIds = new Set(rows.map((r) => r.leaveTypeId).filter(Boolean))
  const allUsed = types.length > 0 && rows.length >= types.length

  const update = (index: number, key: keyof LeaveRow, value: string) =>
    setRows((rs) =>
      (rs ?? []).map((r, i) => (i === index ? { ...r, [key]: value } : r)),
    )
  const addRow = () => setRows((rs) => [...(rs ?? []), { leaveTypeId: "", days: "" }])
  const removeRow = (index: number) =>
    setRows((rs) => (rs ?? []).filter((_, i) => i !== index))

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Grant the new hire's leave balances. Prefilled from each type's default
        — remove a row to skip it, or add more.
      </p>

      <Field label="Year" htmlFor="leaveYear">
        <div className="w-32">
          <Select
            id="leaveYear"
            value={String(year)}
            onChange={(e) => onYearChange(Number(e.target.value))}
          >
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </Select>
        </div>
      </Field>

      {leaveTypes.isLoading && <LoadingState />}
      {leaveTypes.isError && <ErrorState error={leaveTypes.error} />}
      {leaveTypes.data &&
        (types.length === 0 ? (
          <EmptyState>
            No leave types are configured for your organization yet.
          </EmptyState>
        ) : (
          <div className="space-y-2">
            {rows.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No balances yet — use “Add another” to grant leave.
              </p>
            )}
            {rows.map((row, i) => {
              // Offer types not taken by another row (plus this row's own).
              const options = types.filter(
                (t) => t.id === row.leaveTypeId || !usedIds.has(t.id),
              )
              return (
                <div key={i} className="flex items-start gap-2">
                  <div className="flex-1">
                    <Select
                      aria-label="Leave type"
                      value={row.leaveTypeId}
                      onChange={(e) => update(i, "leaveTypeId", e.target.value)}
                    >
                      <option value="" disabled>
                        Select leave type…
                      </option>
                      {options.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <Input
                    type="number"
                    min="0"
                    step="1"
                    placeholder="Days"
                    aria-label="Days"
                    value={row.days}
                    onChange={(e) => update(i, "days", e.target.value)}
                    className="w-28"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="Remove leave balance"
                    onClick={() => removeRow(i)}
                    className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 />
                  </Button>
                </div>
              )
            })}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addRow}
              disabled={allUsed}
            >
              <Plus />
              Add another
            </Button>
          </div>
        ))}
    </div>
  )
}

function RolePayStep({
  values,
  set,
  departments,
  positions,
  managers,
  endClients,
  allowances,
  setAllowances,
}: {
  values: FormValues
  set: SetFn
  departments: ReturnType<typeof useAllDepartments>
  positions: ReturnType<typeof usePositions>
  managers: ReturnType<typeof useEmployeeOptions>
  endClients: ReturnType<typeof useAllEndClients>
  allowances: AllowanceDraft[]
  setAllowances: React.Dispatch<React.SetStateAction<AllowanceDraft[]>>
}) {
  function updateAllowance(index: number, key: keyof AllowanceDraft, value: string) {
    setAllowances((rows) =>
      rows.map((r, i) => (i === index ? { ...r, [key]: value } : r)),
    )
  }

  return (
    <div className="space-y-6">
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Department" htmlFor="departmentId">
          <Select
            id="departmentId"
            value={values.departmentId}
            onChange={(e) => set("departmentId")(e.target.value)}
          >
            <option value="">—</option>
            {(departments.data ?? []).map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Position" htmlFor="positionId">
          <SearchableSelect
            inputId="positionId"
            placeholder="Search position…"
            isLoading={positions.isLoading}
            value={values.positionId}
            onChange={set("positionId")}
            options={(positions.data ?? []).map((p) => ({
              value: p.id,
              label: p.title,
            }))}
          />
        </Field>
        <Field label="Manager" htmlFor="managerId">
          <SearchableSelect
            inputId="managerId"
            placeholder="Search manager…"
            isLoading={managers.isLoading}
            value={values.managerId}
            onChange={set("managerId")}
            options={(managers.data ?? []).map((m) => ({
              value: m.id,
              label: m.name,
            }))}
          />
        </Field>
        <Field label="End client" htmlFor="endClientId">
          <SearchableSelect
            inputId="endClientId"
            placeholder="Search end client…"
            isLoading={endClients.isLoading}
            value={values.endClientId}
            onChange={set("endClientId")}
            options={(endClients.data ?? []).map((c) => ({
              value: c.id,
              label: c.name,
            }))}
          />
        </Field>
        <Field label="Employment type" htmlFor="employmentType">
          <Select
            id="employmentType"
            value={values.employmentType}
            onChange={(e) => set("employmentType")(e.target.value)}
          >
            <option value="">Full time (default)</option>
            {EMPLOYMENT_TYPE_VALUES.map((t) => (
              <option key={t} value={t}>
                {humanizeEnum(t)}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Status" htmlFor="status">
          <Select
            id="status"
            value={values.status}
            onChange={(e) => set("status")(e.target.value)}
          >
            <option value="">Active (default)</option>
            {EMPLOYEE_STATUS_VALUES.map((s) => (
              <option key={s} value={s}>
                {humanizeEnum(s)}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Hire date" htmlFor="hireDate" hint="Defaults to today.">
          <Input
            id="hireDate"
            type="date"
            value={values.hireDate}
            onChange={(e) => set("hireDate")(e.target.value)}
          />
        </Field>
        <Field
          label="Salary"
          htmlFor="salary"
          required
          hint="Monthly, positive number."
        >
          <Input
            id="salary"
            type="number"
            min="0"
            step="0.01"
            value={values.salary}
            onChange={(e) => set("salary")(e.target.value)}
          />
        </Field>
        <Field label="Bank name" htmlFor="bankName">
          <Input
            id="bankName"
            value={values.bankName}
            onChange={(e) => set("bankName")(e.target.value)}
          />
        </Field>
        <Field label="Bank account number" htmlFor="bankAccountNumber">
          <Input
            id="bankAccountNumber"
            value={values.bankAccountNumber}
            onChange={(e) => set("bankAccountNumber")(e.target.value)}
          />
        </Field>
      </section>

      <div className="space-y-2">
        <p className="text-sm font-medium">Recurring allowances</p>
        {allowances.map((a, i) => (
          <div key={i} className="flex items-start gap-2">
            <Input
              placeholder="Housing"
              value={a.name}
              onChange={(e) => updateAllowance(i, "name", e.target.value)}
            />
            <Input
              type="number"
              min="0"
              step="0.01"
              placeholder="Amount"
              value={a.amount}
              onChange={(e) => updateAllowance(i, "amount", e.target.value)}
              className="w-40"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Remove allowance"
              onClick={() =>
                setAllowances((rows) => rows.filter((_, idx) => idx !== i))
              }
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 />
            </Button>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            setAllowances((rows) => [...rows, { name: "", amount: "" }])
          }
        >
          <Plus />
          Add allowance
        </Button>
      </div>
    </div>
  )
}
