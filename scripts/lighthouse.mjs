// Lighthouse, mobile settings (Lighthouse defaults: Moto G-class phone, slow 4G), on the
// production build. Needs `npm run build` and `npm run preview -- --port 4173`, then:
//   node scripts/lighthouse.mjs <label> [lang]        e.g. node scripts/lighthouse.mjs after en
// Writes docs/screenshots/step5/lighthouse-<label>[-kn].json and prints a table.
//
// Cart and checkout are measured with a real cart. Lighthouse would wipe storage before each
// run, and ignores a profile passed through --chrome-flags, so instead: one profile is filled
// once (cart + language) and its HTTP cache cleared; every run gets a fresh copy of it, its own
// Chrome, and Lighthouse attaches with --port --disable-storage-reset. Storage is kept, the
// cache is cold, and runs stay comparable. A run that lands on another URL (e.g. an empty cart
// redirecting to /cart) is an error, not a result.
// Lighthouse runs through npx: a measuring tool only, not part of the site or package.json.
import { execFileSync, spawn } from 'node:child_process'
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, join } from 'node:path'
import { chromium } from 'playwright'

// DK_LH_BASE=https://localhost:4443 measures over HTTP/2 (scripts/serve-http2.mjs), as Netlify serves
const BASE = process.env.DK_LH_BASE || 'http://localhost:4173'
const label = process.argv[2] || 'run'
const lang = process.argv[3] || 'en'
const OUT = 'docs/screenshots/step5'
const PAGES = [
  ['Home', '/'],
  ['Menu', '/shop'],
  ['Product', '/product/ferrero-rocher-nutella-tub'],
  ['Cart', '/cart'],
  ['Checkout', '/checkout'],
]
const CATS = ['performance', 'accessibility', 'best-practices', 'seo']
// Performance varies run to run: report the median. DK_LH_RUNS / DK_LH_ONLY (e.g. Home) narrow a debugging run.
const RUNS = Number(process.env.DK_LH_RUNS) || 3
const DETAIL_AUDITS = ['label-content-name-mismatch', 'layout-shifts', 'color-contrast', 'target-size', 'unsized-images']
const PORT = 9333
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
mkdirSync(OUT, { recursive: true })
const work = mkdtempSync(join(tmpdir(), 'dk-lh-'))
const seed = join(work, 'seed')

// 1. One profile with a cart and the language chosen, then a cold cache
{
  const ctx = await chromium.launchPersistentContext(seed, { headless: true, ignoreHTTPSErrors: true })
  const page = await ctx.newPage()
  await page.goto(BASE + '/shop')
  await page.waitForFunction(() => window.__dkReady === true)
  // The production build has no /src: write one line in the stored format (src/lib/cart.js)
  await page.evaluate((l) => {
    localStorage.setItem('dk_lang', l)
    const line = {
      id: 'lh1', kind: 'product', productId: 'oreo-overload-tub', slug: 'oreo-overload-tub', image: 'tub',
      name: { en: 'Oreo Overload' }, sectionName: null,
      selection: { size: '250g', flavour: null, nameOn: false, name: '', occasion: null, note: '' },
      labels: { size: { en: '250g' }, flavour: null, occasion: null }, unitPrice: 399, qty: 1,
    }
    localStorage.setItem('dk_cart_v2', JSON.stringify({ version: 2, lines: [line] }))
  }, lang)
  await ctx.close()
  // Keep the stored cart, drop every cache, so each run is a first visit
  for (const dir of ['Cache', 'Code Cache', 'GPUCache', 'Service Worker', 'DawnGraphiteCache', 'DawnWebGPUCache'])
    rmSync(join(seed, 'Default', dir), { recursive: true, force: true, maxRetries: 5, retryDelay: 300 })
}
const chromePath = chromium.executablePath()

const portFree = async (port) => {
  try {
    await fetch(`http://127.0.0.1:${port}/json/version`)
    return false
  } catch {
    return true
  }
}

// Ends every Chrome using this run's profile. On Windows, killing the first process can
// leave helpers running (and still listening), so match by profile path instead.
function stopChrome(chrome, dir) {
  try {
    if (process.platform === 'win32') {
      const needle = dir.replaceAll("'", "''")
      execFileSync('powershell', ['-NoProfile', '-Command', `Get-CimInstance Win32_Process -Filter "Name='chrome.exe'" | Where-Object { $_.CommandLine -like '*${needle}*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }`], { stdio: 'ignore' })
    } else chrome.kill()
  } catch {
    /* already gone */
  }
}

