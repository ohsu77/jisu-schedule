// Real-browser smoke test. Uploads the sample PDF and asserts the calendar
// renders with no errors. Runs TWICE:
//   1) normal
//   2) simulating iOS Safari < 17.4 (Promise.withResolvers removed before load)
//      to verify the polyfill actually works.
// Usage: node scripts/browser_test.mjs [liveURL]
import { chromium } from 'playwright-core'
import { spawn } from 'node:child_process'
import { setTimeout as sleep } from 'node:timers/promises'

const PORT = 4178
const SAMPLE = "samples/[Rev] Jun'26 ATLKK WORK SKD.pdf"

const target = process.argv[2]
const base = target || `http://localhost:${PORT}/`
const server = target
  ? null
  : spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'ignore' })

async function waitServer() {
  for (let i = 0; i < 40; i++) {
    try { if ((await fetch(base)).ok) return } catch { /* not up */ }
    await sleep(250)
  }
  throw new Error('preview server did not start')
}

async function runOnce(browser, simulateOldIOS) {
  const ctx = await browser.newContext()
  const page = await ctx.newPage()
  const errors = []
  const failed = []
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message))
  page.on('response', (r) => { if (r.status() >= 400) failed.push(`${r.status()} ${r.url()}`) })

  if (simulateOldIOS) {
    await page.addInitScript(() => {
      // pretend Promise.withResolvers does not exist (iOS Safari < 17.4)
      try { delete Promise.withResolvers } catch { /* noop */ }
    })
  }

  await page.goto(base, { waitUntil: 'networkidle' })
  await page.setInputFiles('input[type=file]', SAMPLE)
  const outcome = await Promise.race([
    page.waitForSelector('text=Jun 2026', { timeout: 20000 }).then(() => 'calendar'),
    page.waitForSelector('p.bg-red-50', { timeout: 20000 }).then(() => 'error-box'),
  ]).catch(() => 'timeout')

  await sleep(400)
  const errBox = await page.locator('p.bg-red-50').first().textContent().catch(() => null)
  const ib2 = await page.locator('text=I/B2').first().isVisible().catch(() => false)
  const work = await page.locator('text=/근무 \\d+일/').first().textContent().catch(() => '')
  const critical = failed.filter((f) => !/favicon|apple-touch-icon|\.png|\.ico/.test(f))

  const ok = outcome === 'calendar' && !errBox && ib2 && errors.length === 0 && critical.length === 0
  console.log(`\n[${simulateOldIOS ? 'iOS<17.4 시뮬(withResolvers 제거)' : '일반'}]`)
  console.log('  outcome:', outcome, '| I/B2:', ib2 ? '✓' : '✗', '|', work)
  console.log('  errBox :', errBox || '(없음)')
  console.log('  console:', errors.length ? errors : '(없음)')
  console.log('  ', ok ? '✅ PASS' : '❌ FAIL')
  await ctx.close()
  return ok
}

let code = 1
try {
  if (!target) await waitServer()
  const browser = await chromium.launch({ channel: 'chrome', headless: true })
  console.log('대상:', base)
  const a = await runOnce(browser, false)
  const b = await runOnce(browser, true)
  await browser.close()
  code = a && b ? 0 : 1
  console.log(code === 0 ? '\n===== 전체 ✅ PASS =====' : '\n===== ❌ FAIL =====')
} catch (e) {
  console.error('test crashed:', e.message)
} finally {
  server?.kill('SIGKILL')
}
process.exit(code)
