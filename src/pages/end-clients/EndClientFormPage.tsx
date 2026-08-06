import { useState, type FormEvent } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { ArrowLeft } from "lucide-react"

import { Field } from "@/components/form/Field"
import { PageHeader } from "@/components/PageHeader"
import { ErrorState } from "@/components/states"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { LoadingState } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"
import type {
  CreateEndClientInput,
  EndClient,
  UpdateEndClientInput,
} from "@/apis/end-clients"
import {
  useCreateEndClient,
  useEndClient,
  useUpdateEndClient,
} from "@/hooks/useEndClients"
import { getApiErrorMessage } from "@/lib/api"

interface FormValues {
  name: string
  contactPerson: string
  email: string
  whatsappNumber: string
  phone: string
  address: string
  notes: string
}

function emptyValues(): FormValues {
  return {
    name: "",
    contactPerson: "",
    email: "",
    whatsappNumber: "",
    phone: "",
    address: "",
    notes: "",
  }
}

function valuesFromEndClient(c: EndClient): FormValues {
  return {
    name: c.name,
    contactPerson: c.contactPerson ?? "",
    email: c.email ?? "",
    whatsappNumber: c.whatsappNumber ?? "",
    phone: c.phone ?? "",
    address: c.address ?? "",
    notes: c.notes ?? "",
  }
}

/** Outer loader: resolve the existing end client (edit) before mounting the form. */
export function EndClientFormPage() {
  const { id } = useParams<{ id: string }>()
  const isEdit = Boolean(id)
  const existing = useEndClient(isEdit ? id : undefined)

  if (isEdit) {
    if (existing.isLoading) return <LoadingState />
    if (existing.isError || !existing.data)
      return (
        <ErrorState
          error={existing.error}
          notFoundLabel="End client not found."
        />
      )
    return (
      <EndClientForm id={id} initial={valuesFromEndClient(existing.data)} />
    )
  }

  return <EndClientForm initial={emptyValues()} />
}

function EndClientForm({ id, initial }: { id?: string; initial: FormValues }) {
  const isEdit = Boolean(id)
  const navigate = useNavigate()

  const createMut = useCreateEndClient()
  const updateMut = useUpdateEndClient(id ?? "")

  const [values, setValues] = useState<FormValues>(initial)
  const [error, setError] = useState<string | null>(null)

  const set = (key: keyof FormValues) => (value: string) =>
    setValues((v) => ({ ...v, [key]: value }))

  const submitting = createMut.isPending || updateMut.isPending

  async function handleSubmit(ev: FormEvent) {
    ev.preventDefault()
    setError(null)
    try {
      if (isEdit) {
        // Send null for cleared optional fields so the backend unsets them.
        const payload: UpdateEndClientInput = {
          name: values.name.trim(),
          contactPerson: values.contactPerson.trim() || null,
          email: values.email.trim() || null,
          whatsappNumber: values.whatsappNumber.trim() || null,
          phone: values.phone.trim() || null,
          address: values.address.trim() || null,
          notes: values.notes.trim() || null,
        }
        await updateMut.mutateAsync(payload)
      } else {
        const opt = (s: string) => (s.trim() === "" ? undefined : s.trim())
        const payload: CreateEndClientInput = {
          name: values.name.trim(),
          contactPerson: opt(values.contactPerson),
          email: opt(values.email),
          whatsappNumber: opt(values.whatsappNumber),
          phone: opt(values.phone),
          address: opt(values.address),
          notes: opt(values.notes),
        }
        await createMut.mutateAsync(payload)
      }
      navigate("/end-clients")
    } catch (err) {
      setError(getApiErrorMessage(err))
    }
  }

  return (
    <div>
      <PageHeader
        title={isEdit ? "Edit end client" : "New end client"}
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
                  onChange={(e) => set("name")(e.target.value)}
                  placeholder="Acme Corp"
                />
              </Field>
              <Field label="Contact person" htmlFor="contactPerson">
                <Input
                  id="contactPerson"
                  value={values.contactPerson}
                  onChange={(e) => set("contactPerson")(e.target.value)}
                />
              </Field>
              <Field label="Email" htmlFor="email">
                <Input
                  id="email"
                  type="email"
                  value={values.email}
                  onChange={(e) => set("email")(e.target.value)}
                />
              </Field>
              <Field label="WhatsApp number" htmlFor="whatsappNumber">
                <Input
                  id="whatsappNumber"
                  value={values.whatsappNumber}
                  onChange={(e) => set("whatsappNumber")(e.target.value)}
                  placeholder="+95912345678"
                />
              </Field>
              <Field label="Phone" htmlFor="phone">
                <Input
                  id="phone"
                  value={values.phone}
                  onChange={(e) => set("phone")(e.target.value)}
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

            <Field label="Notes" htmlFor="notes">
              <Textarea
                id="notes"
                value={values.notes}
                onChange={(e) => set("notes")(e.target.value)}
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
                    : "Create end client"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
