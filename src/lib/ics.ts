// Build an .ics calendar (all-day work events) from a parsed schedule.
import { createEvents, type DateArray, type EventAttributes } from 'ics'
import { noteInvolves, type ParsedSchedule } from './schedule'

/** Day after [y, m, d] as a date triple — handles month/year rollover. */
function nextDay(y: number, m: number, d: number): DateArray {
  const dt = new Date(y, m - 1, d + 1)
  return [dt.getFullYear(), dt.getMonth() + 1, dt.getDate()]
}

export function buildIcs(s: ParsedSchedule, initials: string): string {
  const events: EventAttributes[] = s.days
    .filter((d) => d.status === 'work')
    .map((d) => {
      const myNotes = (d.notes ?? []).filter((n) => noteInvolves(n, initials))
      const base = `${initials} · ${s.label}`
      return {
        // all-day event: date-only start with an exclusive next-day end
        start: [d.year, d.month, d.date] as DateArray,
        end: nextDay(d.year, d.month, d.date),
        title: myNotes.length
          ? `근무 ${d.role ?? ''}★`.trim()
          : d.role
            ? `근무 ${d.role}${d.sub ? ' (서브)' : ''}`
            : '근무',
        description: myNotes.length
          ? `${base}\n📌 ${myNotes.map((n) => n.text).join('\n📌 ')}`
          : base,
        busyStatus: 'BUSY' as const,
        calName: '대한항공 스케줄',
        productId: 'jisu-schedule',
      }
    })

  const { error, value } = createEvents(events)
  if (error) throw error
  return value ?? ''
}
