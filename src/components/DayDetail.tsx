import { ROLE_COLS, ROLE_STYLE, noteInvolves, type DaySchedule } from '../lib/schedule'

const WD_KO: Record<string, string> = {
  Mon: '월', Tue: '화', Wed: '수', Thu: '목', Fri: '금', Sat: '토', Sun: '일',
}

interface Props {
  day: DaySchedule
  initials: string
  onClose: () => void
}

export function DayDetail({ day, initials, onClose }: Props) {
  const who = initials.toUpperCase()
  const byRole = new Map(day.roster.map((e) => [e.role, e]))
  const wd = WD_KO[day.weekday] ?? '?'
  const notes = day.notes ?? []

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-white rounded-t-2xl shadow-xl max-h-[80dvh] overflow-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white px-4 py-3 border-b border-slate-100 flex items-center justify-between">
          <div>
            <div className="text-lg font-bold">
              {day.month}월 {day.date}일 <span className="text-slate-400 text-sm">({wd})</span>
            </div>
            <div className="text-xs text-slate-500">
              {day.status === 'work'
                ? day.role
                  ? `내 역할: ${day.role}${day.sub ? ' (서브)' : ''}`
                  : '근무 (역할 미지정)'
                : '오늘은 휴무'}
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 text-2xl leading-none px-2">
            ×
          </button>
        </div>

        {notes.length > 0 && (
          <div className="px-4 py-3 border-b border-slate-100 bg-amber-50/50">
            <div className="text-xs font-bold text-amber-700 mb-1.5">📌 비고</div>
            <ul className="flex flex-col gap-1.5">
              {notes.map((n, i) => {
                const mine = noteInvolves(n, who)
                return (
                  <li
                    key={i}
                    className={`text-sm rounded-lg px-2.5 py-1.5 leading-snug ${
                      mine
                        ? 'bg-amber-100 text-amber-900 font-semibold ring-1 ring-inset ring-amber-300'
                        : 'bg-white text-slate-500 ring-1 ring-inset ring-slate-100'
                    }`}
                  >
                    {mine && <span className="mr-1">★</span>}
                    {n.text}
                  </li>
                )
              })}
            </ul>
          </div>
        )}

        <ul className="divide-y divide-slate-100">
          {ROLE_COLS.map((role) => {
            const e = byRole.get(role)
            const style = ROLE_STYLE[role]
            const mineMain = e?.main === who
            const mineSub = e?.sub === who
            const mine = mineMain || mineSub
            return (
              <li
                key={role}
                className={`flex items-center gap-3 px-4 py-2.5 ${mine ? 'bg-indigo-50' : ''}`}
              >
                <span className={`shrink-0 w-14 text-xs font-bold rounded-md px-1.5 py-1 text-center ${style.pill}`}>
                  {role}
                </span>
                <span className="flex-1 font-semibold tabular-nums">
                  {e?.main ?? <span className="text-slate-300">—</span>}
                  {e?.sub && (
                    <span className="ml-2 text-xs font-medium text-slate-500">+ 서브 {e.sub}</span>
                  )}
                </span>
                {mine && (
                  <span className="shrink-0 text-xs font-bold text-indigo-600 bg-indigo-100 rounded-full px-2 py-0.5">
                    나{mineSub ? ' · 서브' : ''}
                  </span>
                )}
              </li>
            )
          })}
        </ul>

        <div className="px-4 py-3">
          <button
            onClick={onClose}
            className="w-full rounded-xl bg-slate-100 text-slate-600 font-semibold py-2.5"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  )
}
