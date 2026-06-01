// Build an .ics calendar (all-day work events) from a parsed schedule.
import { createEvents, type DateArray, type EventAttributes } from 'ics'
import type { ParsedSchedule } from './schedule'

/** Day after [y, m, d] as a date triple — handles month/year rollover. */
function nextDay(y: number, m: number, d: number): DateArray {
  const dt = new Date(y, m - 1, d + 1)
  return [dt.getFullYear(), dt.getMonth() + 1, dt.getDate()]
}

export function buildIcs(s: ParsedSchedule, initials: string): string {
  const events: EventAttributes[] = s.days
    .filter((d) => d.status === 'work')
    .map((d) => ({
      // all-day event: date-only start with an exclusive next-day end
      start: [d.year, d.month, d.date] as DateArray,
      end: nextDay(d.year, d.month, d.date),
      title: d.role ? `근무 ${d.role}${d.sub ? ' (서브)' : ''}` : '근무',
      description: `${initials} · ${s.label}`,
      busyStatus: 'BUSY',
      calName: '대한항공 스케줄',
      productId: 'jisu-schedule',
    }))

  const { error, value } = createEvents(events)
  if (error) throw error
  return value ?? ''
}
