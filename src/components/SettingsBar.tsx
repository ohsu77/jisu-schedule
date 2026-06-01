interface Props {
  initials: string
  onChange: (v: string) => void
}

export function SettingsBar({ initials, onChange }: Props) {
  return (
    <label className="flex items-center gap-2 rounded-xl bg-white border border-slate-200 px-3 py-2 shadow-sm">
      <span className="text-sm text-slate-500 shrink-0">내 이니셜</span>
      <input
        value={initials}
        onChange={(e) => onChange(e.target.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4))}
        placeholder="JP"
        inputMode="text"
        autoCapitalize="characters"
        className="flex-1 min-w-0 text-base font-semibold tracking-wide outline-none"
      />
      <span className="text-xs text-slate-400 shrink-0">이 사람 일정만 추출</span>
    </label>
  )
}
