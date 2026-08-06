import { cn } from "@/lib/utils"

const SIZES = {
  sm: "size-7 text-[0.7rem]",
  md: "size-9 text-sm",
  lg: "size-14 text-lg",
  xl: "size-20 text-2xl",
} as const

/** Initials from a display name (first + last word). */
function nameInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return "?"
  const first = parts[0][0] ?? ""
  const last = parts.length > 1 ? (parts[parts.length - 1][0] ?? "") : ""
  return (first + last).toUpperCase() || "?"
}

/** Circular initials avatar, brand-tinted. Falls back to initials when no image. */
export function Avatar({
  name,
  src,
  size = "md",
  className,
}: {
  name: string
  src?: string | null
  size?: keyof typeof SIZES
  className?: string
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/10 font-medium text-primary select-none",
        SIZES[size],
        className,
      )}
    >
      {src ? (
        <img src={src} alt="" className="size-full object-cover" />
      ) : (
        nameInitials(name)
      )}
    </span>
  )
}
