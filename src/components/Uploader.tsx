import { useRef, useState } from 'react'

interface Props {
  onFile: (file: File) => void
  busy: boolean
  fileName: string
}

export function Uploader({ onFile, busy, fileName }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [drag, setDrag] = useState(false)

  function pick(files: FileList | null) {
    const f = files?.[0]
    if (f && f.type === 'application/pdf') onFile(f)
  }

  if (fileName) {
    return (
      <button
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        className="flex items-center justify-between gap-2 rounded-xl bg-white border border-slate-200 px-3 py-2 shadow-sm text-sm"
      >
        <span className="truncate text-slate-600">📄 {fileName}</span>
        <span className="shrink-0 text-indigo-600">{busy ? '읽는 중…' : '다른 PDF'}</span>
        <input ref={inputRef} type="file" accept="application/pdf" hidden
          onChange={(e) => pick(e.target.files)} />
      </button>
    )
  }

  return (
    <button
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setDrag(true) }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => { e.preventDefault(); setDrag(false); pick(e.dataTransfer.files) }}
      disabled={busy}
      className={`flex flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed px-4 py-10 transition ${
        drag ? 'border-indigo-400 bg-indigo-50' : 'border-slate-300 bg-white'
      }`}
    >
      <span className="text-3xl">📅</span>
      <span className="font-semibold text-slate-700">
        {busy ? '읽는 중…' : '근무표 PDF 올리기'}
      </span>
      <span className="text-xs text-slate-400">탭하거나 파일을 끌어다 놓으세요</span>
      <input ref={inputRef} type="file" accept="application/pdf" hidden
        onChange={(e) => pick(e.target.files)} />
    </button>
  )
}
