import { useEffect, useRef, useState } from 'react'
import { parseSchedulePdf } from './lib/parse'
import type { DaySchedule, ParsedSchedule } from './lib/schedule'
import {
  abToB64, b64ToAb, getActiveId, loadHistory, loadInitials,
  removeItem, saveInitials, setActiveId, upsertItem, type HistoryItem,
} from './lib/store'
import { SettingsBar } from './components/SettingsBar'
import { Uploader } from './components/Uploader'
import { HistoryList } from './components/HistoryList'
import { CalendarView } from './components/CalendarView'
import { DayDetail } from './components/DayDetail'
import { ReviewTable } from './components/ReviewTable'
import { ExportBar } from './components/ExportBar'

function describeError(e: unknown): string {
  const err = e as { name?: string; message?: string; stack?: string }
  const head = `${err?.name ?? 'Error'}: ${err?.message ?? String(e)}`
  const frames = err?.stack
    ?.split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(0, 4)
    .join('\n')
  return frames && !frames.startsWith(head) ? `${head}\n\n${frames}` : head
}

export default function App() {
  const [initials, setInitials] = useState(loadInitials)
  const [data, setData] = useState<ArrayBuffer | null>(null)
  const [fileName, setFileName] = useState('')
  const [schedule, setSchedule] = useState<ParsedSchedule | null>(null)
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [activeId, setActiveIdState] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [showEdit, setShowEdit] = useState(false)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const calRef = useRef<HTMLDivElement>(null)
  const mounted = useRef(false)

  const selectedDay =
    schedule && selectedDate
      ? schedule.days.find((d) => `${d.year}-${d.month}-${d.date}` === selectedDate) ?? null
      : null

  // load an item into view; re-parse if it was saved for different initials
  async function activate(item: HistoryItem, who: string) {
    const buf = b64ToAb(item.pdf)
    setData(buf)
    setFileName(item.fileName)
    setActiveIdState(item.id)
    setActiveId(item.id)
    setShowEdit(false)
    setSelectedDate(null)
    if (item.initials === who) {
      setSchedule(item.schedule)
    } else {
      const s = await parseSchedulePdf(buf.slice(0), who)
      setSchedule(s)
      setHistory(upsertItem({ ...item, schedule: s, initials: who, savedAt: Date.now() }))
    }
  }

  // on first load: restore the last-viewed schedule
  useEffect(() => {
    const h = loadHistory()
    setHistory(h)
    const item = h.find((x) => x.id === getActiveId()) ?? h[0]
    if (item) activate(item, initials)
    mounted.current = true
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // initials changed: persist + re-parse the active PDF
  useEffect(() => {
    saveInitials(initials)
    if (!mounted.current || !data || !activeId) return
    setBusy(true)
    parseSchedulePdf(data.slice(0), initials)
      .then((s) => {
        setSchedule(s)
        const item = loadHistory().find((x) => x.id === activeId)
        if (item) setHistory(upsertItem({ ...item, schedule: s, initials, savedAt: Date.now() }))
      })
      .catch((e) => setError(describeError(e)))
      .finally(() => setBusy(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initials])

  async function onFile(file: File) {
    setBusy(true)
    setError(null)
    try {
      const buf = await file.arrayBuffer()
      const s = await parseSchedulePdf(buf.slice(0), initials)
      const id = `${s.year}-${s.month}`
      const item: HistoryItem = {
        id, year: s.year, month: s.month, label: s.label,
        fileName: file.name, initials, savedAt: Date.now(),
        pdf: abToB64(buf), schedule: s,
      }
      setData(buf)
      setFileName(file.name)
      setSchedule(s)
      setActiveIdState(id)
      setActiveId(id)
      setHistory(upsertItem(item))
      setShowEdit(false)
    } catch (e) {
      setError(describeError(e))
      setSchedule(null)
    } finally {
      setBusy(false)
    }
  }

  function onDelete(id: string) {
    const h = removeItem(id)
    setHistory(h)
    if (activeId === id) {
      setActiveId(null)
      setActiveIdState(null)
      setSchedule(null)
      setData(null)
      setFileName('')
      if (h[0]) activate(h[0], initials)
    }
  }

  function updateDays(days: DaySchedule[]) {
    if (!schedule) return
    const s = { ...schedule, days }
    setSchedule(s)
    if (activeId) {
      const item = loadHistory().find((x) => x.id === activeId)
      if (item) setHistory(upsertItem({ ...item, schedule: s, savedAt: Date.now() }))
    }
  }

  return (
    <div className="min-h-dvh bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-md px-4 py-5 flex flex-col gap-4">
        <header className="flex items-baseline justify-between">
          <h1 className="text-xl font-bold">
            대한항공 {initials ? `${initials} ` : ''}스케줄
          </h1>
          {schedule && <span className="text-sm text-slate-500">{schedule.label}</span>}
        </header>

        <SettingsBar initials={initials} onChange={setInitials} />
        <Uploader onFile={onFile} busy={busy} fileName={fileName} />

        <HistoryList
          items={history}
          activeId={activeId}
          onSelect={(id) => {
            const item = history.find((x) => x.id === id)
            if (item) activate(item, initials)
          }}
          onDelete={onDelete}
        />

        {error && (
          <p className="rounded-lg bg-red-50 text-red-700 text-xs px-3 py-2 whitespace-pre-wrap break-words font-mono leading-relaxed">
            {error}
          </p>
        )}

        {schedule && (
          <>
            <div ref={calRef}>
              <CalendarView
                schedule={schedule}
                initials={initials}
                onSelectDay={(d) => setSelectedDate(`${d.year}-${d.month}-${d.date}`)}
              />
            </div>
            <ExportBar schedule={schedule} initials={initials} calRef={calRef} />
            <button
              onClick={() => setShowEdit((v) => !v)}
              className="text-sm text-indigo-600 underline self-start"
            >
              {showEdit ? '편집 닫기' : '표로 보기 · 수정'}
            </button>
            {showEdit && <ReviewTable days={schedule.days} onChange={updateDays} />}
          </>
        )}

        {selectedDay && (
          <DayDetail day={selectedDay} initials={initials} onClose={() => setSelectedDate(null)} />
        )}

        {!schedule && !busy && (
          <p className="text-center text-sm text-slate-400 mt-8 leading-relaxed">
            근무표 PDF를 올리면
            <br />
            내 이니셜(<b>{initials}</b>) 일정만 뽑아 달력으로 보여드려요.
          </p>
        )}
      </div>
    </div>
  )
}
