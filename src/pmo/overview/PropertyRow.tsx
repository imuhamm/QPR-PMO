import type { ReactNode } from 'react'

export function PropertyRow({
  label,
  required,
  children,
}: {
  label: string
  required?: boolean
  children: ReactNode
}) {
  return (
    <div className="flex items-start gap-3 border-b border-slate-100 py-1.5 last:border-0">
      <div className="w-32 shrink-0 pt-1 text-[11px] font-medium text-slate-500">
        {label}
        {required && <span className="text-rose-500"> *</span>}
      </div>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  )
}

export function SectionHeading({ title }: { title: string }) {
  return (
    <h3 className="mb-1 mt-4 text-[11px] font-semibold uppercase tracking-wide text-slate-400 first:mt-0">
      {title}
    </h3>
  )
}
