import { useState, type FormEvent } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { ArrowLeft } from "lucide-react"

import { Field } from "@/components/form/Field"
import { PageHeader } from "@/components/PageHeader"
import { ErrorState } from "@/components/states"
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
  type CreateEmployeeInput,
  type Employee,
  type EmployeeStatus,
  type EmploymentType,
  type Gender,
  type IdentificationType,
} from "@/apis/employees"
import {
  useCreateEmployee,
  useEmployee,
  useEmployeeOptions,
  useUpdateEmployee,
} from "@/hooks/useEmployees"
import { useAllDepartments } from "@/hooks/useDepartments"
import { usePositions } from "@/hooks/usePositions"
import { useCountries } from "@/hooks/useCountries"
import { getApiErrorMessage } from "@/lib/api"
import { humanizeEnum } from "@/lib/format"
import { useAuthStore } from "@/stores/authStore"

type FormValues = Record<
  // organizationId is carried but never edited here — it's fixed to the
  // caller's org (create) or the existing employee's org (edit).
  | "organizationId"
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
  | "managerId",
  string
>

function emptyValues(organizationId: string): FormValues {
  return {
    organizationId,
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
    managerId: "",
  }
}

function valuesFromEmployee(e: Employee): FormValues {
  return {
    organizationId: e.organizationId,
    employeeCode: e.employeeCode,
    firstName: e.firstName,
    lastName: e.lastName,
    email: e.email,
    personalEmail: e.personalEmail ?? "",
    phone: e.phone ?? "",
    gender: e.gender ?? "",
    dateOfBirth: e.dateOfBirth ?? "",
    nationality: e.nationality ?? "",
    identificationType: e.identificationType ?? "",
    identificationNumber: e.identificationNumber ?? "",
    address: e.address ?? "",
    bankName: e.bankName ?? "",
    bankAccountNumber: e.bankAccountNumber ?? "",
    hireDate: e.hireDate ?? "",
    salary: e.salary != null ? String(e.salary) : "",
    status: e.status,
    employmentType: e.employmentType,
    departmentId: e.departmentId ?? "",
    positionId: e.positionId ?? "",
    countryId: e.countryId ?? "",
    managerId: e.managerId ?? "",
  }
}

/** Drop empty strings so we only send fields the user actually filled in. */
function buildPayload(v: FormValues): CreateEmployeeInput {
  const opt = (s: string) => (s.trim() === "" ? undefined : s.trim())
  return {
    organizationId: v.organizationId.trim(),
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
    address: opt(v.address),
    bankName: opt(v.bankName),
    bankAccountNumber: opt(v.bankAccountNumber),
    hireDate: opt(v.hireDate),
    status: opt(v.status) as EmployeeStatus | undefined,
    employmentType: opt(v.employmentType) as EmploymentType | undefined,
    departmentId: opt(v.departmentId),
    positionId: opt(v.positionId),
    countryId: opt(v.countryId),
    managerId: opt(v.managerId),
  }
}

/** Outer loader: resolves the existing employee (edit) before mounting the form. */
export function EmployeeFormPage() {
  const { id } = useParams<{ id: string }>()
  const isEdit = Boolean(id)
  const user = useAuthStore((s) => s.user)
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

  return <EmployeeForm initial={emptyValues(user?.organizationId ?? "")} />
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
              <Field label="Country" htmlFor="countryId">
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
