import { Monitor, Moon, Sun } from "lucide-react"

import { Button } from "@/components/ui/button"
import type { Theme } from "@/lib/theme"
import { useUiStore } from "@/stores/uiStore"

const ICONS: Record<Theme, typeof Sun> = {
  light: Sun,
  dark: Moon,
  system: Monitor,
}

const LABELS: Record<Theme, string> = {
  light: "Light",
  dark: "Dark",
  system: "System",
}

/** Cycles light → dark → system. The icon reflects the current mode. */
export function ThemeToggle() {
  const theme = useUiStore((s) => s.theme)
  const cycle = useUiStore((s) => s.cycleTheme)
  const Icon = ICONS[theme]

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      onClick={cycle}
      aria-label={`Theme: ${LABELS[theme]}. Switch theme.`}
      title={`Theme: ${LABELS[theme]}`}
    >
      <Icon />
    </Button>
  )
}
