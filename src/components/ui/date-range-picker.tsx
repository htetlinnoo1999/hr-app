import { useState } from "react"
import { format, parse } from "date-fns"
import { CalendarDays } from "lucide-react"
import type { DateRange } from "react-day-picker"

import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"

const FMT = "yyyy-MM-dd"

function parseDate(s: string): Date | undefined {
  if (!s) return undefined
  const d = parse(s, FMT, new Date())
  return Number.isNaN(d.getTime()) ? undefined : d
}

export interface DateRangePickerProps {
  /** Selected range as "YYYY-MM-DD" strings ("" when unset). */
  startDate: string
  endDate: string
  onChange: (range: { startDate: string; endDate: string }) => void
  id?: string
  placeholder?: string
  className?: string
}

/** A single day-range picker (shadcn Calendar in a Popover). Values round-trip
 * as day-accurate "YYYY-MM-DD" strings — no time, no timezone drift. */
export function DateRangePicker({
  startDate,
  endDate,
  onChange,
  id,
  placeholder = "Select dates",
  className,
}: DateRangePickerProps) {
  const [open, setOpen] = useState(false)
  // Two-phase selection so every session starts fresh: the first click picks a
  // new start (clearing any prior end), the second click picks the end.
  const [phase, setPhase] = useState<"start" | "end">("start")

  const from = parseDate(startDate)
  const to = parseDate(endDate)
  const range: DateRange | undefined = from ? { from, to } : undefined

  // A single-day pick lands as from === to; show just one date in that case.
  const sameDay = Boolean(from && to && startDate === endDate)
  const label = from
    ? to && !sameDay
      ? `${format(from, "MMM d, yyyy")} – ${format(to, "MMM d, yyyy")}`
      : format(from, "MMM d, yyyy")
    : placeholder

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (next) setPhase("start")
  }

  function handleDayClick(day: Date) {
    const key = format(day, FMT)
    if (phase === "start" || !startDate) {
      // Begin a new range: set the start, clear the old end.
      onChange({ startDate: key, endDate: "" })
      setPhase("end")
      return
    }
    // Complete the range, ordering the two clicks correctly.
    const [s, e] = key < startDate ? [key, startDate] : [startDate, key]
    onChange({ startDate: s, endDate: e })
    setPhase("start")
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger
        id={id}
        className={cn(
          "flex h-9 w-full items-center gap-2 rounded-lg border border-input bg-background px-3 text-left text-sm shadow-xs transition-[color,box-shadow] outline-none",
          "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
          "dark:bg-input/30",
          className,
        )}
      >
        <CalendarDays className="size-4 shrink-0 text-muted-foreground" />
        <span className={cn("truncate", !from && "text-muted-foreground")}>
          {label}
        </span>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="range"
          numberOfMonths={2}
          autoFocus
          selected={range}
          defaultMonth={from}
          onSelect={() => {}}
          onDayClick={handleDayClick}
        />
      </PopoverContent>
    </Popover>
  )
}
