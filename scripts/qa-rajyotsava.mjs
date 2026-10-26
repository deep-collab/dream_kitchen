// QA for the Rajyotsava request (26 Oct 2026), in real browsers on the practice database:
//   - the site background (Karnataka flag) behind every page: faint, behind the words, moving only
//     without "reduce motion", gone (back to the logo) after its end date
//   - the offer banner: first thing on Home, photo cut 16:9 (phones) / 3:1 (bigger screens), end date,
//     "Shop the offer", slides with dots, "Order now" still on the first screen
//   - "Shop the offer": the menu with only the offer's products, badge, crossed-out price, "Show full
//     menu", the "Offers" tab; the offer price in the product sheet and the cart
//   - the admin: 7 taps on the version unlock the developer options, Site background with preview,
//     the offer form (products, special price, crop tool)
// At 360, 390 and 1280px, English and Kannada, in Chromium (Android Chrome) and WebKit (iPhone Safari).
// Checks console errors, sideways scroll and targets under 48px. Screenshots: docs/screenshots/rajyotsava/.
//
// Needs the dev server with a FRESH practice database and the practice admin as the developer:
//   UPI_ID=dreamkitchen@okaxis DK_DEV_ADMIN_EMAIL=hema@example.com DK_DEV_ADMIN_PASSWORD=dev-only-pass \
//   DK_DEV_ADMIN_ROLE=developer DK_RELAX_LIMITS=1 DK_DEV_DATA_DIR=.dev-data/<new folder> npx vite --port 5173
// then: node scripts/qa-rajyotsava.mjs   (exits non-zero on any problem)
import { mkdirSync, writeFileSync } from 'node:fs'
import { chromium, webkit, devices } from 'playwright'
import sharp from 'sharp'
import { istToday } from '../src/lib/offers.js'
import { addDaysISO } from '../src/lib/dates.js'

const BASE = process.env.DK_BASE || 'http://localhost:5173'
const OUT = process.env.DK_OUT || 'docs/screenshots/rajyotsava'
const ADMIN = { email: process.env.DK_DEV_ADMIN_EMAIL || 'hema@example.com', password: process.env.DK_DEV_ADMIN_PASSWORD || 'dev-only-pass' }
mkdirSync(OUT, { recursive: true })
const report = { consoleErrors: [], overflow: [], smallTargets: [], flows: [], failures: [] }
const fail = (m) => (report.failures.push(m), console.error('FAIL', m))
const ok = (m) => (report.flows.push(m), console.log('ok  ', m))
const check = (cond, good, bad) => (cond ? ok(good) : fail(bad))
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const today = istToday()

