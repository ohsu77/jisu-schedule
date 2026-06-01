import { useState, type RefObject } from 'react'
import type { ParsedSchedule } from '../lib/schedule'
import { buildIcs } from '../lib/ics'
import { savePng, downloadText } from '../lib/download'

interface Props {
  schedule: ParsedSchedule
  initials: string
  calRef: RefObject<HTMLDivElement | null>
}

export function ExportBar({ schedule, initials, calRef }: Props) {
  const [msg, setMsg] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const stamp = `${initials}-${schedule.year}-${String(schedule.month).padStart(2, '0')}`

  async function onSavePng() {
    if (!calRef.current) return
    setBusy(true); setMsg(null)
    try {
      const r = await savePng(calRef.current, `${stamp}.png`)
      if (r === 'downloaded') setMsg('이미지를 저장했어요. (사진첩/다운로드 폴더 확인)')
      else if (r === 'shared') setMsg('공유 완료!')
    } catch (e) {
      setMsg((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  function onSaveIcs() {
    setMsg(null)
    try {
      downloadText(buildIcs(schedule, initials), `${stamp}.ics`)
      setMsg('.ics 파일을 받았어요. 열어서 캘린더에 추가하세요.')
    } catch (e) {
      setMsg((e as Error).message)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={onSavePng}
          disabled={busy}
          className="rounded-xl bg-indigo-600 text-white font-semibold py-3 shadow-sm active:scale-[.98] transition disabled:opacity-60"
        >
          📷 사진첩에 저장
        </button>
        <button
          onClick={onSaveIcs}
          className="rounded-xl bg-white border border-indigo-200 text-indigo-700 font-semibold py-3 shadow-sm active:scale-[.98] transition"
        >
          📅 캘린더에 추가
        </button>
      </div>
      {msg && <p className="text-center text-xs text-slate-500">{msg}</p>}
    </div>
  )
}
