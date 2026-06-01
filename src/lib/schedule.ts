// Shared types + constants for the schedule domain.

/** Role/position columns in the work schedule, left-to-right. */
export const ROLE_COLS = [
  'MOD', 'O', 'T', 'C1', 'C2', 'R1', 'R2', 'I/B1', 'I/B2', 'FL',
] as const

export type Role = (typeof ROLE_COLS)[number]

/** One role's assignment on a given day. */
export interface RosterEntry {
  role: Role
  main?: string   // primary agent initials
  sub?: string    // sub-assistant initials (was in parentheses)
}

/** One day of the schedule (for everyone), with the viewer's own slot resolved. */
export interface DaySchedule {
  year: number          // actual year of this date (handles adjacent months)
  month: number         // actual month (1..12)
  date: number          // day of month (1..31)
  weekday: string       // 'Mon'..'Sun' ('' if undetected)
  status: 'work' | 'off' // for the viewer (my initials)
  role?: Role           // my assigned position when working
  sub?: boolean         // I'm a sub-assistant
  roster: RosterEntry[] // full team assignment that day
}

/** Whole parsed sheet for one viewer. */
export interface ParsedSchedule {
  year: number          // anchor (title) month
  month: number         // 1..12
  label: string         // e.g. "Jun 2026"
  days: DaySchedule[]
}

/** A positioned text token extracted from the PDF (top-left origin). */
export interface Token {
  str: string
  xc: number   // x center
  yTop: number // y from top of page
}

/** Per-role colour styling (full literal class names so Tailwind picks them up). */
export const ROLE_STYLE: Record<Role, { pill: string; dot: string }> = {
  'MOD':  { pill: 'bg-rose-100 text-rose-700',       dot: 'bg-rose-400' },
  'O':    { pill: 'bg-orange-100 text-orange-700',   dot: 'bg-orange-400' },
  'T':    { pill: 'bg-amber-100 text-amber-700',     dot: 'bg-amber-400' },
  'C1':   { pill: 'bg-lime-100 text-lime-700',       dot: 'bg-lime-500' },
  'C2':   { pill: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500' },
  'R1':   { pill: 'bg-teal-100 text-teal-700',       dot: 'bg-teal-500' },
  'R2':   { pill: 'bg-cyan-100 text-cyan-700',       dot: 'bg-cyan-500' },
  'I/B1': { pill: 'bg-blue-100 text-blue-700',       dot: 'bg-blue-500' },
  'I/B2': { pill: 'bg-indigo-100 text-indigo-700',   dot: 'bg-indigo-500' },
  'FL':   { pill: 'bg-violet-100 text-violet-700',   dot: 'bg-violet-500' },
}
