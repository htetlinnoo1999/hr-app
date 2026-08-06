import { ChevronDown, ChevronsUpDown, ChevronUp } from "lucide-react"

import { TableHead } from "@/components/ui/table"
import type { SortState } from "@/lib/sort"
import { cn } from "@/lib/utils"

/** A sortable table header cell wired to a {@link SortState}. */
export function SortHeader<K extends string>({
  label,
  sortKey,
  state,
  className,
}: {
  label: string
  sortKey: K
  state: SortState<K>
  className?: string
}) {
  const active = state.key === sortKey
  const Icon = !active
    ? ChevronsUpDown
    : state.dir === "asc"
      ? ChevronUp
      : ChevronDown

  return (
    <TableHead className={className}>
      <button
        type="button"
        onClick={() => state.toggle(sortKey)}
        aria-label={`Sort by ${label}`}
        className={cn(
          "group -mx-1 inline-flex items-center gap-1 rounded px-1 py-0.5 transition-colors hover:text-foreground",
          active && "text-foreground",
        )}
      >
        {label}
        <Icon
          className={cn(
            "size-3.5",
            active ? "opacity-100" : "opacity-40 group-hover:opacity-70",
          )}
        />
      </button>
    </TableHead>
  )
}
