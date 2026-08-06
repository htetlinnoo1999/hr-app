import { Badge } from "@/components/ui/badge"
import {
  REIMBURSEMENT_STATUSES,
  type ReimbursementStatus,
} from "@/apis/reimbursements"
import { humanizeEnum } from "@/lib/format"

const VARIANT: Record<
  ReimbursementStatus,
  "default" | "success" | "neutral" | "warning" | "destructive"
> = {
  [REIMBURSEMENT_STATUSES.PENDING]: "warning",
  [REIMBURSEMENT_STATUSES.APPROVED]: "default",
  [REIMBURSEMENT_STATUSES.REJECTED]: "destructive",
  [REIMBURSEMENT_STATUSES.CANCELLED]: "neutral",
  [REIMBURSEMENT_STATUSES.PAID]: "success",
}

export function ReimbursementStatusBadge({
  status,
}: {
  status: ReimbursementStatus
}) {
  return (
    <Badge variant={VARIANT[status] ?? "neutral"}>{humanizeEnum(status)}</Badge>
  )
}
