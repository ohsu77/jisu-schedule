// Real-browser smoke test: serve the built app, upload the sample PDF in a
// headless Chrome, and assert the calendar renders with no errors.
// Run: node scripts/browser_test.mjs   (after npm run build)
import { chromium } from 'playwright-core'
import { spawn } from 'node:child_process'
import { setTimeout as sleep } from 'node:timers/promises'

const PORT = 4178
const SAMPLE = "samples/[Rev] Jun'26 ATLKK WORK SKD.pdf"

// Optional: test a live URL instead of a local preview build.
const target = process.argv[2]
const base = target || `http://localhost:${PORT}/`
const server = target
  ? null
  : spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'ignore' })

async function waitServer() {
  for (let i = 0; i < 40; i++) {
    try {
      const r = await fetch(`http://localhost:${PORT}/`)
      if (r.ok) return
    } catch { /* not up yet */ }
    await sleep(250)
  }
  throw new Error('preview server did not start')
}

let code = 1
try {
  if (!target) await waitServer()
  const browser = await chromium.launch({ channel: 'chrome', headless: true })
  const page = await browser.newPage()

  const errors = []
  const failed = []
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message))
  page.on('response', (r) => { if (r.status() >= 400) failed.push(`${r.status()} ${r.url()}`) })

  await page.goto(base, { waitUntil: 'networkidle' })
  await page.setInputFiles('input[type=file]', SAMPLE)

  // wait for EITHER the calendar header (success) or the error box (failure)
  const result = await Promise.race([
    page.waitForSelector('text=Jun 2026', { timeout: 20000 }).then(() => 'calendar'),
    page.waitForSelector('p.bg-red-50', { timeout: 20000 }).then(() => 'error-box'),
  ]).catch(() => 'timeout')

  await sleep(500)
  const errBox = await page.locator('p.bg-red-50').first().textContent().catch(() => null)
  const ib2 = await page.locator('text=I/B2').first().isVisible().catch(() => false)
  const workCount = await page.locator('text=/근무 \\d+일/').first().textContent().catch(() => '')

  console.log('--- browser test ---')
  console.log('outcome      :', result)
  console.log('calendar pill :', ib2 ? 'I/B2 보임 ✓' : '안 보임')
  console.log('work summary  :', workCount || '(없음)')
  console.log('error box     :', errBox || '(없음)')
  console.log('console errors:', errors.length ? errors : '(없음)')
  console.log('failed requests:', failed.length ? failed : '(없음)')

  // favicon/icon 404 is cosmetic; only fail on functional problems
  const criticalFails = failed.filter((f) => !/favicon|apple-touch-icon|\.png|\.ico/.test(f))
  await browser.close()
  code = result === 'calendar' && !errBox && criticalFails.length === 0 ? 0 : 1
  console.log(code === 0 ? '\n✅ PASS' : '\n❌ FAIL')
} catch (e) {
  console.error('test crashed:', e.message)
} finally {
  server?.kill('SIGKILL')
}
process.exit(code)
