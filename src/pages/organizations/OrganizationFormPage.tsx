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
import {
  ORGANIZATION_SLUG_PATTERN,
  type CreateOrganizationInput,
  type Organization,
} from "@/apis/organizations"
import {
  useCreateOrganization,
  useOrganization,
  useUpdateOrganization,
} from "@/hooks/useOrganizations"
import { getApiErrorMessage } from "@/lib/api"

interface FormValues {
  name: string
  slug: string
  primaryColor: string
  secondaryColor: string
  logo: string
  isDefault: boolean
}

const EMPTY: FormValues = {
  name: "",
  slug: "",
  primaryColor: "",
  secondaryColor: "",
  logo: "",
  isDefault: false,
}

function valuesFromOrg(o: Organization): FormValues {
  return {
    name: o.name,
    slug: o.slug,
    primaryColor: o.primaryColor ?? "",
    secondaryColor: o.secondaryColor ?? "",
    logo: o.logo ?? "",
    isDefault: o.isDefault,
  }
}

function buildPayload(v: FormValues): CreateOrganizationInput {
  const opt = (s: string) => (s.trim() === "" ? undefined : s.trim())
  return {
    name: v.name.trim(),
    slug: v.slug.trim(),
    primaryColor: opt(v.primaryColor),
    secondaryColor: opt(v.secondaryColor),
    logo: opt(v.logo),
    isDefault: v.isDefault,
  }
}

/** Outer loader: resolves the existing org (edit) before mounting the form. */
export function OrganizationFormPage() {
  const { id } = useParams<{ id: string }>()
  const isEdit = Boolean(id)
  const existing = useOrganization(isEdit ? id : undefined)

  if (isEdit) {
    if (existing.isLoading) return <LoadingState />
    if (existing.isError || !existing.data)
      return (
        <ErrorState
          error={existing.error}
          notFoundLabel="Organization not found."
        />
      )
    return <OrganizationForm id={id} initial={valuesFromOrg(existing.data)} />
  }

  return <OrganizationForm initial={EMPTY} />
}

function OrganizationForm({
  id,
  initial,
}: {
  id?: string
  initial: FormValues
}) {
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const createMut = useCreateOrganization()
  const updateMut = useUpdateOrganization(id ?? "")

  const [values, setValues] = useState<FormValues>(initial)
  const [error, setError] = useState<string | null>(null)

  const submitting = createMut.isPending || updateMut.isPending
  const slugInvalid =
    values.slug.trim() !== "" &&
    !ORGANIZATION_SLUG_PATTERN.test(values.slug.trim())

  async function handleSubmit(ev: FormEvent) {
    ev.preventDefault()
    setError(null)
    if (slugInvalid) {
      setError("Slug must be lowercase letters, numbers and hyphens only.")
      return
    }
    const payload = buildPayload(values)
    try {
      if (isEdit) {
        await updateMut.mutateAsync(payload)
        navigate(`/organizations/${id}`)
      } else {
        const created = await createMut.mutateAsync(payload)
        navigate(`/organizations/${created.id}`)
      }
    } catch (err) {
      setError(getApiErrorMessage(err))
    }
  }

  return (
    <div>
      <PageHeader
        title={isEdit ? "Edit organization" : "New organization"}
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
              <Field
                label="Name"
                htmlFor="name"
                required
                hint="Min 2 characters, unique."
              >
                <Input
                  id="name"
                  required
                  minLength={2}
                  value={values.name}
                  onChange={(e) =>
                    setValues((v) => ({ ...v, name: e.target.value }))
                  }
                />
              </Field>
              <Field
                label="Slug"
                htmlFor="slug"
                required
                hint="Lowercase letters, numbers and hyphens. Unique."
              >
                <Input
                  id="slug"
                  required
                  value={values.slug}
                  aria-invalid={slugInvalid}
                  onChange={(e) =>
                    setValues((v) => ({ ...v, slug: e.target.value }))
                  }
                  placeholder="acme-inc"
                />
              </Field>
              <Field label="Primary color" htmlFor="primaryColor">
                <Input
                  id="primaryColor"
                  value={values.primaryColor}
                  onChange={(e) =>
                    setValues((v) => ({ ...v, primaryColor: e.target.value }))
                  }
                  placeholder="#4F46E5"
                />
              </Field>
              <Field label="Secondary color" htmlFor="secondaryColor">
                <Input
                  id="secondaryColor"
                  value={values.secondaryColor}
                  onChange={(e) =>
                    setValues((v) => ({ ...v, secondaryColor: e.target.value }))
                  }
                  placeholder="#818CF8"
                />
              </Field>
              <Field label="Logo URL" htmlFor="logo">
                <Input
                  id="logo"
                  value={values.logo}
                  onChange={(e) =>
                    setValues((v) => ({ ...v, logo: e.target.value }))
                  }
                />
              </Field>
            </section>

            <label className="flex items-center gap-2 text-sm font-medium select-none">
              <input
                type="checkbox"
                className="size-4 rounded border-input"
                checked={values.isDefault}
                onChange={(e) =>
                  setValues((v) => ({ ...v, isDefault: e.target.checked }))
                }
              />
              Default organization
              <span className="font-normal text-muted-foreground">
                (branding fallback for orgs with missing fields)
              </span>
            </label>

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
                    : "Create organization"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
