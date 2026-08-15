import { useRef, useState } from 'react'
import type { UIEvent } from 'react'
import type { ActivityRow, DerivedRange, DisplayRow, ScheduleRow } from './scheduleData'
import { addCalendarDays, daysBetween } from './scheduleData'
import { PredecessorEditor } from './PredecessorEditor'

export type Granularity = 'week' | 'month' | 'quarter'

const MS_PER_DAY = 86_400_000

function addDays(d: Date, days: number): Date {
  return new Date(d.getTime() + days * MS_PER_DAY)
}

function daysFrom(min: Date, iso: string): number {
  return Math.round((new Date(iso).getTime() - min.getTime()) / MS_PER_DAY)
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function startOfWeek(d: Date): Date {
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  const res = new Date(d.getFullYear(), d.getMonth(), d.getDate() + diff)
  return res
}

function startOfQuarterMonth(d: Date): Date {
  return new Date(d.getFullYear(), Math.floor(d.getMonth() / 3) * 3, 1)
}

interface Segment {
  label: string
  x: number
  width: number
}

function buildSegments(min: Date, max: Date, pxPerDay: number, granularity: Granularity): Segment[] {
  const segments: Segment[] = []
  const rangeEndExclusive = addDays(max, 1)

  if (granularity === 'week') {
    let cursor = startOfWeek(min)
    while (cursor < rangeEndExclusive) {
      const next = addDays(cursor, 7)
      const segStart = cursor < min ? min : cursor
      const segEndExclusive = next < rangeEndExclusive ? next : rangeEndExclusive
      const x = daysFrom(min, segStart.toISOString()) * pxPerDay
      const width = Math.round((segEndExclusive.getTime() - segStart.getTime()) / MS_PER_DAY) * pxPerDay
      segments.push({ label: segStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), x, width })
      cursor = next
    }
    return segments
  }

  if (granularity === 'quarter') {
    let cursor = startOfQuarterMonth(min)
    while (cursor < rangeEndExclusive) {
      const next = new Date(cursor.getFullYear(), cursor.getMonth() + 3, 1)
      const segStart = cursor < min ? min : cursor
      const segEndExclusive = next < rangeEndExclusive ? next : rangeEndExclusive
      const x = daysFrom(min, segStart.toISOString()) * pxPerDay
      const width = Math.round((segEndExclusive.getTime() - segStart.getTime()) / MS_PER_DAY) * pxPerDay
      const q = Math.floor(cursor.getMonth() / 3) + 1
      segments.push({ label: `Q${q} ${cursor.getFullYear()}`, x, width })
      cursor = next
    }
    return segments
  }

  // month
  let cursor = new Date(min.getFullYear(), min.getMonth(), 1)
  while (cursor < rangeEndExclusive) {
    const next = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1)
    const segStart = cursor < min ? min : cursor
    const segEndExclusive = next < rangeEndExclusive ? next : rangeEndExclusive
    const x = daysFrom(min, segStart.toISOString()) * pxPerDay
    const width = Math.round((segEndExclusive.getTime() - segStart.getTime()) / MS_PER_DAY) * pxPerDay
    segments.push({ label: cursor.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }), x, width })
    cursor = next
  }
  return segments
}

interface ConnectorGeometry {
  x1: number
  x2: number
  y: number
}

interface Connector {
  connId: string
  predecessorId: string
  dependentId: string
  pred: ConnectorGeometry
  dep: ConnectorGeometry
}

type DragKind = 'move' | 'resize-start' | 'resize-end' | 'milestone'

interface DragState {
  rowId: string
  kind: DragKind
  originalStart?: string
  originalEnd?: string
  originalDate?: string
  deltaDays: number
  invalidReason: string | null
  rejected: boolean
}

