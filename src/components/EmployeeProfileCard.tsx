import { useState, type ReactNode } from "react"
import { Eye, EyeOff } from "lucide-react"

import { EmployeeStatusBadge } from "@/components/EmployeeStatusBadge"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import type { Employee } from "@/apis/employees"
import { formatDate, formatNumber, humanizeEnum } from "@/lib/format"
import { useAuthStore } from "@/stores/authStore"

const MASK = "••••••"

function DetailRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <>
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-sm">{value ?? "—"}</dd>
    </>
  )
}

/**
 * A row whose value is masked by default. The owner (viewing their own record)
 * gets an eye toggle to reveal it; for anyone else's record the value stays
 * masked and no toggle is shown. Empty values render as a plain "—".
 */
function SensitiveRow({
  label,
  value,
  canReveal,
}: {
  label: string
  value: string
  canReveal: boolean
}) {
  const [revealed, setRevealed] = useState(false)

  if (!value || value === "—") return <DetailRow label={label} value="—" />

  const show = canReveal && revealed
  return (
    <>
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="flex items-center gap-2 text-sm">
        <span className={show ? undefined : "tracking-widest"}>
          {show ? value : MASK}
        </span>
        {canReveal && (
          <button
            type="button"
            onClick={() => setRevealed((v) => !v)}
            className="text-muted-foreground transition-colors hover:text-foreground"
            aria-pressed={show}
            aria-label={
              show ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`
            }
          >
            {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        )}
      </dd>
    </>
  )
}

/** Read-only view of an employee's profile fields. Reused by the employee
 * detail page and the current user's own profile page. */
export function EmployeeProfileCard({
  employee,
  title = "Profile",
}: {
  employee: Employee
  title?: string
}) {
  const currentUserId = useAuthStore((s) => s.user?.id)
  // The auth user's id is their employee id, so this is "viewing my own record".
  const isOwn = currentUserId != null && currentUserId === employee.id

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2 [&>dt]:font-medium">
          <DetailRow
            label="Status"
            value={<EmployeeStatusBadge status={employee.status} />}
          />
          <DetailRow
            label="Employment"
            value={humanizeEnum(employee.employmentType)}
          />
          <DetailRow label="Email" value={employee.email} />
          <SensitiveRow
            label="Personal email"
            value={employee.personalEmail ?? ""}
            canReveal={isOwn}
          />
          <DetailRow label="Phone" value={employee.phone || "—"} />
          <SensitiveRow
            label="Salary"
            value={formatNumber(employee.salary)}
            canReveal={isOwn}
          />
          <DetailRow label="Hire date" value={formatDate(employee.hireDate)} />
          <DetailRow label="Gender" value={humanizeEnum(employee.gender)} />
          <DetailRow
            label="Date of birth"
            value={formatDate(employee.dateOfBirth)}
          />
          <DetailRow label="Nationality" value={employee.nationality || "—"} />
          <SensitiveRow
            label="Address"
            value={employee.address ?? ""}
            canReveal={isOwn}
          />
          <DetailRow
            label="Identification"
            value={
              employee.identificationNumber
                ? `${humanizeEnum(employee.identificationType)} · ${employee.identificationNumber}`
                : "—"
            }
          />
        </dl>
      </CardContent>
    </Card>
  )
}
