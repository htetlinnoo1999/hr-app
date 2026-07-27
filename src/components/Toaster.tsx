import { CheckCircle2, Info, X, XCircle } from "lucide-react"

import { useToastStore, type ToastType } from "@/stores/toastStore"
import { cn } from "@/lib/utils"

const ICON: Record<ToastType, typeof Info> = {
  success: CheckCircle2,
  error: XCircle,
  info: Info,
}

const ACCENT: Record<ToastType, string> = {
  success: "text-emerald-600 dark:text-emerald-400",
  error: "text-destructive",
  info: "text-primary",
}

/** Renders active toasts bottom-right. Mount once near the app root. */
export function Toaster() {
  const toasts = useToastStore((s) => s.toasts)
  const remove = useToastStore((s) => s.remove)

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-100 flex w-full max-w-sm flex-col gap-2">
      {toasts.map((t) => {
        const Icon = ICON[t.type]
        return (
          <div
            key={t.id}
            role="status"
            className="pointer-events-auto flex items-start gap-3 rounded-xl border border-border bg-popover px-4 py-3 text-popover-foreground shadow-lg"
          >
            <Icon className={cn("mt-0.5 size-4 shrink-0", ACCENT[t.type])} />
            <p className="flex-1 text-sm">{t.message}</p>
            <button
              onClick={() => remove(t.id)}
              className="text-muted-foreground transition-colors hover:text-foreground"
              aria-label="Dismiss"
            >
              <X className="size-4" />
            </button>
          </div>
        )
      })}
    </div>
  )
}
