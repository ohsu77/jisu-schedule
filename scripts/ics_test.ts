// Sanity-check the generated .ics (all-day work events). Run: npx tsx scripts/ics_test.ts
import { readFileSync } from 'node:fs'
import { extractSchedule, detectMonth } from '../src/lib/extractSchedule'
import { buildIcs } from '../src/lib/ics'
import type { Token } from '../src/lib/schedule'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const pdfjs: any = await import('pdfjs-dist/legacy/build/pdf.mjs')

const data = new Uint8Array(readFileSync("samples/[Rev] Jun'26 ATLKK WORK SKD.pdf"))
const pdf = await pdfjs.getDocument({ data, useSystemFonts: true }).promise
const page = await pdf.getPage(1)
const viewport = page.getViewport({ scale: 1 })
const content = await page.getTextContent()
const tokens: Token[] = []
for (const item of content.items as any[]) {
  const str = (item.str ?? '').trim()
  if (!str) continue
  tokens.push({ str, xc: item.transform[4] + (item.width ?? 0) / 2, yTop: viewport.height - item.transform[5] })
}

const { year, month, label } = detectMonth(tokens)
const days = extractSchedule(tokens, 'JP')
const ics = buildIcs({ year, month, label, days }, 'JP')
console.log(ics.split('\n').slice(0, 22).join('\n'))
console.log('...')
console.log('VEVENT count:', (ics.match(/BEGIN:VEVENT/g) || []).length)
console.log('all-day (DTSTART;VALUE=DATE):', (ics.match(/DTSTART;VALUE=DATE:/g) || []).length)
