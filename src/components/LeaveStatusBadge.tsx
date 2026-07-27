import { Badge } from "@/components/ui/badge"
import { LEAVE_STATUSES, type LeaveStatus } from "@/apis/leave-requests"
import { humanizeEnum } from "@/lib/format"

const VARIANT: Record<
  LeaveStatus,
  "success" | "neutral" | "warning" | "destructive"
> = {
  [LEAVE_STATUSES.PENDING]: "warning",
  [LEAVE_STATUSES.APPROVED]: "success",
  [LEAVE_STATUSES.REJECTED]: "destructive",
  [LEAVE_STATUSES.CANCELLED]: "neutral",
}

export function LeaveStatusBadge({ status }: { status: LeaveStatus }) {
  return (
    <Badge variant={VARIANT[status] ?? "neutral"}>{humanizeEnum(status)}</Badge>
  )
}
