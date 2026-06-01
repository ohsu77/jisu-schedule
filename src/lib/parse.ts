// Browser entry point: PDF bytes -> one person's parsed month.
import { pdfToTokens } from './pdfTokens'
import { extractSchedule, detectMonth } from './extractSchedule'
import type { ParsedSchedule } from './schedule'

export async function parseSchedulePdf(
  data: ArrayBuffer,
  initials: string,
): Promise<ParsedSchedule> {
  const tokens = await pdfToTokens(data)
  const { year, month, label } = detectMonth(tokens)
  const days = extractSchedule(tokens, initials)
  return { year, month, label, days }
}
