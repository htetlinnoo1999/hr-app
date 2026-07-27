import { EmptyState } from "@/components/states"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import type { EmployeeLeaveBalance } from "@/apis/employees"

/** A single leave type's usage, e.g. "Annual Leave — 1 / 14". */
function LeaveBalanceItem({ balance }: { balance: EmployeeLeaveBalance }) {
  const pct =
    balance.totalDays > 0
      ? Math.min(100, Math.max(0, (balance.usedDays / balance.totalDays) * 100))
      : 0

  return (
    <div className="rounded-lg border border-border p-3">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-sm font-medium">{balance.leaveType.name}</span>
        <span className="text-sm tabular-nums">
          <span className="font-semibold">{balance.usedDays}</span>
          <span className="text-muted-foreground"> / {balance.totalDays}</span>
        </span>
      </div>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="mt-1.5 text-xs text-muted-foreground">
        {balance.remainingDays} {balance.remainingDays === 1 ? "day" : "days"}{" "}
        remaining
      </p>
    </div>
  )
}

/** Per-leave-type balances (days taken vs. allowance) for an employee. Fed by
 * the `leaveBalances` embedded on the single-employee fetch. */
export function LeaveBalancesCard({
  balances,
  title = "Leave balances",
}: {
  balances: EmployeeLeaveBalance[]
  title?: string
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {balances.length === 0 ? (
          <EmptyState>No leave balances yet.</EmptyState>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {balances.map((b) => (
              <LeaveBalanceItem key={b.id} balance={b} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
