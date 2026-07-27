import { NavLink } from "react-router-dom"
import {
  Building2,
  CalendarDays,
  CalendarRange,
  Layers,
  PanelLeftClose,
  PanelLeft,
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

const NAV_ITEMS: NavItem[] = [
  { to: "/employees", label: "Employees", icon: Users },
  { to: "/departments", label: "Departments", icon: Layers },
  { to: "/leave", label: "Leave", icon: CalendarDays, end: true },
  { to: "/leave/calendar", label: "Leave calendar", icon: CalendarRange },
]

export function Sidebar() {
  const collapsed = useUiStore((s) => s.sidebarCollapsed)
  const toggle = useUiStore((s) => s.toggleSidebar)
  const user = useAuthStore((s) => s.user)

  const items = [...NAV_ITEMS]
  if (canManageOrganizations(user)) {
    items.push({ to: "/organizations", label: "Organizations", icon: Building2 })
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
      <nav className="flex-1 space-y-1 overflow-y-auto p-2">
        {items.map(({ to, label, icon: Icon, end }) => (
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
      </nav>
    </aside>
  )
}
