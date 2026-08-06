import { useState, type FormEvent } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { ArrowLeft } from "lucide-react"

import { Field } from "@/components/form/Field"
import { PageHeader } from "@/components/PageHeader"
import { ErrorState } from "@/components/states"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { LoadingState } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"
import type {
  CreateDepartmentInput,
  Department,
  UpdateDepartmentInput,
} from "@/apis/departments"
import {
  useCreateDepartment,
  useDepartment,
  useUpdateDepartment,
} from "@/hooks/useDepartments"
import { useAllEmployees } from "@/hooks/useEmployees"
import { getApiErrorMessage } from "@/lib/api"

interface FormValues {
  name: string
  description: string
  managerId: string
}

/** Outer loader: resolve the existing department (edit) before mounting the form. */
export function DepartmentFormPage() {
  const { id } = useParams<{ id: string }>()
  const isEdit = Boolean(id)
  const existing = useDepartment(isEdit ? id : undefined)

  if (isEdit) {
    if (existing.isLoading) return <LoadingState />
    if (existing.isError || !existing.data)
      return (
        <ErrorState
          error={existing.error}
          notFoundLabel="Department not found."
        />
      )
    return <DepartmentForm id={id} initial={valuesFromDept(existing.data)} />
  }

  return (
    <DepartmentForm initial={{ name: "", description: "", managerId: "" }} />
  )
}

function valuesFromDept(d: Department): FormValues {
  return {
    name: d.name,
    description: d.description ?? "",
    managerId: d.managerId ?? "",
  }
}

function DepartmentForm({
  id,
  initial,
}: {
  id?: string
  initial: FormValues
}) {
  const isEdit = Boolean(id)
  const navigate = useNavigate()

  const employees = useAllEmployees()
  const createMut = useCreateDepartment()
  const updateMut = useUpdateDepartment(id ?? "")

  const [values, setValues] = useState<FormValues>(initial)
  const [error, setError] = useState<string | null>(null)

  const submitting = createMut.isPending || updateMut.isPending

  async function handleSubmit(ev: FormEvent) {
    ev.preventDefault()
    setError(null)
    try {
      if (isEdit) {
        const payload: UpdateDepartmentInput = {
          name: values.name.trim(),
          description: values.description.trim() || null,
          managerId: values.managerId || null,
        }
        await updateMut.mutateAsync(payload)
      } else {
        const payload: CreateDepartmentInput = {
          name: values.name.trim(),
          description: values.description.trim() || undefined,
          managerId: values.managerId || undefined,
        }
        await createMut.mutateAsync(payload)
      }
      navigate("/departments")
    } catch (err) {
      setError(getApiErrorMessage(err))
    }
  }

  return (
    <div>
      <PageHeader
        title={isEdit ? "Edit department" : "New department"}
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
              <Field label="Name" htmlFor="name" required>
                <Input
                  id="name"
                  required
                  minLength={1}
                  value={values.name}
                  onChange={(e) =>
                    setValues((v) => ({ ...v, name: e.target.value }))
                  }
                  placeholder="Engineering"
                />
              </Field>

              <Field
                label="Manager"
                htmlFor="managerId"
                hint="An employee in the same org. They can manage only one department."
              >
                <Select
                  id="managerId"
                  value={values.managerId}
                  onChange={(e) =>
                    setValues((v) => ({ ...v, managerId: e.target.value }))
                  }
                >
                  <option value="">—</option>
                  {(employees.data ?? []).map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.firstName} {m.lastName} ({m.employeeCode})
                    </option>
                  ))}
                </Select>
              </Field>
            </section>

            <Field label="Description" htmlFor="description">
              <Textarea
                id="description"
                value={values.description}
                onChange={(e) =>
                  setValues((v) => ({ ...v, description: e.target.value }))
                }
              />
            </Field>

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
                    : "Create department"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