export function GanttChart({
  rows,
  allRows,
  minDate,
  maxDate,
  rowHeight,
  pxPerDay,
  granularity,
  scrollRef,
  onScroll,
  selectedId,
  onSelectRow,
  phaseDates,
  onSetPredecessor,
  onRemovePredecessor,
  onRescheduleActivity,
  onRescheduleMilestone,
  justRescheduledIds,
}: {
  rows: DisplayRow[]
  allRows: ScheduleRow[]
  minDate: Date
  maxDate: Date
  rowHeight: number
  pxPerDay: number
  granularity: Granularity
  scrollRef: React.RefObject<HTMLDivElement | null>
  onScroll: (e: UIEvent<HTMLDivElement>) => void
  selectedId: string | null
  onSelectRow: (id: string) => void
  phaseDates: Record<string, DerivedRange | null>
  onSetPredecessor: (dependentId: string, predecessorId: string) => void
  onRemovePredecessor: (dependentId: string) => void
  onRescheduleActivity: (
    id: string,
    previous: { start?: string; end?: string },
    next: { start: string; end: string },
  ) => void
  onRescheduleMilestone: (id: string, previousDate: string | undefined, nextDate: string) => void
  justRescheduledIds: Set<string>
}) {
  const [openConnectorId, setOpenConnectorId] = useState<string | null>(null)
  const [drag, setDrag] = useState<DragState | null>(null)
  const rejectTimeoutRef = useRef<number | null>(null)

  const startActivityDrag = (row: ActivityRow, kind: DragKind, e: React.MouseEvent) => {
    if (e.button !== 0) return
    e.preventDefault()
    if (rejectTimeoutRef.current) window.clearTimeout(rejectTimeoutRef.current)
    const startClientX = e.clientX
    const originalStart = row.start
    const originalEnd = row.end
    setDrag({ rowId: row.id, kind, originalStart, originalEnd, deltaDays: 0, invalidReason: null, rejected: false })

    const handleMove = (ev: MouseEvent) => {
      const deltaDays = Math.round((ev.clientX - startClientX) / pxPerDay)
      let invalidReason: string | null = null
      if (kind === 'resize-start' && originalStart && originalEnd) {
        const proposedStart = addCalendarDays(originalStart, deltaDays)
        if (proposedStart > originalEnd) invalidReason = 'Start must be on or before Finish'
      }
      if (kind === 'resize-end' && originalStart && originalEnd) {
        const proposedEnd = addCalendarDays(originalEnd, deltaDays)
        if (proposedEnd < originalStart) invalidReason = 'Finish must be on or after Start'
      }
      setDrag((prev) => (prev ? { ...prev, deltaDays, invalidReason } : prev))
    }

    const handleUp = () => {
      window.removeEventListener('mousemove', handleMove)
      window.removeEventListener('mouseup', handleUp)
      setDrag((current) => {
        if (!current) return null
        if (current.invalidReason) {
          rejectTimeoutRef.current = window.setTimeout(() => setDrag(null), 900)
          return { ...current, rejected: true }
        }
        if (originalStart && originalEnd) {
          let nextStart = originalStart
          let nextEnd = originalEnd
          if (kind === 'move') {
            nextStart = addCalendarDays(originalStart, current.deltaDays)
            nextEnd = addCalendarDays(originalEnd, current.deltaDays)
          } else if (kind === 'resize-start') {
            nextStart = addCalendarDays(originalStart, current.deltaDays)
          } else if (kind === 'resize-end') {
            nextEnd = addCalendarDays(originalEnd, current.deltaDays)
          }
          if (current.deltaDays !== 0) {
            onRescheduleActivity(row.id, { start: originalStart, end: originalEnd }, { start: nextStart, end: nextEnd })
          }
        }
        return null
      })
    }

    window.addEventListener('mousemove', handleMove)
    window.addEventListener('mouseup', handleUp)
  }

  const startMilestoneDrag = (row: { id: string; date?: string }, e: React.MouseEvent) => {
    if (e.button !== 0) return
    e.preventDefault()
    if (rejectTimeoutRef.current) window.clearTimeout(rejectTimeoutRef.current)
    const startClientX = e.clientX
    const originalDate = row.date
    setDrag({ rowId: row.id, kind: 'milestone', originalDate, deltaDays: 0, invalidReason: null, rejected: false })

    const handleMove = (ev: MouseEvent) => {
      const deltaDays = Math.round((ev.clientX - startClientX) / pxPerDay)
      setDrag((prev) => (prev ? { ...prev, deltaDays } : prev))
    }

    const handleUp = () => {
      window.removeEventListener('mousemove', handleMove)
      window.removeEventListener('mouseup', handleUp)
      setDrag((current) => {
        if (!current) return null
        if (originalDate && current.deltaDays !== 0) {
          onRescheduleMilestone(row.id, originalDate, addCalendarDays(originalDate, current.deltaDays))
        }
        return null
      })
    }

    window.addEventListener('mousemove', handleMove)
    window.addEventListener('mouseup', handleUp)
  }

  const totalDays = daysBetween(minDate.toISOString(), maxDate.toISOString())
  const totalWidth = totalDays * pxPerDay
  const segments = buildSegments(minDate, maxDate, pxPerDay, granularity)
  const bodyHeight = rows.length * rowHeight

  // Connectors only span rows currently visible in this pane (both endpoints
  // must be rendered) — geometry keyed by index in the same `rows` array
  // the bars below are drawn from, so nothing can drift out of alignment.
  const activityGeometry: Record<string, ConnectorGeometry> = {}
  rows.forEach((row, idx) => {
    if (row.kind === 'activity' && row.start && row.end) {
      const x1 = daysFrom(minDate, row.start) * pxPerDay
      const width = Math.max((row.durationDays ?? 1) * pxPerDay, 6)
      activityGeometry[row.id] = { x1, x2: x1 + width, y: idx * rowHeight + rowHeight / 2 }
    }
  })

  const connectors: Connector[] = []
  rows.forEach((row) => {
    if (row.kind !== 'activity' || !row.predecessorId) return
    const pred = activityGeometry[row.predecessorId]
    const dep = activityGeometry[row.id]
    if (!pred || !dep) return
    connectors.push({ connId: `${row.predecessorId}->${row.id}`, predecessorId: row.predecessorId, dependentId: row.id, pred, dep })
  })

  const openConnector = connectors.find((c) => c.connId === openConnectorId)
  const openDependent = openConnector
    ? (allRows.find((r) => r.id === openConnector.dependentId) as ActivityRow | undefined)
    : undefined

  return (
    <div ref={scrollRef} onScroll={onScroll} className="h-full flex-1 overflow-auto">
      <div style={{ width: totalWidth, minWidth: '100%' }} className="relative">
        <div style={{ height: rowHeight }} className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50">
          {segments.map((seg, i) => (
            <div
              key={`${seg.label}-${seg.x}`}
              style={{ position: 'absolute', left: seg.x, width: seg.width, height: rowHeight }}
              className={`flex items-center truncate border-l border-slate-200 px-1.5 text-[11px] font-semibold text-slate-500 ${
                i % 2 === 1 ? 'bg-slate-100/60' : ''
              }`}
            >
              {seg.label}
            </div>
          ))}
        </div>

        <div className="relative">
          {rows.map((row) => {
            const isSelected = row.id === selectedId

            if (row.kind === 'add-row') {
              return <div key={row.id} style={{ height: rowHeight }} className="border-b border-slate-100" />
            }

            if (row.kind === 'phase') {
              const range = phaseDates[row.id] ?? null
              if (!range) {
                return <div key={row.id} style={{ height: rowHeight }} className="border-b border-slate-100" />
              }
              const left = daysFrom(minDate, range.start) * pxPerDay
              const width = Math.max(range.durationDays * pxPerDay, 6)
              return (
                <div
                  key={row.id}
                  style={{ height: rowHeight }}
                  onClick={() => onSelectRow(row.id)}
                  className={`relative border-b border-slate-100 ${isSelected ? 'bg-blue-50' : 'hover:bg-slate-50/60'}`}
                >
                  {/* Summary bracket: thin bar with end caps spanning derived child range. */}
                  <div
                    style={{ left, width, top: rowHeight / 2 - 3 }}
                    className="absolute h-1.5 rounded-sm bg-slate-600"
                    title={`${row.name}: ${range.start} → ${range.end}`}
                  />
                  <div style={{ left, top: rowHeight / 2 - 3 }} className="absolute h-2.5 w-0.5 bg-slate-600" />
                  <div style={{ left: left + width - 2, top: rowHeight / 2 - 3 }} className="absolute h-2.5 w-0.5 bg-slate-600" />
                </div>
              )
            }

            const isUnscheduled =
              (row.kind === 'activity' && (!row.start || !row.end)) || (row.kind === 'milestone' && !row.date)

            if (isUnscheduled) {
              return (
                <div
                  key={row.id}
                  style={{ height: rowHeight }}
                  onClick={() => onSelectRow(row.id)}
                  className={`flex items-center border-b border-slate-100 ${isSelected ? 'bg-blue-50' : 'hover:bg-slate-50/60'}`}
                >
                  <span
                    title="No dates set yet"
                    className="sticky left-1 inline-flex items-center rounded border border-dashed border-slate-300 bg-slate-50 px-1.5 py-0.5 text-[10px] italic text-slate-400"
                  >
                    Unscheduled
                  </span>
                </div>
              )
            }

            if (row.kind === 'milestone') {
              const left = daysFrom(minDate, row.date!) * pxPerDay
              const isDragging = drag?.rowId === row.id
              const ghostDate = isDragging && drag.originalDate ? addCalendarDays(drag.originalDate, drag.deltaDays) : null
              const ghostLeft = ghostDate ? daysFrom(minDate, ghostDate) * pxPerDay : left
              return (
                <div
                  key={row.id}
                  style={{ height: rowHeight }}
                  onClick={() => onSelectRow(row.id)}
                  className={`relative border-b border-slate-100 ${isSelected ? 'bg-blue-50' : 'hover:bg-slate-50/60'}`}
                >
                  <div
                    onMouseDown={(e) => startMilestoneDrag(row, e)}
                    style={{ left: left - 5, top: rowHeight / 2 - 5 }}
                    className={`absolute h-2.5 w-2.5 rotate-45 cursor-grab bg-amber-500 hover:bg-amber-600 active:cursor-grabbing ${
                      isDragging ? 'opacity-30' : ''
                    } ${justRescheduledIds.has(row.id) ? 'ring-2 ring-emerald-400' : ''}`}
                    title={!isDragging ? `${row.name} — ${row.date}` : undefined}
                  />
                  {isDragging && ghostDate && (
                    <>
                      <div
                        style={{ left: ghostLeft - 5, top: rowHeight / 2 - 5 }}
                        className="absolute h-2.5 w-2.5 rotate-45 border-2 border-dashed border-amber-700 bg-amber-200/70"
                      />
                      <div
                        style={{ left: ghostLeft, top: rowHeight / 2 - 22 }}
                        className="absolute whitespace-nowrap rounded bg-slate-800 px-1.5 py-0.5 text-[10px] font-medium text-white shadow"
                      >
                        {fmtDate(ghostDate)}
                      </div>
                    </>
                  )}
                </div>
              )
            }

            const left = daysFrom(minDate, row.start!) * pxPerDay
            const width = Math.max((row.durationDays ?? 1) * pxPerDay, 6)
            const isDragging = drag?.rowId === row.id
            let ghostStart: string | null = null
            let ghostEnd: string | null = null
            if (isDragging && drag.originalStart && drag.originalEnd) {
              ghostStart = drag.originalStart
              ghostEnd = drag.originalEnd
              if (drag.kind === 'move') {
                ghostStart = addCalendarDays(drag.originalStart, drag.deltaDays)
                ghostEnd = addCalendarDays(drag.originalEnd, drag.deltaDays)
              } else if (drag.kind === 'resize-start') {
                ghostStart = addCalendarDays(drag.originalStart, drag.deltaDays)
              } else if (drag.kind === 'resize-end') {
                ghostEnd = addCalendarDays(drag.originalEnd, drag.deltaDays)
              }
            }
            const ghostLeft = ghostStart ? daysFrom(minDate, ghostStart) * pxPerDay : left
            const ghostWidth = ghostStart && ghostEnd ? Math.max(daysBetween(ghostStart, ghostEnd) * pxPerDay, 6) : width
            const invalid = isDragging ? drag.invalidReason : null

            return (
              <div
                key={row.id}
                style={{ height: rowHeight }}
                onClick={() => onSelectRow(row.id)}
                className={`relative border-b border-slate-100 ${isSelected ? 'bg-blue-50' : 'hover:bg-slate-50/60'}`}
              >
                <div
                  onMouseDown={(e) => startActivityDrag(row, 'move', e)}
                  style={{ left, width, top: rowHeight / 2 - 6 }}
                  className={`group absolute h-3 cursor-grab rounded-sm bg-blue-500 active:cursor-grabbing ${
                    isDragging ? 'opacity-30' : 'hover:bg-blue-600'
                  } ${justRescheduledIds.has(row.id) ? 'ring-2 ring-emerald-400' : ''}`}
                  title={!isDragging ? `${row.name}: ${row.start} → ${row.end}` : undefined}
                >
                  <div
                    onMouseDown={(e) => {
                      e.stopPropagation()
                      startActivityDrag(row, 'resize-start', e)
                    }}
                    className="absolute left-0 top-0 h-full w-1.5 cursor-col-resize bg-blue-800 opacity-0 group-hover:opacity-100"
                  />
                  <div
                    onMouseDown={(e) => {
                      e.stopPropagation()
                      startActivityDrag(row, 'resize-end', e)
                    }}
                    className="absolute right-0 top-0 h-full w-1.5 cursor-col-resize bg-blue-800 opacity-0 group-hover:opacity-100"
                  />
                </div>

                {isDragging && ghostStart && ghostEnd && (
                  <>
                    <div
                      style={{ left: ghostLeft, width: ghostWidth, top: rowHeight / 2 - 6 }}
                      className={`absolute h-3 rounded-sm border-2 border-dashed ${
                        invalid ? 'border-rose-600 bg-rose-200/70' : 'border-blue-800 bg-blue-300/70'
                      }`}
                    />
                    <div
                      style={{ left: ghostLeft, top: rowHeight / 2 - 22 }}
                      className={`absolute whitespace-nowrap rounded px-1.5 py-0.5 text-[10px] font-medium text-white shadow ${
                        invalid ? 'bg-rose-600' : 'bg-slate-800'
                      }`}
                    >
                      {invalid ?? `${fmtDate(ghostStart)} → ${fmtDate(ghostEnd)} · ${daysBetween(ghostStart, ghostEnd)}d`}
                    </div>
                  </>
                )}
              </div>
            )
          })}

          {/* Dependency connectors — rendered above the bars but pointer-events-none
              by default, so only the connector strokes themselves are clickable. */}
          <svg
            className="pointer-events-none absolute left-0 top-0 z-[5]"
            width={totalWidth}
            height={bodyHeight}
            aria-hidden="true"
          >
            {connectors.map((conn) => {
              const selected = conn.connId === openConnectorId
              const jogX = conn.pred.x2 + 10
              const arrowTipX = conn.dep.x1
              const d = `M ${conn.pred.x2} ${conn.pred.y} H ${jogX} V ${conn.dep.y} H ${arrowTipX - 5}`
              const stroke = selected ? '#2563eb' : '#94a3b8'
              return (
                <g
                  key={conn.connId}
                  onClick={(e) => {
                    e.stopPropagation()
                    setOpenConnectorId(conn.connId)
                  }}
                  style={{ cursor: 'pointer' }}
                >
                  <path d={d} fill="none" stroke="transparent" strokeWidth={8} pointerEvents="stroke" />
                  <path d={d} fill="none" stroke={stroke} strokeWidth={selected ? 2 : 1.5} pointerEvents="none" />
                  <polygon
                    points={`${arrowTipX},${conn.dep.y} ${arrowTipX - 5},${conn.dep.y - 3} ${arrowTipX - 5},${conn.dep.y + 3}`}
                    fill={stroke}
                    pointerEvents="none"
                  />
                </g>
              )
            })}
          </svg>

          {openConnector && openDependent && (
            <div
              className="absolute z-30"
              style={{
                left: (openConnector.pred.x2 + openConnector.dep.x1) / 2 - 128,
                top: Math.min(openConnector.pred.y, openConnector.dep.y) + 14,
              }}
            >
              <PredecessorEditor
                rows={allRows}
                activity={openDependent}
                onSelect={(id) => {
                  onSetPredecessor(openDependent.id, id)
                  setOpenConnectorId(null)
                }}
                onRemove={() => {
                  onRemovePredecessor(openDependent.id)
                  setOpenConnectorId(null)
                }}
                onClose={() => setOpenConnectorId(null)}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
