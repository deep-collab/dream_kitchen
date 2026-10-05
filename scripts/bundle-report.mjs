// What a first-time visitor actually downloads, per page, on the production build.
// Needs `npm run build` and `npm run preview -- --port 4173`, then: node scripts/bundle-report.mjs [label]
// For each page: every JS file the browser fetched, sized as gzip from dist (what a server
// sends), and checks that an English visitor downloads no Kannada at all. Exits non-zero if not.
// Writes docs/screenshots/step6/bundle-<label>.json (DK_OUT to change).
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { gzipSync } from 'node:zlib'
import { chromium } from 'playwright'

// DK_BASE / DK_DIST measure another build (e.g. an experiment) the same way
const BASE = process.env.DK_BASE || 'http://localhost:4173'
const DIST = process.env.DK_DIST || 'dist'
const label = process.argv[2] || 'after'
const KANNADA = /[ಀ-೿]/g
// The two places where Kannada must reach everyone (see docs/PROGRESS.md, Step 5)
const ALLOWED_KANNADA = ['ಕನ್ನಡ'] // the language button's own label
const PAGES = ['/', '/menu', '/customize', '/cart', '/checkout', '/classes', '/our-story', '/contact', '/faq', '/track', '/no-such-page']
const OUT = process.env.DK_OUT || 'docs/screenshots/step6'
const gz = (file) => gzipSync(readFileSync(`${DIST}${file}`)).length
const kb = (n) => (n / 1024).toFixed(1)
// JS, plus the Kannada JSON file (all Kannada text, fetched only for ಕನ್ನಡ readers)
const isCode = (p) => p.endsWith('.js') || /\/assets\/kannada-[\w]+\.json$/.test(p)
mkdirSync(OUT, { recursive: true })

const browser = await chromium.launch()
const report = { label, english: [], kannada: [], problems: [] }

for (const lang of ['en', 'kn']) {
  for (const path of PAGES) {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } })
    await ctx.addInitScript((l) => {
      // The exact moment the page says it has rendered (before any idle prefetch starts)
      window.addEventListener('dk:ready', () => (window.__dkReadyAt = performance.now()), { once: true })
      localStorage.setItem('dk_intro_seen', '1')
      if (l === 'kn') localStorage.setItem('dk_lang', 'kn')
    }, lang)
    if (path === '/cart' || path === '/checkout')
      await ctx.addInitScript(() => {
        const line = { id: 'b1', productId: 'oreo-overload-tub', selection: { size: '250g', ragi: false, name: '', drawing: false, drawingText: '', drawingRef: null }, qty: 1, unitPrice: 399, name: { en: 'Oreo Overload Tub' }, art: 'tub' }
        localStorage.setItem('dk_cart_v3', JSON.stringify({ version: 3, lines: [line] }))
      })
    const page = await ctx.newPage()
    const scripts = new Set()
    page.on('request', (r) => {
      const u = new URL(r.url())
      if (u.origin === BASE && isCode(u.pathname)) scripts.add(u.pathname)
    })
    await page.goto(BASE + path)
    await page.waitForFunction(() => window.__dkReady === true)
    // "First load" = what the page needs to show itself: scripts requested before it signalled
    // ready. (Polling for the flag can notice it late, after the idle prefetch began.)
    const early = (
      await page.evaluate(() => performance.getEntriesByType('resource').filter((e) => e.startTime <= window.__dkReadyAt).map((e) => new URL(e.name).pathname))
    ).filter(isCode)
    const firstLoad = [...scripts].filter((f) => early.includes(f))
    const firstGz = firstLoad.reduce((n, f) => n + gz(f), 0)
    await page.waitForTimeout(3500) // let the idle prefetch of the order pages run
    const all = [...scripts]
    const allGz = all.reduce((n, f) => n + gz(f), 0)
    const kannadaFiles = all.filter((f) => {
      const text = readFileSync(`${DIST}${f}`, 'utf8')
      return (text.match(/[ಀ-೿]+/g) || []).some((w) => !ALLOWED_KANNADA.includes(w))
    })
    if (all.some((f) => /admin/.test(f))) report.problems.push(`${path}: a customer page downloaded admin code`)
    const landed = new URL(page.url()).pathname
    const row = { path, landed, firstLoadKb: Number(kb(firstGz)), files: firstLoad.length, withPrefetchKb: Number(kb(allGz)), kannadaFiles }
    report[lang === 'en' ? 'english' : 'kannada'].push(row)
    if (lang === 'en' && kannadaFiles.length) report.problems.push(`English visitor on ${path} downloaded Kannada in: ${kannadaFiles.join(', ')}`)
    if (lang === 'kn' && !kannadaFiles.length) report.problems.push(`Kannada visitor on ${path} never received the Kannada chunk`)
    if (lang === 'en' && firstGz > 100 * 1024) report.problems.push(`English ${path}: first load ${kb(firstGz)} KB is over the 100 KB target`)
    if (landed !== path && path !== '/no-such-page') report.problems.push(`${path} redirected to ${landed}`)
    await ctx.close()
  }
}
await browser.close()

writeFileSync(`${OUT}/bundle-${label}.json`, JSON.stringify(report, null, 2))
for (const [name, rows] of [['English visitor', report.english], ['Kannada visitor', report.kannada]]) {
  console.log(`\n${name} (390px, cold): JS gzip`)
  console.log('page                                   first load   files   after idle prefetch   Kannada files')
  for (const r of rows) console.log(`${r.path.padEnd(38)} ${String(r.firstLoadKb).padStart(7)} KB   ${String(r.files).padStart(5)}   ${String(r.withPrefetchKb).padStart(10)} KB         ${r.kannadaFiles.length}`)
}
console.log(report.problems.length ? `\nPROBLEMS:\n- ${report.problems.join('\n- ')}` : '\nNo problems: English visitors download no Kannada, every first load is under 100 KB.')
process.exit(report.problems.length ? 1 : 0)
