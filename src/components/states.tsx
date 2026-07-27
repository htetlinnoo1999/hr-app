import axios from "axios"
import type { ReactNode } from "react"

import { getApiErrorMessage } from "@/lib/api"

/**
 * Error panel for a failed query. A 404 is rendered as "not found" — the API
 * returns 404 (not 403) for resources outside your org, so this doubles as the
 * access-denied case by design.
 */
export function ErrorState({
  error,
  notFoundLabel = "Not found.",
}: {
  error: unknown
  notFoundLabel?: string
}) {
  const status = axios.isAxiosError(error) ? error.response?.status : undefined
  const message =
    status === 404 ? notFoundLabel : getApiErrorMessage(error)
  return (
    <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-5 py-8 text-center text-sm text-destructive">
      {message}
    </div>
  )
}

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-border px-5 py-12 text-center text-sm text-muted-foreground">
      {children}
    </div>
  )
}
