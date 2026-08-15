// SVG stroke/fill need real color values, not Tailwind classes — these are
// the hex equivalents of the Tailwind shades already used everywhere else
// in this app (blue-600, slate-400, emerald-600, rose-600), kept in one
// place so every chart widget stays visually consistent.
export const CHART_COLORS = {
  blue: '#2563eb',
  slate: '#94a3b8',
  emerald: '#059669',
  rose: '#e11d48',
  amber: '#d97706',
} as const
