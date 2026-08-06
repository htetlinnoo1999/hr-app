import { NavLink } from "react-router-dom"
import {
  Briefcase,
  Building2,
  CalendarDays,
  CalendarRange,
  LayoutDashboard,
  Layers,
  PanelLeftClose,
  PanelLeft,
  Receipt,
  Users,
} from "lucide-react"
import type { ComponentType } from "react"

import { cn } from "@/lib/utils"
import { canManageOrganizations } from "@/lib/constants"
import { useAuthStore } from "@/stores/authStore"
import { useUiStore } from "@/stores/uiStore"
import { Button } from "@/components/ui/button"

interface NavItem {
  to: string
  label: string
  icon: ComponentType<{ className?: string }>
  /** Match this route exactly (so a parent isn't highlighted by its children). */
  end?: boolean
}

interface NavGroup {
  /** Section heading; omitted for the top-level group. */
  label?: string
  items: NavItem[]
}

const NAV_GROUPS: NavGroup[] = [
  {
    items: [{ to: "/dashboard", label: "Dashboard", icon: LayoutDashboard }],
  },
  {
    label: "People",
    items: [
      { to: "/employees", label: "Employees", icon: Users },
      { to: "/departments", label: "Departments", icon: Layers },
      { to: "/end-clients", label: "End clients", icon: Briefcase },
    ],
  },
  {
    label: "Time off",
    items: [
      { to: "/leave", label: "Leave", icon: CalendarDays, end: true },
      { to: "/leave/calendar", label: "Leave calendar", icon: CalendarRange },
    ],
  },
  {
    label: "Expenses",
    items: [
      { to: "/reimbursements", label: "Reimbursements", icon: Receipt },
    ],
  },
]

export function Sidebar() {
  const collapsed = useUiStore((s) => s.sidebarCollapsed)
  const toggle = useUiStore((s) => s.toggleSidebar)
  const user = useAuthStore((s) => s.user)

  const groups = [...NAV_GROUPS]
  if (canManageOrganizations(user)) {
    groups.push({
      label: "Admin",
      items: [
        { to: "/organizations", label: "Organizations", icon: Building2 },
      ],
    })
  }

  return (
    <aside
      className={cn(
        "flex h-screen shrink-0 flex-col border-r border-border bg-sidebar text-sidebar-foreground transition-[width] duration-200",
        collapsed ? "w-16" : "w-60"
      )}
    >
      {/* Brand + collapse toggle */}
      <div
        className={cn(
          "flex h-14 items-center border-b border-border px-3",
          collapsed ? "justify-center" : "justify-between"
        )}
      >
        {!collapsed && (
          <span className="text-lg font-bold tracking-tight">Staffly</span>
        )}
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={toggle}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <PanelLeft /> : <PanelLeftClose />}
        </Button>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-4 overflow-y-auto p-2">
        {groups.map((group, i) => (
          <div key={group.label ?? `group-${i}`} className="space-y-1">
            {group.label &&
              (collapsed ? (
                // Divider stands in for the heading when there's no room for text.
                i > 0 && <div className="mx-2 my-2 h-px bg-sidebar-border" />
              ) : (
                <p className="px-3 pt-1 pb-0.5 text-xs font-medium tracking-wide text-sidebar-foreground/50 uppercase">
                  {group.label}
                </p>
              ))}
            {group.items.map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                title={collapsed ? label : undefined}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    collapsed && "justify-center px-0",
                    isActive
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
                  )
                }
              >
                <Icon className="size-4 shrink-0" />
                {!collapsed && <span>{label}</span>}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>
    </aside>
  )
}
