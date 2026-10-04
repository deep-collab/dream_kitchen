// Step 1 QA: screenshots + automated checks.
// Usage: start `npm run preview -- --port 4173` and `npm run dev -- --port 5173`, then
//   node scripts/qa-step1.mjs [outDir]
import { mkdirSync, writeFileSync } from 'node:fs'
import { chromium } from 'playwright'
import { site } from '../src/config/site.js'

const PROD = 'http://localhost:4173'
const DEV = 'http://localhost:5173'
const OUT = process.argv[2] || 'docs/screenshots/step1'
const WIDTHS = [360, 390, 768, 1280]
const HEIGHT = { 360: 780, 390: 844, 768: 1024, 1280: 800 }
const LANGS = ['en', 'kn']
const ROUTES = ['/', '/shop', '/product/classic-dark-chocolate-bar', '/cart', '/checkout', '/track', '/classes', '/our-story', '/gallery', '/contact', '/faq', '/nope']
const report = { overflow: [], smallTargets: [], links: [], loader: [], focus: [], notes: [] }
mkdirSync(OUT, { recursive: true })

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const shot = (page, name, opts = {}) => page.screenshot({ path: `${OUT}/${name}.png`, ...opts })

async function context(browser, width, lang, { intro = false, reducedMotion = 'no-preference' } = {}) {
  const ctx = await browser.newContext({ viewport: { width, height: HEIGHT[width] }, reducedMotion, deviceScaleFactor: 1 })
  await ctx.addInitScript(
    ([l, skipIntro]) => {
      try {
        localStorage.setItem('dk_lang', l)
        if (skipIntro) sessionStorage.setItem('dk_intro_seen', '1')
      } catch {}
    },
    [lang, !intro],
  )
  return ctx
}

async function ready(page) {
  await page.waitForFunction(() => window.__dkReady === true && !document.getElementById('dk-intro'))
  await page.evaluate(() => document.fonts.ready)
  await sleep(150)
}