let nextPort = PORT
async function runOnce(url, file) {
  const dir = join(work, `run-${Date.now()}`)
  cpSync(seed, dir, { recursive: true })
  // A new port every run: Lighthouse must never attach to an older, warm browser
  let port = nextPort++
  while (!(await portFree(port))) port = nextPort++
  const chrome = spawn(chromePath, ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${dir}`, '--no-first-run', '--no-default-browser-check', '--ignore-certificate-errors', 'about:blank'], { stdio: 'ignore' })
  try {
    for (let i = 0; i < 50; i++) {
      try {
        if ((await fetch(`http://127.0.0.1:${port}/json/version`)).ok) break
      } catch {
        /* not up yet */
      }
      await sleep(200)
    }
    try {
      execFileSync('npx', ['-y', 'lighthouse@12', url, '--quiet', '--output=json', `--output-path=${file}`, `--only-categories=${CATS.join(',')}`, `--port=${port}`, '--disable-storage-reset'], {
        stdio: 'ignore',
        shell: true,
        timeout: 240000,
      })
    } catch {
      /* non-zero exit with a written report happens on Windows; a missing report fails below */
    }
    // DK_LH_RAW=<folder>: also keep the full Lighthouse reports there, for digging into one result
    if (process.env.DK_LH_RAW) cpSync(file, join(process.env.DK_LH_RAW, basename(file)))
    return JSON.parse(readFileSync(file, 'utf8'))
  } finally {
    stopChrome(chrome, dir)
    await sleep(800)
    try {
      rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 300 })
    } catch {
      /* Windows can hold the profile a little longer; the whole temp folder is removed at the end */
    }
  }
}

const results = []
for (const [name, path] of PAGES.filter(([n]) => !process.env.DK_LH_ONLY || n === process.env.DK_LH_ONLY)) {
  const runs = []
  for (let i = 0; i < RUNS; i++) {
    const r = await runOnce(BASE + path, join(work, `lh-${name}-${i}.json`))
    const landed = r.finalDisplayedUrl.replace(BASE, '')
    if (landed !== path) throw new Error(`${name}: asked for ${path} but Lighthouse landed on ${landed}. Not measuring the right page.`)
    const jsBytes = (r.audits['network-requests']?.details?.items || []).filter((x) => x.resourceType === 'Script').reduce((n, x) => n + (x.transferSize || 0), 0)
    if (jsBytes < 1024) throw new Error(`${name}: no JavaScript was downloaded, so the cache was warm. Not a first visit.`)
    runs.push({
      scores: Object.fromEntries(CATS.map((c) => [c, Math.round((r.categories[c]?.score ?? 0) * 100)])),
      lcp: Math.round(r.audits['largest-contentful-paint'].numericValue),
      tbt: Math.round(r.audits['total-blocking-time'].numericValue),
      cls: Number(r.audits['cumulative-layout-shift'].numericValue.toFixed(3)),
      fcp: Math.round(r.audits['first-contentful-paint'].numericValue),
      jsKb: Math.round((r.audits['network-requests']?.details?.items || []).filter((x) => x.resourceType === 'Script').reduce((n, x) => n + (x.transferSize || 0), 0) / 1024),
      failing: Object.values(r.audits)
        .filter((a) => a.score !== null && a.score < 0.9 && !['informative', 'notApplicable', 'manual'].includes(a.scoreDisplayMode))
        .map((a) => `${a.id}${a.displayValue ? ` (${a.displayValue})` : ''}`),
      details: Object.fromEntries(
        DETAIL_AUDITS.filter((id) => r.audits[id]?.score !== null && r.audits[id]?.score < 1 && r.audits[id]?.details?.items?.length).map((id) => [
          id,
          r.audits[id].details.items.slice(0, 6).map((it) => (it.node || it).snippet || (it.node || it).selector || JSON.stringify(it).slice(0, 120)),
        ]),
      ),
      lcpElement: r.audits['largest-contentful-paint-element']?.details?.items?.[0]?.items?.[0]?.node?.snippet || '',
    })
  }
  runs.sort((a, b) => a.scores.performance - b.scores.performance)
  results.push({ name, path, ...runs[Math.floor(runs.length / 2)], perfRuns: runs.map((x) => x.scores.performance) })
}
try {
  rmSync(work, { recursive: true, force: true, maxRetries: 5, retryDelay: 500 })
} catch {
  console.warn(`(could not remove ${work}; safe to delete by hand)`)
}

const suffix = lang === 'en' ? '' : `-${lang}`
writeFileSync(`${OUT}/lighthouse-${label}${suffix}.json`, JSON.stringify(results, null, 2))
console.log(`Lighthouse mobile (${label}, ${lang}), median of ${RUNS} runs`)
console.log('Page      Perf  A11y  BP   SEO    FCP     LCP     TBT    CLS    JS (transferred)')
for (const r of results)
  console.log(
    `${r.name.padEnd(9)} ${String(r.scores.performance).padStart(4)}  ${String(r.scores.accessibility).padStart(4)}  ${String(r.scores['best-practices']).padStart(3)}  ${String(r.scores.seo).padStart(4)}  ${String(r.fcp).padStart(5)}ms ${String(r.lcp).padStart(5)}ms ${String(r.tbt).padStart(4)}ms  ${r.cls.toFixed(3)}  ${r.jsKb} KB   (perf runs ${r.perfRuns.join('/')})`,
  )
for (const r of results) {
  if (r.failing.length) console.log(`\n${r.name} audits under 0.9: ${r.failing.join(', ')}`)
  for (const [id, items] of Object.entries(r.details)) console.log(`  ${id}: ${items.join(' | ')}`)
  if (r.lcpElement) console.log(`  LCP element: ${r.lcpElement}`)
}
