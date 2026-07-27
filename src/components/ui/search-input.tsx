import type { ComponentProps } from "react"
import { Search } from "lucide-react"

import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

/** Input with a leading search icon. Same props as Input. */
export function SearchInput({ className, ...props }: ComponentProps<"input">) {
  return (
    <div className="relative">
      <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input className={cn("pl-8", className)} type="search" {...props} />
    </div>
  )
}
