import { Breadcrumbs } from "@/components/layout/Breadcrumbs"
import { CommandPalette } from "@/components/layout/CommandPalette"
import { ThemeToggle } from "@/components/layout/ThemeToggle"
import { UserMenu } from "@/components/layout/UserMenu"

export function Topbar() {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-4 border-b border-border bg-background px-6">
      <Breadcrumbs />
      <div className="flex items-center gap-1.5">
        <CommandPalette />
        <ThemeToggle />
        <UserMenu />
      </div>
    </header>
  )
}