/* ---------- setup through the admin API (as the admin pages do it) ---------- */
const api = async (body, token) => {
  const r = await fetch(`${BASE}/api/admin`, { method: 'POST', headers: { 'content-type': 'application/json', origin: BASE, ...(token ? { authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(body) })
  const data = await r.json()
  if (!r.ok) throw new Error(`${body.action}: ${r.status} ${JSON.stringify(data)}`)
  return data
}
const { accessToken } = await api({ action: 'login', ...ADMIN })
const act = (action, body = {}) => api({ action, ...body }, accessToken)

// A festive sample photo: red and yellow (the Karnataka flag colours) with gold circles, as a real photo would be
const svg = (w, h) => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f6c512"/><stop offset="0.55" stop-color="#e2492a"/><stop offset="1" stop-color="#7a1a12"/></linearGradient></defs><rect width="100%" height="100%" fill="url(#g)"/>${[0.2, 0.45, 0.7, 0.88].map((x, i) => `<circle cx="${x * w}" cy="${(0.3 + (i % 2) * 0.35) * h}" r="${h * 0.16}" fill="#2a1d16" opacity="0.55"/><circle cx="${x * w}" cy="${(0.3 + (i % 2) * 0.35) * h}" r="${h * 0.1}" fill="#d4af37"/>`).join('')}</svg>`
const webp = async (w, h) => `data:image/webp;base64,${(await sharp(Buffer.from(svg(w, h))).webp({ quality: 80 }).toBuffer()).toString('base64')}`
const photoFile = await sharp(Buffer.from(svg(2400, 1350))).jpeg({ quality: 85 }).toBuffer()

const raj = await act('saveOffer', {
  title: { en: 'Kannada Rajyotsava: 10% off', kn: 'ಕನ್ನಡ ರಾಜ್ಯೋತ್ಸವ: 10% ರಿಯಾಯಿತಿ' },
  message: { en: 'Delight Boxes and Pista Bars, three days only.', kn: 'ಡಿಲೈಟ್ ಬಾಕ್ಸ್ ಮತ್ತು ಪಿಸ್ತಾ ಬಾರ್, ಮೂರು ದಿನ ಮಾತ್ರ.' },
  badge: { en: 'Rajyotsava offer', kn: 'ರಾಜ್ಯೋತ್ಸವ ಆಫರ್' },
  link: '',
  items: { categories: ['delight-boxes'], products: ['pista-bar'] },
  deal: { kind: 'percent', value: 10 },
  startsOn: today,
  endsOn: addDaysISO(today, 2),
})
await act('offerPhoto', { id: raj.id, variant: 'wide', image: await webp(1500, 500), imageSmall: await webp(750, 250) })
await act('offerPhoto', { id: raj.id, variant: 'phone', image: await webp(1200, 675), imageSmall: await webp(600, 338) })
await act('saveOffer', { title: { en: 'Free name on every Delight Box', kn: 'ಪ್ರತಿ ಡಿಲೈಟ್ ಬಾಕ್ಸ್ ಮೇಲೆ ಹೆಸರು ಉಚಿತ' }, message: { en: 'Up to 20 letters, English or Kannada.' }, link: 'category:delight-boxes', startsOn: today, endsOn: addDaysISO(today, 5) })
await act('saveBackground', { background: { themes: { rajyotsava: { on: true, opacity: 8, animate: true, startsOn: today, endsOn: addDaysISO(today, 2) } } } })
ok('setup: Rajyotsava offer (10% off, photo in two shapes), a text-only offer, the flag background')

/* ---------- browsers ---------- */
async function audit(page, label) {
  const r = await page.evaluate(() => {
    const small = []
    document.querySelectorAll('a[href], button, input:not([type=hidden]):not([type=checkbox]):not([type=radio]):not([type=file]):not([type=range]), select, textarea').forEach((el) => {
      const b = el.getBoundingClientRect()
      if (!b.width || !b.height || el.closest('.sr-only, [aria-hidden=true], [inert]') || getComputedStyle(el).visibility === 'hidden') return
      if (b.height < 47.5 || (b.width < 47.5 && !el.matches('input, select, textarea'))) small.push(`${el.tagName.toLowerCase()} "${(el.innerText || el.getAttribute('aria-label') || '').trim().slice(0, 30)}" ${Math.round(b.width)}x${Math.round(b.height)}`)
    })
    return { overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth, small }
  })
  if (r.overflow > 1) report.overflow.push(`${label}: ${r.overflow}px`)
  for (const s of r.small) report.smallTargets.push(`${label}: ${s}`)
}
const ready = (page) => page.waitForFunction(() => window.__dkReady === true, null, { timeout: 20000 })
const shot = (page, name, full = false) => page.screenshot({ path: `${OUT}/${name}.png`, fullPage: full })

async function newPage(engine, { width, height, lang = 'en', reducedMotion = 'no-preference', clockAt = null }) {
  const phone = width < 768
  const base = engine === webkit && phone ? devices['iPhone 13'] : {}
  const ctx = await engine.newContext({ ...base, viewport: { width, height }, deviceScaleFactor: 2, hasTouch: phone, isMobile: engine === chromium ? phone : base.isMobile, reducedMotion })
  if (clockAt) await ctx.clock?.setFixedTime?.(clockAt)
  await ctx.addInitScript((l) => {
    localStorage.setItem('dk_intro_seen', '1')
    localStorage.setItem('dk_lang', l)
  }, lang)
  const page = await ctx.newPage()
  const label = () => `${engine.name()} ${width} ${lang}`
  page.on('pageerror', (e) => report.consoleErrors.push(`${label()} ${page.url()}: ${e.message}`))
  page.on('console', (m) => m.type() === 'error' && !/status of 40[0134]|Failed to load resource/.test(m.text()) && report.consoleErrors.push(`${label()} ${page.url()}: ${m.text()}`))
  return { ctx, page }
}

const SIZES = [
  [360, 640],
  [390, 844],
  [1280, 800],
]
const shown = '[data-dk-offers=banner] [data-dk-offer]:not([inert])'

for (const engine of [chromium, webkit]) {
  const browser = await engine.launch()
  const en = engine.name()
  try {
    for (const lang of ['en', 'kn']) {
      for (const [width, height] of SIZES) {
        const tag = `${en}-${width}-${lang}`
        const { ctx, page: p } = await newPage(browser, { width, height, lang })
        await p.goto(`${BASE}/`)
        await ready(p)
        await p.waitForSelector('[data-dk-offers=banner] [data-dk-offer-link]', { timeout: 15000 })
        await p.waitForSelector('canvas[data-dk-bg=rajyotsava]', { timeout: 10000 })
        await sleep(900)
        const info = await p.evaluate(() => {
          const banner = document.querySelector('[data-dk-offers=banner]').getBoundingClientRect()
          const order = document.querySelector('[data-dk-order]').getBoundingClientRect()
          // the phone tab bar (fixed at the bottom); hidden on bigger screens
          const bar = [...document.querySelectorAll('nav')].find((n) => getComputedStyle(n).position === 'fixed' && n.getBoundingClientRect().height > 0)
          const page = document.querySelector('#dk-app > canvas[data-dk-bg]')
          const hero = document.querySelector('section.on-dark canvas[data-dk-bg]')
          const slide = document.querySelector('[data-dk-offers=banner] [data-dk-offer]:not([inert])')
          const img = slide.querySelector('img')
          return {
            bannerH: banner.height,
            bannerTop: banner.top,
            orderBottom: order.bottom,
            visible: Math.min(innerHeight, bar ? bar.getBoundingClientRect().top : innerHeight),
            pageBg: page && { opacity: Number(getComputedStyle(page).opacity), z: getComputedStyle(page).zIndex, pos: getComputedStyle(page).position, events: getComputedStyle(page).pointerEvents },
            heroBg: Boolean(hero),
            heroLogo: Boolean(document.querySelector('section.on-dark .dk-drift')),
            img: img && { src: img.currentSrc, ratio: Math.round((img.getBoundingClientRect().width / img.getBoundingClientRect().height) * 100) / 100 },
            ends: slide.querySelector('[data-dk-offer-ends]')?.innerText,
            dots: document.querySelectorAll('[data-dk-offer-dot]').length,
          }
        })
        check(info.orderBottom <= info.visible, `${tag}: "Order now" on the first screen (bottom ${Math.round(info.orderBottom)} of ${Math.round(info.visible)}px, banner ${Math.round(info.bannerH)}px)`, `${tag}: Order now below the first screen (${Math.round(info.orderBottom)} > ${Math.round(info.visible)})`)
        check(info.bannerTop < 140, `${tag}: the banner is the first thing under the header`, `${tag}: banner starts at ${info.bannerTop}px`)
        check(info.pageBg && info.pageBg.opacity > 0.05 && info.pageBg.opacity <= 0.2 && info.pageBg.pos === 'fixed' && info.pageBg.events === 'none', `${tag}: flag background faint (${info.pageBg?.opacity}), fixed, never in the way`, `${tag}: page background ${JSON.stringify(info.pageBg)}`)
        check(info.heroBg && !info.heroLogo, `${tag}: the hero shows the flag instead of the logo`, `${tag}: hero background wrong`)
        const wantPhone = width < 768
        // phones: the 16:9 cut (small, beside the words, on short phones)
        const ratioOk = Math.abs(info.img?.ratio - 16 / 9) < 0.05
        check(info.img && (wantPhone ? /-phone\//.test(info.img.src) && ratioOk : !/-phone\//.test(info.img.src)), `${tag}: the ${wantPhone ? '16:9 phone' : '3:1 wide'} photo (${info.img?.ratio})`, `${tag}: wrong photo ${JSON.stringify(info.img)}`)
        check(/\d/.test(info.ends || ''), `${tag}: end date shown ("${info.ends}")`, `${tag}: no end date`)
        check(info.dots === 2, `${tag}: two offers, two dots`, `${tag}: ${info.dots} dots`)
        await audit(p, `${tag} home`)
        await shot(p, `home-${tag}`)

        // The second slide by swiping (phones) or its dot
        if (wantPhone && en === 'chromium') {
          await p.locator('[data-dk-offers=banner] [data-dk-offer]').first().hover()
          await p.evaluate(() => document.querySelector('[data-dk-offers=banner] .snap-x').scrollBy({ left: 400, behavior: 'instant' }))
        } else await p.locator('[data-dk-offer-dot]').nth(1).click()
        await sleep(700)
        const second = await p.locator(shown).innerText()
        check(/Free name|ಹೆಸರು ಉಚಿತ/.test(second), `${tag}: the second offer shows (swipe or dot)`, `${tag}: second slide: ${second.slice(0, 40)}`)
        if (width === 390) await shot(p, `home-second-slide-${tag}`)
        await p.locator('[data-dk-offer-dot]').nth(0).click()
        await sleep(600)

        // Shop the offer
        await p.locator(`${shown} [data-dk-offer-link]`).click()
        await p.waitForSelector('[data-dk-offer-menu]')
        await sleep(400)
        const menu = await p.evaluate(() => ({
          url: location.pathname + location.search,
          cards: [...document.querySelectorAll('[data-dk-card]')].map((c) => c.innerText.replace(/\s+/g, ' ')),
          badges: document.querySelectorAll('[data-dk-offer-badge]').length,
          was: document.querySelectorAll('[data-dk-was-price]').length,
          full: Boolean(document.querySelector('[data-dk-full-menu]')),
          firstTab: document.querySelector('#menu-tabs [data-tab]')?.getAttribute('data-tab'),
          firstTabActive: document.querySelector('#menu-tabs [data-tab]')?.getAttribute('aria-current') === 'true',
          heading: document.querySelector('#offer-title')?.innerText,
        }))
        check(menu.url === `/menu?offer=${raj.id}`, `${tag}: "Shop the offer" opens the offer's menu`, `${tag}: went to ${menu.url}`)
        check(menu.cards.length === 5 && menu.badges === 5 && menu.was === 5, `${tag}: only the 5 offer items, each with the badge and the crossed-out price`, `${tag}: ${menu.cards.length} cards, ${menu.badges} badges, ${menu.was} old prices`)
        check(menu.cards.some((c) => /405/.test(c) && /450/.test(c)), `${tag}: Pista Bar ₹405 (was ₹450)`, `${tag}: pista price: ${menu.cards.find((c) => /Pista|ಪಿಸ್ತಾ/.test(c))}`)
        check(menu.full && menu.firstTab === 'offers' && menu.firstTabActive, `${tag}: "Show full menu" and the "Offers" tab first`, `${tag}: full ${menu.full}, first tab ${menu.firstTab}`)
        await audit(p, `${tag} offer menu`)
        await shot(p, `offer-menu-${tag}`)

        // The product sheet and the cart charge the offer price
        if (width !== 1280 || lang === 'en') {
          await p.locator('[data-dk-card]', { hasText: lang === 'kn' ? 'ಪಿಸ್ತಾ ಬಾರ್' : 'Pista Bar' }).locator('[data-dk-open]').click()
          await p.waitForSelector('[role=dialog] [data-dk-sheet-was]')
          const sheet = await p.locator('[role=dialog]').innerText()
          check(/405/.test(sheet) && /450/.test(sheet) && /Rajyotsava|ರಾಜ್ಯೋತ್ಸವ/.test(sheet), `${tag}: the sheet shows ₹405, the old ₹450 and the badge`, `${tag}: sheet: ${sheet.slice(0, 80)}`)
          if (width === 390) await shot(p, `sheet-${tag}`)
          await p.locator('[data-dk-add]').click()
          await sleep(400)
          await p.goto(`${BASE}/cart`)
          await ready(p)
          await sleep(500)
          const cart = await p.locator('main').innerText()
          check(/405/.test(cart) && !/₹450/.test(cart), `${tag}: the cart charges ₹405`, `${tag}: cart: ${cart.slice(0, 120)}`)
          if (width === 390) await shot(p, `cart-${tag}`)
        }

        // Back to the full menu: everything, sections again
        await p.goto(`${BASE}/menu?offer=${raj.id}`)
        await p.waitForSelector('[data-dk-full-menu]')
        await p.locator('[data-dk-full-menu]').click()
        await p.waitForSelector('#brownies')
        check(!(await p.locator('[data-dk-offer-menu]').count()) && (await p.locator('[data-dk-offers=strip]').count()) === 1, `${tag}: "Show full menu" brings back every section and the offer strip`, `${tag}: full menu not shown`)
        await audit(p, `${tag} menu`)
        await ctx.close()
      }
    }

    // Reduce motion: the background is drawn once and stays still; normal: it moves
    for (const reducedMotion of ['no-preference', 'reduce']) {
      const { ctx, page: p } = await newPage(browser, { width: 390, height: 844, reducedMotion })
      await p.goto(`${BASE}/menu`)
      await ready(p)
      await p.waitForSelector('canvas[data-dk-bg=rajyotsava]')
      await sleep(800)
      const frame = () => p.evaluate(() => document.querySelector('#dk-app > canvas[data-dk-bg]').toDataURL().length + ':' + document.querySelector('#dk-app > canvas[data-dk-bg]').toDataURL().slice(-200))
      const a = await frame()
      await sleep(900)
      const b = await frame()
      if (reducedMotion === 'reduce') check(a === b, `${en}: with "reduce motion" the flag stays still`, `${en}: the flag moves with reduce motion`)
      else check(a !== b, `${en}: the flag waves slowly`, `${en}: the flag does not move`)
      await ctx.close()
    }

    // After the end date the website goes back by itself (the visitor's clock moved past it)
    {
      const after = new Date(`${addDaysISO(today, 3)}T06:00:00Z`)
      const { ctx, page: p } = await newPage(browser, { width: 390, height: 844, clockAt: after })
      await p.goto(`${BASE}/`)
      await ready(p)
      await sleep(1500)
      const s = await p.evaluate(() => ({
        flag: Boolean(document.querySelector('canvas[data-dk-bg]')),
        logo: Boolean(document.querySelector('section.on-dark .dk-drift')),
        offers: [...document.querySelectorAll('[data-dk-offers=banner] [data-dk-offer]')].map((o) => o.innerText.slice(0, 30)),
      }))
      check(!s.flag && s.logo, `${en}: after the end date the logo is back, no flag`, `${en}: after the end date: ${JSON.stringify(s)}`)
      check(s.offers.length === 1 && /Free name/.test(s.offers[0]), `${en}: after the end date only the other offer shows`, `${en}: offers after the end: ${JSON.stringify(s.offers)}`)
      await shot(p, `after-end-date-${en}-390`)
      await ctx.close()
    }
  } finally {
    await browser.close()
  }
}

/* ---------- the admin (Chromium, phone and desktop) ---------- */
{
  const browser = await chromium.launch()
  for (const [width, height] of [
    [390, 844],
    [1280, 900],
  ]) {
    const tag = `admin-${width}`
    const { ctx, page } = await newPage(chromium === browser ? browser : browser, { width, height })
    await page.goto(`${BASE}/admin`)
    await page.fill('input[type=email]', ADMIN.email)
    await page.fill('input[type=password]', ADMIN.password)
    await page.click('button[type=submit]')
    await page.waitForSelector('nav[aria-label=Admin]')
    await page.goto(`${BASE}/admin/more`)
    await page.waitForSelector('[data-admin-version]')
    check(!(await page.locator('[data-admin-dev-section]').count()), `${tag}: the developer options are hidden at first`, `${tag}: developer options visible before unlocking`)
    for (let i = 0; i < 7; i++) await page.locator('[data-admin-version]').click()
    await page.waitForSelector('[data-admin-dev-section]')
    check((await page.locator('[data-admin-dev-note]').innerText()).includes('Developer options unlocked'), `${tag}: 7 taps on the version: "Developer options unlocked"`, `${tag}: no unlock message`)
    await audit(page, `${tag} more`)
    await shot(page, `${tag}-more-unlocked`, true)
    await page.locator('[data-admin-dev=background]').click()
    await page.waitForSelector('[data-admin-dev-background]')
    await page.waitForSelector('[data-admin-bg-preview=rajyotsava] canvas')
    check((await page.locator('[data-admin-bg-live]').getAttribute('data-admin-bg-live')) === 'rajyotsava', `${tag}: Site background says the flag shows today, with a preview`, `${tag}: wrong live background`)
    await page.locator('[data-admin-bg-opacity=diwali]').fill('12')
    await page.locator('[data-admin-bg-preview-btn=diwali]').click()
    await page.waitForSelector('[data-admin-bg-preview=diwali] canvas')
    await sleep(500)
    await audit(page, `${tag} background`)
    await shot(page, `${tag}-background`, false)
    await page.locator('[data-admin-dev-background]').evaluate(() => window.scrollTo(0, 0))
    await shot(page, `${tag}-background-full`, true)

    // The offer form: products, special price, crop tool
    await page.goto(`${BASE}/admin/offers`)
    await page.waitForSelector('[data-admin-offer-items]')
    await shot(page, `${tag}-offers-list`, true)
    await page.click('[data-admin-add-offer]')
    await page.locator('[data-admin-offer-title]').fill('Kannada Rajyotsava special')
    // "Every product on the website" + 50% off: every product is in the price table at half price
    await page.locator('[data-admin-offer-all]').check()
    await page.locator('[data-admin-offer-deal-kind=percent]').check()
    await page.locator('[data-admin-offer-deal-value]').fill('50')
    const rows = await page.locator('[data-admin-offer-prices] tbody tr').count()
    const halfAlmond = /Almond Bar\s*₹150\s*₹75/.test(await page.locator('[data-admin-offer-prices]').innerText())
    check(rows >= 20 && halfAlmond, `${tag}: “Every product” + 50%: ${rows} prices, Almond Bar ₹150 → ₹75`, `${tag}: every product: ${rows} rows, almond ${halfAlmond}`)
    await shot(page, `${tag}-offer-everything-50`, true)
    await page.locator('[data-admin-offer-all]').uncheck()
    await page.locator('[data-admin-offer-category=delight-boxes]').check()
    await page.locator('[data-admin-offer-product=pista-bar]').check()
    await page.locator('[data-admin-offer-badge]').fill('Rajyotsava offer')
    await page.locator('[data-admin-offer-deal-kind=percent]').check()
    await page.locator('[data-admin-offer-deal-value]').fill('15')
    const table = await page.locator('[data-admin-offer-prices]').innerText()
    check(/383/.test(table), `${tag}: the price table shows Pista Bar ₹450 → ₹383 (15% off)`, `${tag}: price table: ${table.slice(0, 120)}`)
    await page.setInputFiles('[data-admin-offer-photo]', { name: 'rajyotsava.jpg', mimeType: 'image/jpeg', buffer: photoFile })
    await page.waitForSelector('[data-admin-crop-frame=phone] img')
    const frames = await page.evaluate(() => ['wide', 'phone'].map((k) => {
      const b = document.querySelector(`[data-admin-crop-frame=${k}]`).getBoundingClientRect()
      return Math.round((b.width / b.height) * 100) / 100
    }))
    check(Math.abs(frames[0] - 3) < 0.03 && Math.abs(frames[1] - 1.78) < 0.03, `${tag}: crop frames are 3:1 and 16:9 (${frames.join(', ')})`, `${tag}: crop frames ${frames.join(', ')}`)
    // drag the photo inside the phone frame
    const box = await page.locator('[data-admin-crop-frame=phone]').boundingBox()
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
    await page.mouse.down()
    await page.mouse.move(box.x + box.width / 2 - 60, box.y + box.height / 2, { steps: 5 })
    await page.mouse.up()
    await page.locator('[data-admin-crop-zoom=wide]').fill('1.4')
    await audit(page, `${tag} crop`)
    await shot(page, `${tag}-crop`, true)
    await page.locator('[data-admin-crop-done]').click()
    await page.locator('text=Photo ready').waitFor()
    await page.waitForSelector('[data-admin-offer-preview] img')
    await shot(page, `${tag}-offer-form`, true)
    await page.locator('[data-admin-offer-save]').click()
    await page.waitForSelector('[data-admin-offer-flash]')
    const m = await (await fetch(`${BASE}/api/menu?t=${Date.now()}`)).json()
    const added = m.offers.find((o) => o.title.en === 'Kannada Rajyotsava special')
    check(added && /-phone\//.test(added.photoPhone || '') && added.photo && added.deal?.value === 15, `${tag}: the new offer is live with both photo shapes and 15% off`, `${tag}: added offer ${JSON.stringify(added)?.slice(0, 200)}`)
    if (added) await act('deleteOffer', { id: added.id })
    await ctx.close()
  }
  await browser.close()
}

if (report.consoleErrors.length) fail(`console errors: ${report.consoleErrors.length}`)
if (report.overflow.length) fail(`sideways scroll: ${report.overflow.length}`)
if (report.smallTargets.length) fail(`targets under 48px: ${report.smallTargets.length}`)
writeFileSync(`${OUT}/qa-report.json`, JSON.stringify(report, null, 2))
console.log(`\n${report.flows.length} checks passed, ${report.failures.length} problems. Report: ${OUT}/qa-report.json`)
for (const list of ['consoleErrors', 'overflow', 'smallTargets']) for (const x of report[list].slice(0, 20)) console.log(`  ${list}: ${x}`)
process.exit(report.failures.length ? 1 : 0)
