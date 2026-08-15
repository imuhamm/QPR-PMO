export interface BarListItem {
  id: string
  label: string
  value: number
  tone?: 'neutral' | 'positive' | 'warning' | 'danger'
}

const BAR_TONE: Record<NonNullable<BarListItem['tone']>, string> = {
  neutral: 'bg-slate-400',
  positive: 'bg-emerald-500',
  warning: 'bg-amber-500',
  danger: 'bg-rose-500',
}

// Hand-rolled horizontal bar list — this app has no charting library
// (Schedule's own Gantt is built the same way, plain positioned divs), so
// distributions follow that precedent rather than introducing one.
export function BarList({ items, valueFormatter }: { items: BarListItem[]; valueFormatter?: (value: number) => string }) {
  const max = Math.max(...items.map((i) => i.value), 1)
  return (
    <ul className="space-y-1.5">
      {items.map((item) => (
        <li key={item.id} className="flex items-center gap-2 text-[11px]">
          <span className="w-24 shrink-0 truncate text-slate-600">{item.label}</span>
          <span className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
            <span
              className={`block h-full rounded-full ${BAR_TONE[item.tone ?? 'neutral']}`}
              style={{ width: `${Math.max((item.value / max) * 100, item.value > 0 ? 4 : 0)}%` }}
            />
          </span>
          <span className="w-8 shrink-0 text-right font-medium text-slate-700">
            {valueFormatter ? valueFormatter(item.value) : item.value}
          </span>
        </li>
      ))}
    </ul>
  )
}
