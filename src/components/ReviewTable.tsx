import { ROLE_COLS, type DaySchedule, type Role } from '../lib/schedule'

interface Props {
  days: DaySchedule[]
  onChange: (days: DaySchedule[]) => void
}

const WD_KO: Record<string, string> = {
  Mon: '월', Tue: '화', Wed: '수', Thu: '목', Fri: '금', Sat: '토', Sun: '일',
}

export function ReviewTable({ days, onChange }: Props) {
  function patch(i: number, p: Partial<DaySchedule>) {
    onChange(days.map((d, j) => (j === i ? { ...d, ...p } : d)))
  }

  return (
    <div className="rounded-xl bg-white border border-slate-200 shadow-sm overflow-hidden text-sm">
      <p className="px-3 py-2 text-xs text-slate-400 border-b border-slate-100">
        파싱 결과가 이상하면 여기서 직접 고치세요. (수정은 달력·내보내기에 바로 반영)
      </p>
      <div className="max-h-96 overflow-auto divide-y divide-slate-100">
        {days.map((d, i) => (
          <div key={d.date} className="flex items-center gap-2 px-3 py-1.5">
            <span className="w-12 tabular-nums text-slate-500 shrink-0">
              {d.date}
              <span className="text-slate-300">({WD_KO[d.weekday] ?? '?'})</span>
            </span>
            <select
              value={d.status}
              onChange={(e) => patch(i, { status: e.target.value as 'work' | 'off' })}
              className="rounded border border-slate-200 px-1 py-0.5 bg-white"
            >
              <option value="work">근무</option>
              <option value="off">휴무</option>
            </select>
            {d.status === 'work' && (
              <>
                <select
                  value={d.role ?? ''}
                  onChange={(e) => patch(i, { role: (e.target.value || undefined) as Role | undefined })}
                  className="rounded border border-slate-200 px-1 py-0.5 bg-white"
                >
                  <option value="">(미지정)</option>
                  {ROLE_COLS.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
                <label className="flex items-center gap-1 text-xs text-slate-500 ml-auto">
                  <input
                    type="checkbox"
                    checked={!!d.sub}
                    onChange={(e) => patch(i, { sub: e.target.checked })}
                  />
                  서브
                </label>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
