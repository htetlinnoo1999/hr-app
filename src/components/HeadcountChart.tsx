import { useState } from "react"

import type { MonthlyHeadcount } from "@/apis/employees"

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
]

/** Round a value up to a "nice" axis maximum (2/5/10 × power of ten). */
function niceCeil(v: number): number {
  if (v <= 5) return 5
  const pow = Math.pow(10, Math.floor(Math.log10(v)))
  const n = v / pow
  const step = n <= 2 ? 2 : n <= 5 ? 5 : 10
  return step * pow
}

// Fixed coordinate space; the SVG scales to its container via viewBox.
const W = 760
const H = 260
const PAD = { l: 36, r: 16, t: 16, b: 28 }
const PLOT_W = W - PAD.l - PAD.r
const PLOT_H = H - PAD.t - PAD.b
const BASELINE = PAD.t + PLOT_H

/**
 * Single-series line + area chart of cumulative month-end headcount. One hue
 * (brand); the title names the series so no legend is needed. Hovering a month
 * band reveals a crosshair and tooltip.
 */
export function HeadcountChart({ data }: { data: MonthlyHeadcount[] }) {
  const [hover, setHover] = useState<number | null>(null)

  // Normalize to 12 points, carrying the cumulative value forward over gaps.
  const byMonth = new Map(data.map((d) => [d.month, d.count]))
  const counts: number[] = []
  let running = 0
  for (let m = 1; m <= 12; m++) {
    const v = byMonth.get(m)
    if (v != null) running = v
    counts.push(running)
  }

  const yMax = niceCeil(Math.max(...counts, 0))
  const x = (i: number) => PAD.l + (i / 11) * PLOT_W
  const y = (v: number) => PAD.t + PLOT_H - (v / yMax) * PLOT_H

  const line = counts
    .map((c, i) => `${i === 0 ? "M" : "L"} ${x(i).toFixed(1)} ${y(c).toFixed(1)}`)
    .join(" ")
  const area = `${line} L ${x(11).toFixed(1)} ${BASELINE} L ${x(0).toFixed(1)} ${BASELINE} Z`
  const ticks = [0, yMax / 2, yMax]
  const band = PLOT_W / 11

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full"
      role="img"
      aria-label={`Cumulative monthly headcount, ending at ${counts[11]}`}
      onMouseLeave={() => setHover(null)}
    >
      {/* Gridlines + y-axis labels */}
      {ticks.map((t) => (
        <g key={t}>
          <line
            x1={PAD.l}
            x2={W - PAD.r}
            y1={y(t)}
            y2={y(t)}
            stroke="var(--border)"
            strokeWidth={1}
          />
          <text
            x={PAD.l - 8}
            y={y(t)}
            textAnchor="end"
            dominantBaseline="middle"
            fontSize={11}
            fill="var(--muted-foreground)"
          >
            {t}
          </text>
        </g>
      ))}

      <path d={area} fill="var(--primary)" fillOpacity={0.1} />
      <path
        d={line}
        fill="none"
        stroke="var(--primary)"
        strokeWidth={2}
        strokeLinejoin="round"
        strokeLinecap="round"
      />

      {/* Month labels */}
      {counts.map((_, i) => (
        <text
          key={i}
          x={x(i)}
          y={H - 8}
          textAnchor="middle"
          fontSize={11}
          fill="var(--muted-foreground)"
        >
          {MONTHS[i]}
        </text>
      ))}

      {/* Latest-value endpoint dot */}
      <circle cx={x(11)} cy={y(counts[11])} r={3.5} fill="var(--primary)" />

      {/* Hover: crosshair + highlighted point + tooltip */}
      {hover !== null && (
        <g pointerEvents="none">
          <line
            x1={x(hover)}
            x2={x(hover)}
            y1={PAD.t}
            y2={BASELINE}
            stroke="var(--border)"
            strokeWidth={1}
          />
          <circle
            cx={x(hover)}
            cy={y(counts[hover])}
            r={4}
            fill="var(--primary)"
            stroke="var(--card)"
            strokeWidth={2}
          />
          <Tooltip
            cx={x(hover)}
            cy={y(counts[hover])}
            month={MONTHS[hover]}
            count={counts[hover]}
          />
        </g>
      )}

      {/* Transparent per-month hit bands */}
      {counts.map((_, i) => (
        <rect
          key={i}
          x={x(i) - band / 2}
          y={PAD.t}
          width={band}
          height={PLOT_H}
          fill="transparent"
          onMouseEnter={() => setHover(i)}
        />
      ))}
    </svg>
  )
}

function Tooltip({
  cx,
  cy,
  month,
  count,
}: {
  cx: number
  cy: number
  month: string
  count: number
}) {
  const w = 66
  const h = 36
  const tx = Math.max(4, Math.min(W - w - 4, cx - w / 2))
  const ty = Math.max(4, cy - h - 10)
  return (
    <g>
      <rect
        x={tx}
        y={ty}
        width={w}
        height={h}
        rx={6}
        fill="var(--popover)"
        stroke="var(--border)"
      />
      <text
        x={tx + w / 2}
        y={ty + 14}
        textAnchor="middle"
        fontSize={11}
        fill="var(--muted-foreground)"
      >
        {month}
      </text>
      <text
        x={tx + w / 2}
        y={ty + 28}
        textAnchor="middle"
        fontSize={13}
        fontWeight={600}
        fill="var(--popover-foreground)"
      >
        {count}
      </text>
    </g>
  )
}
