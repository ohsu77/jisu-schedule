// Dump extracted RMK/비고 notes per day for a PDF. Run: npx tsx scripts/rmk_check.ts <pdf> [WHO]
import { readFileSync } from 'node:fs'
import { extractSchedule } from '../src/lib/extractSchedule'
import { noteInvolves, type Token } from '../src/lib/schedule'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const pdfjs: any = await import('pdfjs-dist/legacy/build/pdf.mjs')

async function tokensFromPdf(path: string): Promise<Token[]> {
  const data = new Uint8Array(readFileSync(path))
  const pdf = await pdfjs.getDocument({ data, useSystemFonts: true }).promise
  const page = await pdf.getPage(1)
  const viewport = page.getViewport({ scale: 1 })
  const content = await page.getTextContent()
  const tokens: Token[] = []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const item of content.items as any[]) {
    const str = (item.str ?? '').trim()
    if (!str) continue
    tokens.push({
      str,
      xc: item.transform[4] + (item.width ?? 0) / 2,
      yTop: viewport.height - item.transform[5],
    })
  }
  return tokens
}

const pdfPath = process.argv[2] ?? "samples/[Rev] Jun'26 ATLKK WORK SKD.pdf"
const who = process.argv[3] ?? 'JP'
const sched = extractSchedule(await tokensFromPdf(pdfPath), who)

console.log(`\n=== RMK notes in ${pdfPath} (★ = involves ${who}) ===\n`)
let count = 0
for (const d of sched) {
  if (!d.notes?.length) continue
  count++
  for (const n of d.notes) {
    const star = noteInvolves(n, who) ? '★' : ' '
    const tg = n.targets.join('/') || '·'
    console.log(`${star} ${String(d.date).padStart(2)}일  [tgt=${tg.padEnd(9)} rel=${(n.related ?? '·').padEnd(3)}]  "${n.text}"`)
  }
}
console.log(`\n  ${count} day(s) with notes.`)
