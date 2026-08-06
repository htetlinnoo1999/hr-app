import { useEffect, useMemo, useState, type ComponentType } from "react"
import { useNavigate } from "react-router-dom"
import { Dialog } from "@base-ui/react/dialog"
import {
  Briefcase,
  CalendarDays,
  CalendarRange,
  Layers,
  Receipt,
  Search,
  User,
  Users,
} from "lucide-react"

import { useEmployeeOptions } from "@/hooks/useEmployees"
import { cn } from "@/lib/utils"

interface QuickLink {
  label: string
  to: string
  icon: ComponentType<{ className?: string }>
}

/** Static destinations always reachable from the palette. */
const QUICK_LINKS: QuickLink[] = [
  { label: "Employees", to: "/employees", icon: Users },
  { label: "Departments", to: "/departments", icon: Layers },
  { label: "End clients", to: "/end-clients", icon: Briefcase },
  { label: "Leave requests", to: "/leave", icon: CalendarDays },
  { label: "Leave calendar", to: "/leave/calendar", icon: CalendarRange },
  { label: "Reimbursements", to: "/reimbursements", icon: Receipt },
  { label: "My profile", to: "/profile", icon: User },
]

const MAX_EMPLOYEE_RESULTS = 6

/**
 * Global search. Opens with ⌘K / Ctrl+K (or the topbar search bar), filters
 * employees by name and offers quick navigation. Enter jumps to the first
 * result.
 */
export function CommandPalette() {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  // Only load the employee list once the palette is actually opened.
  const { data: employees } = useEmployeeOptions(open)

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault()
        setOpen((o) => !o)
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [])

  const q = query.trim().toLowerCase()

  const employeeResults = useMemo(() => {
    if (!q) return []
    return (employees ?? [])
      .filter((e) => e.name.toLowerCase().includes(q))
      .slice(0, MAX_EMPLOYEE_RESULTS)
  }, [employees, q])

  const linkResults = useMemo(
    () =>
      q
        ? QUICK_LINKS.filter((l) => l.label.toLowerCase().includes(q))
        : QUICK_LINKS,
    [q],
  )

  function go(to: string) {
    setOpen(false)
    setQuery("")
    navigate(to)
  }

  function onInputKeyDown(e: React.KeyboardEvent) {
    if (e.key !== "Enter") return
    const employee = employeeResults[0]
    const link = linkResults[0]
    if (employee) {
      e.preventDefault()
      go(`/employees/${employee.id}`)
    } else if (link) {
      e.preventDefault()
      go(link.to)
    }
  }

  const hasResults = employeeResults.length > 0 || linkResults.length > 0

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) setQuery("")
      }}
    >
      <Dialog.Trigger
        render={
          <button
            type="button"
            className="flex h-8 w-full max-w-56 items-center gap-2 rounded-lg border border-border bg-muted/40 px-2.5 text-sm text-muted-foreground transition-colors hover:bg-muted"
            aria-label="Search"
          >
            <Search className="size-4 shrink-0" />
            <span className="flex-1 truncate text-left">Search…</span>
            <kbd className="pointer-events-none hidden rounded border border-border px-1 font-sans text-[10px] text-muted-foreground sm:inline">
              ⌘K
            </kbd>
          </button>
        }
      />
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/40 transition-opacity data-starting-style:opacity-0 data-ending-style:opacity-0" />
        <Dialog.Popup className="fixed top-24 left-1/2 z-50 w-[calc(100vw-2rem)] max-w-lg -translate-x-1/2 overflow-hidden rounded-xl border border-border bg-popover text-popover-foreground shadow-2xl outline-none transition-[transform,opacity] data-starting-style:scale-95 data-starting-style:opacity-0">
          <Dialog.Title className="sr-only">Search</Dialog.Title>
          <div className="flex items-center gap-2 border-b border-border px-3">
            <Search className="size-4 shrink-0 text-muted-foreground" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onInputKeyDown}
              placeholder="Search employees or jump to a page…"
              className="h-11 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>

          <div className="max-h-80 overflow-y-auto p-1.5">
            {!hasResults && (
              <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                No matches for “{query}”.
              </p>
            )}

            {employeeResults.length > 0 && (
              <Section label="Employees">
                {employeeResults.map((e) => (
                  <ResultRow
                    key={e.id}
                    icon={Users}
                    label={e.name}
                    onSelect={() => go(`/employees/${e.id}`)}
                  />
                ))}
              </Section>
            )}

            {linkResults.length > 0 && (
              <Section label="Go to">
                {linkResults.map((l) => (
                  <ResultRow
                    key={l.to}
                    icon={l.icon}
                    label={l.label}
                    onSelect={() => go(l.to)}
                  />
                ))}
              </Section>
            )}
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

function Section({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="mb-1 last:mb-0">
      <p className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
        {label}
      </p>
      {children}
    </div>
  )
}

function ResultRow({
  icon: Icon,
  label,
  onSelect,
}: {
  icon: ComponentType<{ className?: string }>
  label: string
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left text-sm outline-none",
        "hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent focus-visible:text-accent-foreground",
      )}
    >
      <Icon className="size-4 shrink-0 text-muted-foreground" />
      <span className="truncate">{label}</span>
    </button>
  )
}
