import type { HistoryItem } from '../lib/store'

interface Props {
  items: HistoryItem[]
  activeId: string | null
  onSelect: (id: string) => void
  onDelete: (id: string) => void
}

export function HistoryList({ items, activeId, onSelect, onDelete }: Props) {
  if (items.length === 0) return null
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-slate-400 px-1">저장된 근무표 ({items.length})</span>
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {items.map((it) => {
          const active = it.id === activeId
          return (
            <div
              key={it.id}
              className={`shrink-0 flex items-center gap-1 rounded-xl border px-3 py-2 text-sm shadow-sm transition ${
                active
                  ? 'border-indigo-400 bg-indigo-50 text-indigo-700'
                  : 'border-slate-200 bg-white text-slate-600'
              }`}
            >
              <button onClick={() => onSelect(it.id)} className="flex flex-col items-start leading-tight">
                <span className="font-bold">{it.label}</span>
                <span className="text-[10px] opacity-60 max-w-28 truncate">{it.fileName}</span>
              </button>
              <button
                onClick={() => onDelete(it.id)}
                className="text-slate-300 hover:text-rose-500 text-lg leading-none px-1"
                aria-label="삭제"
              >
                ×
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