async function main() {
  const browser = await chromium.launch()

  for (const width of WIDTHS) {
    for (const lang of LANGS) {
      const tag = `${width}-${lang}`

      // Loading screen: start, mid, end
      {
        const ctx = await context(browser, width, lang, { intro: true })
        const page = await ctx.newPage()
        const t0 = Date.now()
        await page.goto(PROD + '/', { waitUntil: 'commit' })
        await page.waitForSelector('#dk-intro', { state: 'attached' }).catch(() => {})
        await sleep(Math.max(0, 250 - (Date.now() - t0)))
        await shot(page, `loader-1-start-${tag}`)
        await sleep(Math.max(0, 1000 - (Date.now() - t0)))
        await shot(page, `loader-2-mid-${tag}`)
        await sleep(Math.max(0, 1380 - (Date.now() - t0)))
        await shot(page, `loader-3-end-${tag}`)
        await page.waitForFunction(() => !document.getElementById('dk-intro'), null, { timeout: 4000 })
        const gone = Date.now() - t0
        report.loader.push(`${tag}: loader removed ~${gone}ms after navigation start (wall clock)`)
        await ctx.close()
      }

      const ctx = await context(browser, width, lang)
      const page = await ctx.newPage()
      await page.goto(PROD + '/')
      await ready(page)

      await shot(page, `hero-${tag}`)
      await shot(page, `header-${tag}`, { clip: { x: 0, y: 0, width, height: await page.evaluate(() => document.querySelector('main').getBoundingClientRect().top) } })

      if (width < 768) {
        await shot(page, `bottombar-${tag}`, { clip: { x: 0, y: HEIGHT[width] - 110, width, height: 110 } })
      }
      if (width < 1280) {
        await page.getByRole('button', { name: lang === 'en' ? 'Menu' : 'ಮೆನು' }).click()
        await sleep(400)
        await shot(page, `menu-open-${tag}`)
        const menu = await page.evaluate(() => {
          const d = document.querySelector('[role="dialog"]')
          return { focusInside: d?.contains(document.activeElement) }
        })
        if (!menu.focusInside) report.focus.push(`${tag}: focus not moved into the mobile menu`)
        await page.keyboard.press('Escape')
        await sleep(400)
        const restored = await page.evaluate(() => document.activeElement?.getAttribute('aria-haspopup') === 'dialog')
        if (!restored) report.focus.push(`${tag}: focus did not return to the menu button after Esc`)
      }

      await page.evaluate(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'instant' }))
      await sleep(300)
      await shot(page, `footer-${tag}`)

      // Per-route checks
      for (const route of ROUTES) {
        await page.goto(PROD + route)
        await ready(page)
        const r = await page.evaluate(() => {
          const doc = document.documentElement
          const overflow = doc.scrollWidth > doc.clientWidth + 1
          const small = []
          document.querySelectorAll('a[href], button, input:not([type=hidden]), select, textarea, summary, [role=switch]').forEach((el) => {
            const b = el.getBoundingClientRect()
            const cs = getComputedStyle(el)
            if (!b.width || !b.height || cs.visibility === 'hidden' || el.closest('.sr-only') || el.classList.contains('sr-only')) return
            if (el.matches('input[type=radio], input[type=checkbox]')) return // the visible label card is the target
            if (b.height < 47.5 || b.width < 47.5) small.push(`${el.tagName.toLowerCase()} "${(el.innerText || el.getAttribute('aria-label') || el.name || '').trim().slice(0, 40)}" ${Math.round(b.width)}x${Math.round(b.height)}`)
          })
          const tel = [...document.querySelectorAll('a[href^="tel:"]')].map((a) => a.getAttribute('href'))
          const wa = [...document.querySelectorAll('a[href*="wa.me"]')].map((a) => a.getAttribute('href').split('?')[0])
          return { overflow, small, tel, wa }
        })
        if (r.overflow) report.overflow.push(`${tag} ${route}`)
        r.small.forEach((s) => report.smallTargets.push(`${tag} ${route}: ${s}`))
        const badTel = r.tel.filter((h) => h !== `tel:${site.phone.tel}`)
        const badWa = r.wa.filter((h) => h !== `https://wa.me/${site.whatsapp}`)
        if (route === '/') report.links.push(`${tag}: ${r.tel.length} tel links, ${r.wa.length} wa.me links`)
        if (badTel.length || badWa.length) report.links.push(`${tag} ${route}: BAD ${[...badTel, ...badWa].join(', ')}`)
      }
      await ctx.close()

      // Styleguide (dev server only)
      const sg = await context(browser, width, lang)
      const sp = await sg.newPage()
      await sp.goto(DEV + '/styleguide')
      await ready(sp)
      await sleep(600)
      await shot(sp, `styleguide-${tag}`, { fullPage: true })
      if (width === 390 && lang === 'en') {
        await sp.getByRole('button', { name: 'Open the sample sheet' }).first().click()
        await sleep(500)
        await shot(sp, `sheet-open-${tag}`)
        const s = await sp.evaluate(() => ({
          focusInside: document.querySelector('[role=dialog]')?.contains(document.activeElement),
          bar: getComputedStyle(document.querySelector('nav.fixed')).transform,
        }))
        report.notes.push(`sheet ${tag}: focus inside=${s.focusInside}, bottom bar transform=${s.bar}`)
        await sp.keyboard.press('Escape')
        await sleep(400)
        report.notes.push(`sheet ${tag}: closed by Esc=${!(await sp.$('[role=dialog]'))}`)
      }
      await sg.close()
    }
  }

  // Loader once per session + reduced motion + skip
  {
    const ctx = await context(browser, 390, 'en', { intro: true })
    const page = await ctx.newPage()
    await page.goto(PROD + '/', { waitUntil: 'commit' })
    const had = await page.waitForSelector('#dk-intro', { state: 'attached', timeout: 2000 }).then(() => true, () => false)
    await page.waitForFunction(() => !document.getElementById('dk-intro'), null, { timeout: 4000 })
    await page.goto(PROD + '/shop', { waitUntil: 'domcontentloaded' })
    const again = await page.evaluate(() => document.documentElement.classList.contains('dk-intro-on'))
    report.loader.push(`first visit shows loader=${had}; reload in same session shows loader=${again}`)
    await ctx.close()

    const ctx2 = await context(browser, 390, 'en', { intro: true })
    const p2 = await ctx2.newPage()
    const t0 = Date.now()
    await p2.goto(PROD + '/', { waitUntil: 'commit' })
    await p2.waitForSelector('#dk-intro', { state: 'attached' })
    await sleep(300)
    await p2.mouse.click(200, 400)
    await p2.waitForFunction(() => !document.getElementById('dk-intro'), null, { timeout: 3000 })
    report.loader.push(`tap to skip: gone ~${Date.now() - t0}ms after navigation (tapped at ~300ms)`)
    await ctx2.close()

    const ctx3 = await context(browser, 390, 'en', { intro: true, reducedMotion: 'reduce' })
    const p3 = await ctx3.newPage()
    const t1 = Date.now()
    await p3.goto(PROD + '/', { waitUntil: 'commit' })
    await p3.waitForSelector('#dk-intro', { state: 'attached' })
    await sleep(200)
    await shot(p3, 'loader-reduced-motion-390-en')
    await p3.waitForFunction(() => !document.getElementById('dk-intro'), null, { timeout: 3000 })
    report.loader.push(`reduced motion: gone ~${Date.now() - t1}ms after navigation`)
    await ctx3.close()

    // Slow app: the 2.5 s cap must hold even when the JS bundle is delayed
    const ctx4 = await context(browser, 390, 'en', { intro: true })
    await ctx4.route('**/assets/*.js', async (route) => {
      await sleep(4000)
      await route.continue()
    })
    const p4 = await ctx4.newPage()
    await p4.goto(PROD + '/', { waitUntil: 'commit' })
    await p4.waitForSelector('#dk-intro', { state: 'attached' })
    const capped = await p4.waitForFunction(() => !document.getElementById('dk-intro'), null, { timeout: 6000 }).then(
      () => p4.evaluate(() => Math.round(performance.now())),
      () => 'NOT REMOVED',
    )
    report.loader.push(`JS delayed 4 s: loader removed at performance.now()=${capped}ms`)
    await ctx4.close()
  }

  // Keyboard focus visibility on the home page
  {
    const ctx = await context(browser, 1280, 'en')
    const page = await ctx.newPage()
    await page.goto(PROD + '/')
    await ready(page)
    const missing = []
    for (let i = 0; i < 25; i++) {
      await page.keyboard.press('Tab')
      const f = await page.evaluate(() => {
        const el = document.activeElement
        const cs = getComputedStyle(el)
        return { name: (el.innerText || el.getAttribute('aria-label') || el.tagName).trim().slice(0, 30), outline: cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) >= 2 }
      })
      if (!f.outline) missing.push(f.name)
      if (i === 2) await shot(page, 'focus-ring-1280-en')
    }
    report.focus.push(missing.length ? `no visible outline on: ${missing.join(' | ')}` : 'first 25 Tab stops all show the focus ring')
    await ctx.close()
  }

  await browser.close()
  writeFileSync(`${OUT}/qa-report.json`, JSON.stringify(report, null, 2))
  console.log(JSON.stringify(report, null, 2))
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
