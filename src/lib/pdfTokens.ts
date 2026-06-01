// Browser adapter: turn a PDF (ArrayBuffer) into positioned tokens for the
// pure extractor. Runs entirely client-side — the PDF never leaves the device.

import * as pdfjs from 'pdfjs-dist'
import PdfWorker from './pdfWorker?worker'
import type { Token } from './schedule'

// Use a bundled worker that polyfills Promise.withResolvers in the worker scope
// (needed for older iOS Safari). workerPort takes precedence over workerSrc.
pdfjs.GlobalWorkerOptions.workerPort = new PdfWorker()

export async function pdfToTokens(data: ArrayBuffer): Promise<Token[]> {
  const pdf = await pdfjs.getDocument({ data }).promise
  const page = await pdf.getPage(1)
  const viewport = page.getViewport({ scale: 1 })
  const content = await page.getTextContent()

  const tokens: Token[] = []
  for (const item of content.items) {
    if (!('str' in item)) continue
    const str = item.str.trim()
    if (!str) continue
    const x = item.transform[4] as number
    const yBaseline = item.transform[5] as number
    tokens.push({
      str,
      xc: x + (item.width ?? 0) / 2,
      yTop: viewport.height - yBaseline,
    })
  }
  return tokens
}
