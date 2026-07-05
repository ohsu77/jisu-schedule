import { ROLE_STYLE, noteInvolves, type DaySchedule, type ParsedSchedule } from '../lib/schedule'

const WD_KO = ['일', '월', '화', '수', '목', '금', '토']
const key = (y: number, m: number, d: number) => `${y}-${m}-${d}`

interface Props {
  schedule: ParsedSchedule
  initials: string
  onSelectDay: (day: DaySchedule) => void
}

export function CalendarView({ schedule, initials, onSelectDay }: Props) {
  const { year, month, label } = schedule

  const byDate = new Map<string, DaySchedule>()
  for (const d of schedule.days) byDate.set(key(d.year, d.month, d.date), d)

  // "today" — evaluated on every render, so it follows the real date day-to-day
  const now = new Date()
  const todayKey = key(now.getFullYear(), now.getMonth() + 1, now.getDate())

  // build the month grid as real dates so adjacent-month days land in lead/trail cells
  const firstDow = new Date(year, month - 1, 1).getDay()
  const daysInMonth = new Date(year, month, 0).getDate()
  const weeks = Math.ceil((firstDow + daysInMonth) / 7)
  const gridStart = new Date(year, month - 1, 1 - firstDow)
  const cells = Array.from({ length: weeks * 7 }, (_, i) => {
    const dt = new Date(gridStart)
    dt.setDate(gridStart.getDate() + i)
    return dt
  })

  const workCount = schedule.days.filter(
    (d) => d.status === 'work' && d.month === month,
  ).length

  return (
    <div className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-4 pt-4 pb-3 bg-gradient-to-br from-sky-600 to-indigo-600 text-white">
        <div className="text-xs/4 opacity-85">대한항공 · {initials} 스케줄</div>
        <div className="flex items-baseline justify-between">
          <h2 className="text-xl font-bold">{label}</h2>
          <span className="text-sm opacity-90">근무 {workCount}일</span>
        </div>
      </div>

      <div className="grid grid-cols-7 text-center text-xs font-medium py-2 border-b border-slate-100">
        {WD_KO.map((w, i) => (
          <div key={w} className={i === 0 ? 'text-rose-500' : i === 6 ? 'text-blue-500' : 'text-slate-400'}>
            {w}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {cells.map((dt, i) => {
          const col = i % 7
          const y = dt.getFullYear()
          const m = dt.getMonth() + 1
          const dnum = dt.getDate()
          const inMonth = m === month
          const day = byDate.get(key(y, m, dnum))
          const work = day?.status === 'work'
          const style = day?.role ? ROLE_STYLE[day.role] : undefined
          const isToday = key(y, m, dnum) === todayKey
          const hasNote = (day?.notes ?? []).some((n) => noteInvolves(n, initials))

          return (
            <button
              key={i}
              onClick={() => day && onSelectDay(day)}
              disabled={!day}
              className={`min-h-16 text-left border-b border-r border-slate-100 p-1 flex flex-col gap-0.5 transition ${
                col === 6 ? 'border-r-0' : ''
              } ${isToday ? 'bg-indigo-50 ring-1 ring-inset ring-indigo-300' : inMonth ? '' : 'bg-slate-50'} ${
                day ? 'active:bg-slate-100' : ''
              }`}
            >
              <div className="flex items-start justify-between gap-0.5">
                {isToday ? (
                  <span className="inline-flex items-center justify-center min-w-5 h-5 px-1 rounded-full bg-indigo-600 text-white text-[11px] font-bold tabular-nums shadow-sm">
                    {dnum}
                  </span>
                ) : (
                  <span
                    className={`text-xs font-semibold ${
                      !inMonth
                        ? 'text-slate-300'
                        : col === 0
                          ? 'text-rose-500'
                          : col === 6
                            ? 'text-blue-500'
                            : 'text-slate-500'
                    }`}
                  >
                    {dnum}
                  </span>
                )}
                {hasNote && (
                  <span
                    className="text-[11px] leading-none text-amber-500"
                    title="내 관련 비고 있음"
                    aria-label="비고 있음"
                  >
                    ★
                  </span>
                )}
              </div>

              {work && style && (
                <span
                  className={`mt-auto rounded-md px-1 py-0.5 text-[11px] font-bold leading-tight text-center ring-1 ring-inset ring-black/5 ${style.pill} ${
                    inMonth ? '' : 'opacity-60'
                  }`}
                >
                  {day!.role}
                  <span className="block text-[9px] font-semibold opacity-70">
                    {day!.sub ? '나 · 서브' : '나'}
                  </span>
                </span>
              )}
              {work && !style && (
                <span className="mt-auto rounded-md px-1 py-0.5 text-[11px] font-bold text-center bg-slate-100 text-slate-600">
                  나
                </span>
              )}
              {day && !work && (
                <span className="mt-auto text-[10px] text-slate-300 text-center">휴무</span>
              )}
            </button>
          )
        })}
      </div>

      <p className="px-3 py-2 text-[11px] text-slate-400 text-center border-t border-slate-100">
        날짜를 탭하면 그날 전체 배정을 볼 수 있어요
      </p>
    </div>
  )
}
