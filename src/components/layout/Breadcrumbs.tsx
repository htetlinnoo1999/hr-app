import { Link, useLocation } from "react-router-dom"
import { ChevronRight } from "lucide-react"

/** Top-level section → display label. */
const SECTION_LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  employees: "Employees",
  departments: "Departments",
  "end-clients": "End clients",
  leave: "Leave",
  reimbursements: "Reimbursements",
  organizations: "Organizations",
  profile: "My profile",
}

/** Known non-id sub-segments → label. Anything else is treated as an id. */
const NAMED_SEGMENTS: Record<string, string> = {
  new: "New",
  edit: "Edit",
  calendar: "Calendar",
}

interface Crumb {
  label: string
  /** Present on ancestor crumbs (links); omitted on the current page. */
  to?: string
}

/** Build breadcrumb trail from the pathname, collapsing bare id segments. */
function buildCrumbs(pathname: string): Crumb[] {
  const segments = pathname.split("/").filter(Boolean)
  if (segments.length === 0) return []

  const [section, ...rest] = segments
  const crumbs: Crumb[] = [
    { label: SECTION_LABELS[section] ?? section, to: `/${section}` },
  ]

  rest.forEach((seg, i) => {
    const isLast = i === rest.length - 1
    const named = NAMED_SEGMENTS[seg]
    if (named) crumbs.push({ label: named })
    // A trailing id (e.g. /employees/:id) reads as "Details"; an id followed
    // by more (e.g. /:id/edit) is dropped so we show "Employees › Edit".
    else if (isLast) crumbs.push({ label: "Details" })
  })

  // The last crumb is the current page — strip its link.
  const last = crumbs[crumbs.length - 1]
  crumbs[crumbs.length - 1] = { label: last.label }
  return crumbs
}

export function Breadcrumbs() {
  const { pathname } = useLocation()
  const crumbs = buildCrumbs(pathname)
  if (crumbs.length === 0) return null

  return (
    <nav aria-label="Breadcrumb" className="hidden items-center gap-1.5 text-sm sm:flex">
      {crumbs.map((crumb, i) => {
        const isLast = i === crumbs.length - 1
        return (
          <span key={`${crumb.label}-${i}`} className="flex items-center gap-1.5">
            {i > 0 && (
              <ChevronRight className="size-3.5 text-muted-foreground/50" />
            )}
            {crumb.to && !isLast ? (
              <Link
                to={crumb.to}
                className="text-muted-foreground transition-colors hover:text-foreground"
              >
                {crumb.label}
              </Link>
            ) : (
              <span
                className={
                  isLast ? "font-medium text-foreground" : "text-muted-foreground"
                }
              >
                {crumb.label}
              </span>
            )}
          </span>
        )
      })}
    </nav>
  )
}
