// Pure, framework-agnostic schedule extractor.
// Given positioned PDF tokens + the viewer's initials, reconstruct the full
// daily roster (all roles -> agents) and resolve the viewer's own slot,
// purely from column/row geometry. NO AI, NO network.

import {
  ROLE_COLS,
  parseNote,
  type Role,
  type DaySchedule,
  type DayNote,
  type RosterEntry,
  type Token,
} from './schedule'

const WD = new Set(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'])
const isDate = (s: string) => /^\d{1,2}$/.test(s)
const core = (s: string) => s.replace(/^\(/, '').replace(/\)$/, '').toUpperCase()

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
]

/** Detect month/year from the sheet title token like "Jun'2026". */
export function detectMonth(tokens: Token[]): { year: number; month: number; label: string } {
  const sorted = [...tokens].sort((a, b) => a.yTop - b.yTop)
  for (const t of sorted) {
    const m = t.str.match(/^([A-Za-z]{3})'?\s*'?(\d{2,4})$/)
    if (!m) continue
    const mi = MONTHS.findIndex((x) => x.toLowerCase() === m[1].toLowerCase())
    if (mi < 0) continue
    let y = parseInt(m[2], 10)
    if (y < 100) y += 2000
    return { year: y, month: mi + 1, label: `${MONTHS[mi]} ${y}` }
  }
  throw new Error('근무표에서 월/연도를 찾지 못했어요.')
}

function addMonths(year: number, month: number, delta: number): { year: number; month: number } {
  const total = year * 12 + (month - 1) + delta
  return { year: Math.floor(total / 12), month: (total % 12) + 1 }
}

/**
 * Assign a real (year, month) to each date row, handling adjacent-month spillover.
 * Rows are chronological top->bottom; a drop in the day number (e.g. 30 -> 1) marks a
 * month boundary. The longest run of consecutive days is the anchor (title) month.
 */
export function assignMonths(
  nums: number[],
  anchorYear: number,
  anchorMonth: number,
): { year: number; month: number }[] {
  if (nums.length === 0) return []
  const segBounds: [number, number][] = []
  let segStart = 0
  for (let i = 1; i < nums.length; i++) {
    if (nums[i] < nums[i - 1]) { segBounds.push([segStart, i - 1]); segStart = i }
  }
  segBounds.push([segStart, nums.length - 1])

  let anchorIdx = 0
  let bestLen = -1
  segBounds.forEach((b, idx) => {
    const len = b[1] - b[0] + 1
    if (len > bestLen) { bestLen = len; anchorIdx = idx }
  })

  const res: { year: number; month: number }[] = new Array(nums.length)
  segBounds.forEach((b, idx) => {
    const ym = addMonths(anchorYear, anchorMonth, idx - anchorIdx)
    for (let i = b[0]; i <= b[1]; i++) res[i] = ym
  })
  return res
}

