import { AlertTriangle } from "lucide-react"

import { cn } from "@/lib/utils"
import { visaStatus } from "@/lib/visa"

/**
 * Compliance warning badge for a visa nearing or past expiry. Renders nothing
 * when the visa is current or unset.
 */
export function VisaBadge({
  visaEndDate,
  className,
}: {
  visaEndDate: string | null | undefined
  className?: string
}) {
  const status = visaStatus(visaEndDate)
  if (status !== "expiring" && status !== "expired") return null

  const expired = status === "expired"
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
        expired
          ? "bg-destructive/10 text-destructive"
          : "bg-amber-500/15 text-amber-700 dark:text-amber-400",
        className,
      )}
    >
      <AlertTriangle className="size-3" />
      {expired ? "Visa expired" : "Visa expiring"}
    </span>
  )
}
