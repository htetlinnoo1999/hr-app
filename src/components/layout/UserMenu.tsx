import { Menu } from "@base-ui/react/menu"
import { useNavigate } from "react-router-dom"
import { LogOut, User } from "lucide-react"

import { useCurrentEmployee } from "@/hooks/useCurrentEmployee"
import { useAuthStore } from "@/stores/authStore"
import { initials } from "@/lib/format"
import { cn } from "@/lib/utils"

export function UserMenu() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const { employee } = useCurrentEmployee()

  const displayName =
    employee?.nickname?.trim() ||
    (employee
      ? `${employee.firstName} ${employee.lastName}`
      : (user?.email ?? "Account"))
  const acronym = initials(
    employee?.firstName,
    employee?.lastName,
    user?.email,
  )

  return (
    <Menu.Root>
      <Menu.Trigger
        className={cn(
          "flex size-9 items-center justify-center overflow-hidden rounded-full bg-primary text-sm font-semibold text-primary-foreground",
          "outline-none transition-shadow focus-visible:ring-3 focus-visible:ring-ring/50",
          "hover:opacity-90"
        )}
        aria-label="Open account menu"
      >
        {employee?.profilePicture ? (
          <img
            src={employee.profilePicture}
            alt={displayName}
            className="size-full object-cover"
          />
        ) : (
          acronym
        )}
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner side="bottom" align="end" sideOffset={8} className="z-50">
          <Menu.Popup
            className={cn(
              "min-w-56 origin-(--transform-origin) rounded-xl border border-border bg-popover p-1 text-popover-foreground shadow-lg outline-none",
              "transition-[transform,opacity] data-starting-style:scale-95 data-starting-style:opacity-0"
            )}
          >
            <div className="px-3 py-2">
              <p className="truncate text-sm font-medium">{displayName}</p>
              <p className="truncate text-xs text-muted-foreground">
                {user?.email}
              </p>
              {user && (
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {user.role}
                </p>
              )}
            </div>
            <Menu.Separator className="my-1 h-px bg-border" />
            <Menu.Item
              onClick={() => navigate("/profile")}
              className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm outline-none data-highlighted:bg-muted"
            >
              <User className="size-4" />
              View profile
            </Menu.Item>
            <Menu.Item
              onClick={logout}
              className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm text-destructive outline-none data-highlighted:bg-destructive/10"
            >
              <LogOut className="size-4" />
              Sign out
            </Menu.Item>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  )
}