export function extractSchedule(tokens: Token[], initials: string): DaySchedule[] {
  const who = initials.trim().toUpperCase()

  // --- locate the header row by the "C1" label ---
  const c1 = tokens.find((t) => t.str === 'C1')
  if (!c1) {
    throw new Error('근무표 형식을 인식하지 못했어요 (역할 헤더 C1을 못 찾음).')
  }
  const headerY = c1.yTop
  const header = tokens.filter((t) => Math.abs(t.yTop - headerY) < 2.5)

  // column x-centers for each role; infer any missing one by even spacing
  const colX: Record<string, number> = {}
  for (const name of ROLE_COLS) {
    const h = header.find((t) => t.str === name)
    if (h) colX[name] = h.xc
  }
  const c1x = colX['C1'] ?? c1.xc
  const spacing = colX['C2'] != null ? colX['C2'] - c1x : 19.6
  ROLE_COLS.forEach((name, i) => {
    if (colX[name] == null) colX[name] = c1x + (i - ROLE_COLS.indexOf('C1')) * spacing
  })
  const centers = ROLE_COLS.map((c) => colX[c])
  const roleMin = Math.min(...centers) - spacing / 2
  const half = spacing / 2

  // --- RMK (비고) column x-band: right of FL, left of KKM ---
  // The remark cell is free text spanning many tokens, so it's captured by an
  // x-window rather than nearest-column snapping.
  const kkmX = header.find((t) => t.str === 'KKM')?.xc
  const rmkLeft = colX['FL'] + spacing * 0.75
  const rmkRight = kkmX != null ? kkmX - spacing * 0.75 : Infinity

  const nearestCol = (x: number): { col: Role; dist: number } => {
    let col: Role = ROLE_COLS[0]
    let dist = Infinity
    for (const c of ROLE_COLS) {
      const d = Math.abs(colX[c] - x)
      if (d < dist) { dist = d; col = c }
    }
    return { col, dist }
  }

  // --- date rows (the numbers in the Date column, top -> bottom) ---
  const dateX = tokens.find((t) => t.str === 'Date')?.xc ?? 15
  const dateToks = tokens
    .filter((t) => isDate(t.str) && Math.abs(t.xc - dateX) < 6)
    .sort((a, b) => a.yTop - b.yTop)
  if (dateToks.length === 0) {
    throw new Error('근무표에서 날짜 열을 찾지 못했어요.')
  }
  const dayX = tokens.find((t) => t.str === 'Day')?.xc ?? 30
  const nums = dateToks.map((t) => parseInt(t.str, 10))

  // assign each row its real (year, month), handling adjacent-month spillover
  const anchor = detectMonth(tokens)
  const rowYM = assignMonths(nums, anchor.year, anchor.month)

  // drop title/header rows sitting above the first date
  const top = dateToks[0].yTop - 6
  const body = tokens.filter((t) => t.yTop > top)
  const nearestDateY = (y: number) => {
    let by = dateToks[0].yTop
    let bd = Math.abs(by - y)
    for (const d of dateToks) {
      const dd = Math.abs(d.yTop - y)
      if (dd < bd) { bd = dd; by = d.yTop }
    }
    return by
  }

  const out: DaySchedule[] = []
  dateToks.forEach((d, ri) => {
    const date = nums[ri]
    const { year, month } = rowYM[ri]
    const band = body.filter((t) => nearestDateY(t.yTop) === d.yTop)

    const weekday =
      band
        .filter((t) => Math.abs(t.xc - dayX) < 8 && WD.has(t.str))
        .sort((a, b) => Math.abs(a.yTop - d.yTop) - Math.abs(b.yTop - d.yTop))[0]?.str ?? ''

    // --- full roster: each role column's main + sub ---
    const roster: RosterEntry[] = []
    for (const c of ROLE_COLS) {
      let main: string | undefined
      let sub: string | undefined
      for (const w of band) {
        if (w.xc < roleMin) continue
        const { col, dist } = nearestCol(w.xc)
        if (col !== c || dist > half + 1) continue
        if (w.str.startsWith('(')) sub ??= core(w.str)
        else main ??= w.str.toUpperCase()
      }
      if (main || sub) roster.push({ role: c, main, sub })
    }

    // --- RMK/비고: gather free-text tokens in the remark band, split into lines ---
    const rmkToks = band
      .filter((t) => t.xc >= rmkLeft && t.xc < rmkRight)
      .sort((a, b) => a.yTop - b.yTop || a.xc - b.xc)
    const notes: DayNote[] = []
    let lineToks: Token[] = []
    let lastY: number | null = null
    const flush = () => {
      if (!lineToks.length) return
      const raw = lineToks.map((t) => t.str).join(' ')
      const n = parseNote(raw)
      if (n.text) notes.push(n)
      lineToks = []
    }
    for (const t of rmkToks) {
      if (lastY != null && Math.abs(t.yTop - lastY) > 4) flush()
      lineToks.push(t)
      lastY = t.yTop
    }
    flush()
    // fold a continuation line (no "<targets> -" prefix, e.g. flight detail) into
    // the preceding note so one remark cell stays a single note
    for (let k = notes.length - 1; k > 0; k--) {
      if (notes[k].targets.length === 0) {
        notes[k - 1].text += ` ${notes[k].text}`
        notes.splice(k, 1)
      }
    }

    // --- resolve the viewer's own slot from the roster ---
    let role: Role | undefined
    let mySub = false
    for (const e of roster) {
      if (e.main === who) { role = e.role; mySub = false; break }
      if (e.sub === who) { role = e.role; mySub = true; break }
    }
    const present = band.some((t) => core(t.str) === who)
    const status: 'work' | 'off' = role || present ? 'work' : 'off'

    out.push({
      year, month, date, weekday, status, role,
      sub: role ? mySub : undefined, roster,
      notes: notes.length ? notes : undefined,
    })
  })
  return out
}
