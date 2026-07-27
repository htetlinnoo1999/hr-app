import { UserMenu } from "@/components/layout/UserMenu"

export function Topbar() {
  return (
    <header className="flex h-14 shrink-0 items-center justify-end border-b border-border bg-background px-6">
      <UserMenu />
    </header>
  )
}
