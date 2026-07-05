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

/**
 * One remark (RMK/비고 column) line for a day. The sheet writes these as
 *   "<targets/-joined> - <activity> (<related>)"  e.g. "ML/CH/JP - QA TRAINING (KN)"
 * targets are the people the note is about; related is the trailer in parens
 * (usually the trainer/instructor). `text` keeps the full raw line for display.
 */
export interface DayNote {
  text: string        // full raw line, e.g. "SL/CC/NH - LVL TRAINING (SE)"
  targets: string[]   // subject initials before the dash: ['SL','CC','NH']
  related?: string    // initial in trailing parens: 'SE'
}

/** Parse a raw RMK line into a structured note (targets / related / text). */
export function parseNote(raw: string): DayNote {
  const text = raw.replace(/\s+/g, ' ').trim()
  const targets: string[] = []
  // left side: 1-3 uppercase-letter initials, optionally many joined by "/", then a dash
  const m = text.match(/^([A-Z]{1,3}(?:\/[A-Z]{1,3})*)\s*-\s*/)
  if (m) {
    for (const t of m[1].split('/')) if (t) targets.push(t.toUpperCase())
  }
  // related: a trailing "(XX)" holding a pure-letter initial (skips "(VC 1325)" etc.)
  let related: string | undefined
  const rel = [...text.matchAll(/\(([A-Z]{1,3})\)/g)]
  if (rel.length) related = rel[rel.length - 1][1].toUpperCase()
  return { text, targets, related }
}

/** Does this note concern the viewer (as a subject or the related/trainer)? */
export function noteInvolves(n: DayNote, initials: string): boolean {
  const who = initials.trim().toUpperCase()
  return !!who && (n.targets.includes(who) || n.related === who)
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
  notes?: DayNote[]     // RMK/비고 column lines for this day (may be empty/undefined)
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
