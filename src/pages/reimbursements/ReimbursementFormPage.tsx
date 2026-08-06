import { useRef, useState, type FormEvent } from "react"
import { useNavigate } from "react-router-dom"
import { ArrowLeft, Paperclip, X } from "lucide-react"

import { Field } from "@/components/form/Field"
import { PageHeader } from "@/components/PageHeader"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import {
  isAllowedReceipt,
  REIMBURSEMENT_CATEGORIES,
  REIMBURSEMENT_RECEIPT_ACCEPT,
  REIMBURSEMENT_RECEIPT_MAX_BYTES,
} from "@/apis/reimbursements"
import { useCurrentEmployee } from "@/hooks/useCurrentEmployee"
import { useCreateReimbursement } from "@/hooks/useReimbursements"
import { getApiErrorMessage } from "@/lib/api"
import { useAuthStore } from "@/stores/authStore"

export function ReimbursementFormPage() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const { employee } = useCurrentEmployee()
  const mut = useCreateReimbursement()

  // Always the signed-in employee — reimbursements are self-submitted.
  const employeeId = user?.id ?? ""
  const employeeName = employee
    ? `${employee.firstName} ${employee.lastName}`
    : (user?.email ?? "You")

  const [amount, setAmount] = useState("")
  const [category, setCategory] = useState("")
  const [description, setDescription] = useState("")
  const [expenseDate, setExpenseDate] = useState("")
  const [file, setFile] = useState<File | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function pickFile(e: React.ChangeEvent<HTMLInputElement>) {
    setFileError(null)
    const chosen = e.target.files?.[0] ?? null
    if (!chosen) {
      setFile(null)
      return
    }
    if (!isAllowedReceipt(chosen)) {
      setFile(null)
      setFileError("Only image or PDF files are allowed.")
      return
    }
    if (chosen.size > REIMBURSEMENT_RECEIPT_MAX_BYTES) {
      setFile(null)
      setFileError("File must be under 10 MB.")
      return
    }
    setFile(chosen)
  }

  function clearFile() {
    setFile(null)
    setFileError(null)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    const amt = Number(amount)
    if (!employeeId) return setError("Select an employee.")
    if (amount.trim() === "" || Number.isNaN(amt) || amt <= 0)
      return setError("Enter a valid amount.")
    if (!category.trim()) return setError("Enter a category.")
    if (!expenseDate) return setError("Select the expense date.")

    try {
      await mut.mutateAsync({
        employeeId,
        amount: amt,
        category: category.trim(),
        description: description.trim() || undefined,
        expenseDate,
        receipt: file ?? undefined,
      })
      navigate(-1)
    } catch (err) {
      // The most common 400 here is "no department / no department head" — the
      // server message says so; surface it (not a generic toast) with a hint.
      setError(
        getApiErrorMessage(
          err,
          "Couldn't submit. The employee needs a department with a head assigned before they can request reimbursements.",
        ),
      )
    }
  }

  return (
    <div>
      <PageHeader
        title="New reimbursement"
        description="Submit an expense for reimbursement."
        actions={
          <Button variant="outline" onClick={() => navigate(-1)}>
            <ArrowLeft />
            Back
          </Button>
        }
      />

      <Card>
        <CardContent>
          <form onSubmit={submit} className="space-y-6" noValidate>
            <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Employee" htmlFor="employeeId">
                <Select id="employeeId" value={employeeId} disabled>
                  <option value={employeeId}>{employeeName}</option>
                </Select>
              </Field>
              <Field label="Amount" htmlFor="amount" required>
                <Input
                  id="amount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="50000"
                />
              </Field>
              <Field
                label="Category"
                htmlFor="category"
                required
                hint="Pick a suggestion or type your own."
              >
                <Input
                  id="category"
                  list="reimbursement-categories"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="Travel"
                />
                <datalist id="reimbursement-categories">
                  {REIMBURSEMENT_CATEGORIES.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </Field>
              <Field label="Expense date" htmlFor="expenseDate" required>
                <Input
                  id="expenseDate"
                  type="date"
                  value={expenseDate}
                  onChange={(e) => setExpenseDate(e.target.value)}
                />
              </Field>
            </section>

            <Field label="Description" htmlFor="description">
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What was this expense for?"
              />
            </Field>

            <Field
              label="Receipt (optional)"
              hint="Image or PDF, up to 10 MB."
            >
              <input
                ref={fileInputRef}
                type="file"
                accept={REIMBURSEMENT_RECEIPT_ACCEPT}
                onChange={pickFile}
                className="hidden"
                aria-label="Receipt"
              />
              {file ? (
                <div className="flex items-center justify-between gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm">
                  <span className="flex min-w-0 items-center gap-2">
                    <Paperclip className="size-4 shrink-0 text-muted-foreground" />
                    <span className="truncate">{file.name}</span>
                  </span>
                  <button
                    type="button"
                    onClick={clearFile}
                    aria-label="Remove receipt"
                    className="text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <X className="size-4" />
                  </button>
                </div>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Paperclip />
                  Choose file
                </Button>
              )}
              {fileError && (
                <p role="alert" className="mt-1 text-xs text-destructive">
                  {fileError}
                </p>
              )}
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
                disabled={mut.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={mut.isPending}>
                {mut.isPending ? "Submitting…" : "Submit reimbursement"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
