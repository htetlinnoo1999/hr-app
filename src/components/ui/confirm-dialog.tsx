/* eslint-disable react-refresh/only-export-components -- provider + its
   colocated useConfirm hook are intentionally exported from one file. */
import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react"
import { AlertDialog } from "@base-ui/react/alert-dialog"
import { AlertTriangle } from "lucide-react"

import { Button } from "@/components/ui/button"

export interface ConfirmOptions {
  title: string
  description?: ReactNode
  confirmLabel?: string
  cancelLabel?: string
  /**
   * Require ticking an acknowledgment checkbox before the confirm button
   * enables — a deliberate second step for destructive actions. Defaults to
   * true for the destructive style.
   */
  requireAck?: boolean
  ackLabel?: string
  /** Style the confirm button as destructive (default true). */
  destructive?: boolean
}

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>

const ConfirmContext = createContext<ConfirmFn | null>(null)

/** Imperative confirm — `if (await confirm({...})) { …delete… }`. */
export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext)
  if (!ctx) throw new Error("useConfirm must be used within <ConfirmProvider>")
  return ctx
}

/**
 * Provides {@link useConfirm} and renders a single shared confirmation dialog.
 * Wrap the app once, near the root.
 */
export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const [options, setOptions] = useState<ConfirmOptions | null>(null)
  const [ack, setAck] = useState(false)
  const resolver = useRef<((value: boolean) => void) | null>(null)

  const confirm = useCallback<ConfirmFn>((opts) => {
    setOptions(opts)
    setAck(false)
    setOpen(true)
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve
    })
  }, [])

  const settle = useCallback((result: boolean) => {
    // Resolve at most once; onOpenChange(false) fires again on close.
    resolver.current?.(result)
    resolver.current = null
    setOpen(false)
  }, [])

  const destructive = options?.destructive ?? true
  const requireAck = options?.requireAck ?? destructive
  const canConfirm = !requireAck || ack

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <AlertDialog.Root
        open={open}
        onOpenChange={(next) => {
          if (!next) settle(false)
        }}
      >
        <AlertDialog.Portal>
          <AlertDialog.Backdrop className="fixed inset-0 z-50 bg-black/40 transition-opacity data-ending-style:opacity-0 data-starting-style:opacity-0" />
          <AlertDialog.Popup className="fixed top-1/2 left-1/2 z-50 w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border border-border bg-popover p-6 text-popover-foreground shadow-xl outline-none transition-[transform,opacity] data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0">
            {options && (
              <>
                <div className="flex items-start gap-3">
                  {destructive && (
                    <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                      <AlertTriangle className="size-4" />
                    </span>
                  )}
                  <div className="min-w-0">
                    <AlertDialog.Title className="text-base font-semibold">
                      {options.title}
                    </AlertDialog.Title>
                    {options.description && (
                      <AlertDialog.Description className="mt-1 text-sm text-muted-foreground">
                        {options.description}
                      </AlertDialog.Description>
                    )}
                  </div>
                </div>

                {requireAck && (
                  <label className="mt-4 flex items-start gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2.5 text-sm">
                    <input
                      type="checkbox"
                      checked={ack}
                      onChange={(e) => setAck(e.target.checked)}
                      className="mt-0.5 size-4 accent-destructive"
                    />
                    <span>
                      {options.ackLabel ??
                        "I understand this action cannot be undone."}
                    </span>
                  </label>
                )}

                <div className="mt-6 flex justify-end gap-2">
                  <Button variant="outline" onClick={() => settle(false)}>
                    {options.cancelLabel ?? "Cancel"}
                  </Button>
                  <Button
                    variant={destructive ? "destructive" : "default"}
                    disabled={!canConfirm}
                    onClick={() => settle(true)}
                  >
                    {options.confirmLabel ?? "Delete"}
                  </Button>
                </div>
              </>
            )}
          </AlertDialog.Popup>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </ConfirmContext.Provider>
  )
}
