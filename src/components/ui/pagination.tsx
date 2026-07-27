import { ChevronLeft, ChevronRight } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export interface PaginationProps {
  /** 1-based current page. */
  page: number
  /** Total number of pages (>= 1). */
  pageCount: number
  /** Total item count — shown in the "Showing x–y of N" summary when provided. */
  total?: number
  /** Page size — needed alongside `total` for the range summary. */
  pageSize?: number
  onPageChange: (page: number) => void
  className?: string
}

/**
 * Presentational Prev/Next pager. Works for both server-side pagination (pass
 * page/pageCount from the API envelope) and client-side pagination (derive them
 * from a filtered array). Renders nothing when there is a single page.
 */
export function Pagination({
  page,
  pageCount,
  total,
  pageSize,
  onPageChange,
  className,
}: PaginationProps) {
  if (pageCount <= 1) return null

  const hasRange = total != null && pageSize != null
  const start = hasRange ? (page - 1) * pageSize! + 1 : undefined
  const end = hasRange ? Math.min(page * pageSize!, total!) : undefined

  return (
    <div
      className={cn(
        "mt-4 flex flex-wrap items-center justify-between gap-3",
        className,
      )}
    >
      <p className="text-sm text-muted-foreground">
        {hasRange
          ? `Showing ${start}–${end} of ${total}`
          : `Page ${page} of ${pageCount}`}
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft />
          Previous
        </Button>
        <span className="text-sm text-muted-foreground tabular-nums">
          {page} / {pageCount}
        </span>
        <Button
          variant="outline"
          size="sm"
          disabled={page >= pageCount}
          onClick={() => onPageChange(page + 1)}
        >
          Next
          <ChevronRight />
        </Button>
      </div>
    </div>
  )
}
