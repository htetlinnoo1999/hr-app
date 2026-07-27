import { Loader2 } from "lucide-react"

import { cn } from "@/lib/utils"

function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn("size-4 animate-spin", className)} />
}

/** Centered loading state for pages/panels. */
function LoadingState({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
      <Spinner />
      {label}
    </div>
  )
}

export { Spinner, LoadingState }
