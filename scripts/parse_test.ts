// Node verification: extract tokens with pdfjs-dist (same lib the browser uses)
// and run the SHARED extractor, then compare against the trusted Python output.
// Run: npx tsx scripts/parse_test.ts
import { readFileSync } from 'node:fs'
import { extractSchedule } from '../src/lib/extractSchedule'
import type { Token } from '../src/lib/schedule'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const pdfjs: any = await import('pdfjs-dist/legacy/build/pdf.mjs')

async function tokensFromPdf(path: string): Promise<Token[]> {
  const data = new Uint8Array(readFileSync(path))
  const pdf = await pdfjs.getDocument({ data, useSystemFonts: true }).promise
  const page = await pdf.getPage(1)
  const viewport = page.getViewport({ scale: 1 })
  const content = await page.getTextContent()
  const tokens: Token[] = []
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

const tokens = await tokensFromPdf(pdfPath)
const sched = extractSchedule(tokens, who)

const fmt = (d: (typeof sched)[number]) =>
  d.status === 'off'
    ? '휴무'
    : d.role
      ? `근무 → ${d.role}${d.sub ? ' (서브)' : ''}`
      : '근무 (역할 미지정)'

console.log(`\n=== ${who} (pdfjs + shared extractor) ===\n`)
for (const d of sched) {
  console.log(`  6/${String(d.date).padStart(2)} ${d.weekday.padEnd(3)} ${fmt(d)}`)
}
const work = sched.filter((d) => d.status === 'work').length
console.log(`\n  근무 ${work}일 · 휴무 ${sched.length - work}일`)

// roster cross-check for a couple of days (compare to raw PDF text)
for (const dt of [1, 5]) {
  const day = sched.find((d) => d.date === dt)!
  const r = day.roster
    .map((e) => `${e.role}=${e.main ?? '·'}${e.sub ? `(${e.sub})` : ''}`)
    .join('  ')
  console.log(`\n  [${day.year}-${day.month}-${dt} 로스터] ${r}`)
}

// quick self-check vs known-good Python result
const expectedWork = 22
if (work !== expectedWork) {
  console.error(`\n❌ MISMATCH: expected ${expectedWork} work days, got ${work}`)
  process.exit(1)
} else {
  console.log('\n✅ work-day count matches Python (22).')
}
