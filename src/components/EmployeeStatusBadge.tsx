import { Badge } from "@/components/ui/badge"
import { EMPLOYEE_STATUSES, type EmployeeStatus } from "@/apis/employees"
import { humanizeEnum } from "@/lib/format"

const VARIANT: Record<
  EmployeeStatus,
  "success" | "neutral" | "warning" | "destructive"
> = {
  [EMPLOYEE_STATUSES.ACTIVE]: "success",
  [EMPLOYEE_STATUSES.INACTIVE]: "neutral",
  [EMPLOYEE_STATUSES.ON_LEAVE]: "warning",
  [EMPLOYEE_STATUSES.TERMINATED]: "destructive",
}

export function EmployeeStatusBadge({ status }: { status: EmployeeStatus }) {
  return <Badge variant={VARIANT[status]}>{humanizeEnum(status)}</Badge>
}
