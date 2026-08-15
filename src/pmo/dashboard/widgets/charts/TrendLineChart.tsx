export interface TrendSeries {
  id: string
  label: string
  /** CSS color value (SVG `stroke` needs a real color, not a Tailwind class). */
  color: string
  values: number[]
}

const VIEWBOX_WIDTH = 300
const PADDING = 4

// Hand-rolled SVG line chart — same "no charting library, build it like
// Gantt does" precedent as BarList. Series share one set of x categories
// (`periods`); a small dot-legend and the first/last period labels sit
// underneath so the chart still reads without hovering anything.
export function TrendLineChart({ series, periods, height = 72 }: { series: TrendSeries[]; periods: string[]; height?: number }) {
  const allValues = series.flatMap((s) => s.values)
  const min = Math.min(...allValues, 0)
  const max = Math.max(...allValues, 1)
  const range = max - min || 1
  const stepX = periods.length > 1 ? (VIEWBOX_WIDTH - PADDING * 2) / (periods.length - 1) : 0
  const scaleY = (v: number) => height - PADDING - ((v - min) / range) * (height - PADDING * 2)

  return (
    <div>
      <svg viewBox={`0 0 ${VIEWBOX_WIDTH} ${height}`} className="w-full" style={{ height }} preserveAspectRatio="none">
        <line x1={PADDING} y1={height - PADDING} x2={VIEWBOX_WIDTH - PADDING} y2={height - PADDING} stroke="#e2e8f0" strokeWidth={1} />
        {series.map((s) => (
          <polyline
            key={s.id}
            points={s.values.map((v, i) => `${PADDING + i * stepX},${scaleY(v)}`).join(' ')}
            fill="none"
            stroke={s.color}
            strokeWidth={1.75}
          />
        ))}
      </svg>
      <div className="mt-1 flex items-center justify-between text-[10px] text-slate-400">
        <span>{periods[0]}</span>
        <span>{periods[periods.length - 1]}</span>
      </div>
      <div className="mt-1 flex items-center gap-3">
        {series.map((s) => (
          <span key={s.id} className="flex items-center gap-1 text-[10px] text-slate-500">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: s.color }} />
            {s.label}
          </span>
        ))}
      </div>
    </div>
  )
}
