// QA for the 27 Oct 2026 request, in real browsers on the practice database, with the SERVER and
// the browser both set to the day being checked (so the server's prices for that day are tested
// too, not just the page):
//   - Kannada Rajyotsava, 50% off everything: the popup (every new visit, not between pages, not
//     on the admin), the "Offer Zone 🎁" button in the header, the wide banner on Home, the Offer
//     Zone (every product, old price crossed out, "50% OFF"), the faint waving Karnataka flag
//   - the Kannada logo (hero and header), switching with the language button
//   - admin: a product with 5 sizes (each its own price and courier charge, reordered), a cookie tin,
//     the Rajyotsava card (Turn off this offer / on again)
//   - one full order at the offer price, through to the admin's order page, the packing slip and Track Order
// At 360 (640 and 740 tall), 390 and 1280px, English and Kannada, in Chromium (Android Chrome) and WebKit (iPhone Safari).
// Checks console errors, sideways scroll and targets under 48px. Screenshots: docs/screenshots/rajyotsava-november/.
//
// One run per day to check (DK_PHASE). Start the dev server with a FRESH practice database and the
// server's clock on that day (scripts/fake-clock.mjs), e.g. 1 Nov, five minutes after midnight in India:
//   DK_FAKE_NOW=2026-10-31T18:35:00Z UPI_ID=dreamkitchen@okaxis DK_DEV_ADMIN_EMAIL=hema@example.com \
//   DK_DEV_ADMIN_PASSWORD=dev-only-pass DK_RELAX_LIMITS=1 DK_DEV_DATA_DIR=.dev-data/<new folder> \
//   node --import ./scripts/fake-clock.mjs node_modules/vite/bin/vite.js --port 5173
// then: DK_PHASE=nov1 DK_FAKE_NOW=2026-10-31T18:35:00Z node scripts/qa-rajyotsava-november.mjs
// Phases: nov1 (everything; the default), nov30 (2026-11-30T18:25:00Z: still on), oct31
// (2026-10-31T18:25:00Z: not yet) and dec1 (2026-11-30T18:35:00Z: over). Exits non-zero on any problem.
import { mkdirSync, writeFileSync } from 'node:fs'
import { chromium, webkit, devices } from 'playwright'

const BASE = process.env.DK_BASE || 'http://localhost:5173'
const PHASE = process.env.DK_PHASE || 'nov1'
const LIVE = PHASE === 'nov1' || PHASE === 'nov30'
const OUT = process.env.DK_OUT || 'docs/screenshots/rajyotsava-november'
const ADMIN = { email: process.env.DK_DEV_ADMIN_EMAIL || 'hema@example.com', password: process.env.DK_DEV_ADMIN_PASSWORD || 'dev-only-pass' }
// The browser's clock follows the server's (the same fake moment, then running on)
const offset = Number.isFinite(Date.parse(process.env.DK_FAKE_NOW || '')) ? Date.parse(process.env.DK_FAKE_NOW) - Date.now() : 0
const fakeNow = () => new Date(Date.now() + offset)
mkdirSync(OUT, { recursive: true })
const report = { phase: PHASE, at: fakeNow().toISOString(), consoleErrors: [], overflow: [], smallTargets: [], flows: [], failures: [] }
const fail = (m) => (report.failures.push(m), console.error('FAIL', m))
const ok = (m) => (report.flows.push(m), console.log('ok  ', m))
const check = (cond, good, bad) => (cond ? ok(good) : fail(bad))
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/* ---------- the admin API (as the admin pages call it) ---------- */
const api = async (body, token) => {
  const r = await fetch(`${BASE}/api/admin`, { method: 'POST', headers: { 'content-type': 'application/json', origin: BASE, ...(token ? { authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(body) })
  const data = await r.json()
  if (!r.ok) throw new Error(`${body.action}: ${r.status} ${JSON.stringify(data)}`)
  return data
}
const { accessToken } = await api({ action: 'login', ...ADMIN })
const act = (action, body = {}) => api({ action, ...body }, accessToken)
const raj = (await act('offers')).rajyotsava
check(raj.exists && raj.percent === 50 && raj.startsOn === '2026-11-01' && raj.endsOn === '2026-11-30', `the practice database has the Rajyotsava offer (${raj.startsOn} – ${raj.endsOn}, ${raj.percent}%, ${raj.status})`, `Rajyotsava offer: ${JSON.stringify(raj)}`)
check(raj.status === (LIVE ? 'live' : PHASE === 'oct31' ? 'scheduled' : 'ended'), `admin says “${raj.status}” on ${PHASE}`, `admin status ${raj.status} on ${PHASE}`)

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
const menuLoaded = (page) => page.waitForFunction(() => document.querySelector('[data-dk-zone]') || window.__dkMenuSeen || performance.getEntriesByType('resource').some((e) => e.name.includes('/api/menu') && e.responseEnd > 0), null, { timeout: 20000 })
const shot = (page, name, full = false) => page.screenshot({ path: `${OUT}/${PHASE}-${name}.png`, fullPage: full })

const ENGINES = [
  { name: 'android', browser: chromium, device: devices['Pixel 7'] },
  { name: 'iphone', browser: webkit, device: devices['iPhone 14'] },
]
const SIZES = [
  [360, 640], // a short phone
  [360, 740],
  [390, 844],
  [1280, 800],
]
const launched = {}
let expect400 = false
async function newPage(engine, [width, height], { lang = 'en', intro = false, reduce = false } = {}) {
  launched[engine.name] ||= await engine.browser.launch()
  const phone = width < 768
  const ctx = await launched[engine.name].newContext({
    ...(phone ? { userAgent: engine.device.userAgent, isMobile: engine.name === 'android', hasTouch: true, deviceScaleFactor: 2 } : { deviceScaleFactor: 1 }),
    viewport: { width, height },
    reducedMotion: reduce ? 'reduce' : 'no-preference',
  })
  await ctx.addInitScript(
    ({ l, intro }) => {
      if (!intro) localStorage.setItem('dk_intro_seen', '1')
      if (l === 'kn') localStorage.setItem('dk_lang', 'kn')
    },
    { l: lang, intro },
  )
  const page = await ctx.newPage()
  await page.clock.setFixedTime(fakeNow())
  const label = `${engine.name}-${width}-${lang}`
  // A save the admin refuses on purpose (two sizes with the same name, step 4) answers 400: expected
  page.on('console', (m) => m.type() === 'error' && !(expect400 && /status of 400/.test(m.text())) && report.consoleErrors.push(`${label}: ${m.text()}`))
  page.on('pageerror', (e) => report.consoleErrors.push(`${label}: ${e.message}`))
  return { ctx, page, label }
}
const popup = (page) => page.locator('[data-dk-raj-popup]')
/** Waits for the popup (it comes about half a second after the page and its menu data) */
const popupShown = async (page, ms = 4000) => {
  try {
    await page.waitForSelector('[data-dk-raj-popup] [role=dialog]', { timeout: ms })
    return true
  } catch {
    return false
  }
}

/* ======================= 1. every engine, width and language ======================= */
for (const engine of ENGINES) {
  for (const size of SIZES) {
    for (const lang of ['en', 'kn']) {
      const { ctx, page, label } = await newPage(engine, size, { lang })
      await page.goto(`${BASE}/`)
      await ready(page)
      const shown = await popupShown(page, LIVE ? 5000 : 2500)
      check(shown === LIVE, `${label}: popup ${LIVE ? 'shows on a new visit' : 'does not show'}`, `${label}: popup shown=${shown} on ${PHASE}`)
      if (LIVE && shown) {
        await sleep(450) // its fade-in
        const box = await page.locator('[data-dk-raj-popup] [role=dialog]').boundingBox()
        const vw = size[0]
        check(box && box.x >= 0 && box.x + box.width <= vw + 0.5 && box.y >= 0 && box.y + box.height <= size[1] + 0.5, `${label}: popup fits the screen (${Math.round(box?.width)}×${Math.round(box?.height)})`, `${label}: popup box ${JSON.stringify(box)}`)
        const text = await popup(page).innerText()
        const words = lang === 'kn' ? ['ಕನ್ನಡ ರಾಜ್ಯೋತ್ಸವದ ಹಾರ್ದಿಕ ಶುಭಾಶಯಗಳು', 'ಎಲ್ಲಾ ಉತ್ಪನ್ನಗಳ ಮೇಲೆ 50% ರಿಯಾಯಿತಿ', 'ನವೆಂಬರ್ ಪೂರ್ತಿ', 'ಆನ್‌ಲೈನ್ ಆರ್ಡರ್‌ಗಳಿಗೆ ಮಾತ್ರ', 'ಆಫರ್ ವಲಯಕ್ಕೆ ಹೋಗಿ'] : ['Happy Kannada Rajyotsava', '50% OFF', '50% off on everything', 'All of November', 'Online orders only', 'Go to Offer Zone', 'Maybe later']
        const missing = words.filter((w) => !text.includes(w))
        check(!missing.length, `${label}: popup words ✓ (${lang})`, `${label}: popup misses ${missing.join(' | ')}`)
        check((await popup(page).locator(`[data-dk-logo=${lang}]`).count()) === 1, `${label}: popup has the ${lang === 'kn' ? 'Kannada ' : ''}logo`, `${label}: popup logo missing`)
        check(await page.evaluate(() => document.getElementById('dk-app')?.hasAttribute('inert')), `${label}: the page behind is inert while the popup is open`, `${label}: page not inert`)
        await audit(page, `${label} popup`)
        await shot(page, `popup-${label}`)
        // close one of three ways: ✕, Maybe later, a tap outside
        const how = SIZES.indexOf(size) % 3
        if (how === 0) await page.locator('[data-dk-raj-close]').click()
        else if (how === 1) await page.locator('[data-dk-raj-later]').click()
        else await page.mouse.click(4, size[1] - 4)
        await sleep(250)
        check(!(await popup(page).count()), `${label}: popup closes (${['✕', 'Maybe later', 'tap outside'][how]})`, `${label}: popup still open`)
      }
      // The header: Offer Zone button next to language and cart, all inside the screen
      const zone = page.locator('header [data-dk-zone]')
      await sleep(200)
      check((await zone.count()) === (LIVE ? 1 : 0), `${label}: Offer Zone button ${LIVE ? 'in the header' : 'not shown'}`, `${label}: Offer Zone buttons: ${await zone.count()}`)
      if (LIVE) {
        const boxes = await page.evaluate(() => {
          const h = document.querySelector('header')
          const r = (el) => el && el.getBoundingClientRect().toJSON()
          return { zone: r(h.querySelector('[data-dk-zone]')), cart: r(h.querySelector('[data-dk-cart]')), logo: r(h.querySelector('a[aria-label]')), lang: r(h.querySelector('button:has(> span[lang])')), vw: innerWidth }
        })
        const fits = boxes.zone && boxes.lang && boxes.cart.right <= boxes.vw + 0.5 && boxes.zone.right <= (boxes.lang?.left ?? boxes.cart.left) + 0.5 && boxes.zone.left >= boxes.logo.right - 0.5 && boxes.zone.height >= 47.5
        check(fits, `${label}: Offer Zone fits beside the logo, language and cart (${Math.round(boxes.zone?.width)}px wide)`, `${label}: header boxes ${JSON.stringify(boxes)}`)
      }
      // The logo in the visitor's language: hero and header
      const logos = await page.locator('[data-dk-logo]').evaluateAll((els) => els.map((e) => e.getAttribute('data-dk-logo') + ':' + e.textContent.replace(/\s+/g, ' ').trim()))
      const want = lang === 'kn' ? /^kn:.*ಡ್ರೀಮ್ ಕಿಚನ್.*ಕೈಯಿಂದ ಮಾಡಿದ ಚಾಕೊಲೇಟ್‌ಗಳು/ : /^en:.*Dream Kitchen.*Handmade Chocolates/
      check(logos.length >= 2 && logos.every((l) => want.test(l)), `${label}: ${lang === 'kn' ? 'Kannada' : 'English'} logo in the header and hero`, `${label}: logos ${JSON.stringify(logos)}`)
      // The faint flag behind the hero (and the page) while live, the logo otherwise
      const bg = await page.evaluate(() => [...document.querySelectorAll('[data-dk-bg]')].map((e) => ({ id: e.dataset.dkBg, opacity: Number(getComputedStyle(e).opacity), events: getComputedStyle(e).pointerEvents })))
      check(
        LIVE ? bg.length >= 2 && bg.every((b) => b.id === 'rajyotsava' && b.opacity >= 0.06 && b.opacity <= 0.08 && b.events === 'none') : !bg.some((b) => b.id === 'rajyotsava'),
        `${label}: ${LIVE ? `faint Karnataka flag (${bg.map((b) => b.opacity).join(', ')}), behind everything` : 'no flag: the normal logo background'}`,
        `${label}: backgrounds ${JSON.stringify(bg)}`,
      )
      // Home: the wide Rajyotsava banner, and "Order now" still on the first screen
      const banner = await page.locator('[data-dk-raj-banner]').count()
      check(banner === (LIVE ? 1 : 0), `${label}: Rajyotsava banner on Home ${LIVE ? '✓' : 'not shown ✓'}`, `${label}: banners ${banner}`)
      // ...and not under the phone's tab bar at the bottom
      const order = await page.locator('[data-dk-order]').boundingBox()
      const floor = await page.evaluate(() => {
        const bar = [...document.querySelectorAll('nav')].find((n) => getComputedStyle(n).position === 'fixed' && n.getBoundingClientRect().bottom >= innerHeight - 1 && n.offsetHeight)
        return bar ? bar.getBoundingClientRect().top : innerHeight
      })
      check(order && order.y + order.height <= floor + 0.5, `${label}: “Order now” on the first screen, clear of the tab bar (bottom ${Math.round(order?.y + order?.height)}, room ${Math.round(floor)})`, `${label}: Order now at ${JSON.stringify(order)}, room ${floor}`)
      await audit(page, `${label} home`)
      await shot(page, `home-${label}`)

      // Between pages in the same visit: no popup again; reload in the same tab: none either
      if (LIVE) {
        await page.locator('a[href="/menu"]:visible').first().click()
        await page.waitForURL(/\/menu/)
        check(!(await popupShown(page, 1800)), `${label}: no popup when moving to Menu`, `${label}: popup again on Menu`)
        await page.reload()
        await ready(page)
        check(!(await popupShown(page, 1800)), `${label}: no popup after a reload in the same visit`, `${label}: popup after reload`)
        // Offer Zone: every menu product, old price crossed out, 50% OFF
        await page.locator('header [data-dk-zone]').click()
        await page.waitForSelector('[data-dk-offer-menu=zone] [data-dk-card]')
        const cards = await page.locator('[data-dk-offer-menu=zone] [data-dk-card]').evaluateAll((els) =>
          els.map((c) => ({ was: c.querySelector('[data-dk-was-price]')?.textContent || '', badge: c.querySelector('[data-dk-offer-badge]')?.textContent || '' })),
        )
        const badge = lang === 'kn' ? '50% ರಿಯಾಯಿತಿ' : '50% OFF'
        check(cards.length >= 15 && cards.every((c) => c.was && c.badge.includes(badge)), `${label}: Offer Zone shows ${cards.length} products, each crossed out with “${badge}”`, `${label}: Offer Zone cards ${JSON.stringify(cards.slice(0, 3))} (${cards.length})`)
        await audit(page, `${label} offer zone`)
        await shot(page, `zone-${label}`)
      }
      await ctx.close()
    }
  }
}

/* ======================= 2. a new visit, the first-visit loading screen, reduce motion ======================= */
{
  const engine = ENGINES[0]
  const { ctx, page, label } = await newPage(engine, [390, 844], { intro: true })
  await page.goto(`${BASE}/`)
  const shown = await popupShown(page, 6000)
  const introGone = await page.evaluate(() => !document.documentElement.classList.contains('dk-intro-on'))
  check(shown === LIVE && introGone, `${label}: with the loading screen, the popup ${LIVE ? 'comes after it' : 'stays away'}`, `${label}: popup ${shown}, intro gone ${introGone}`)
  await ctx.close()
  // A new visit (new tab session) gets it again
  if (LIVE) {
    const again = await newPage(engine, [390, 844])
    await again.page.goto(`${BASE}/menu`)
    await ready(again.page)
    check(await popupShown(again.page), `${again.label}: a new visit gets the popup again (opened on Menu)`, `${again.label}: no popup on a new visit`)
    await again.ctx.close()
  }
  // Reduce motion: the flag is a still picture, the popup still comes (no movement)
  const still = await newPage(engine, [390, 844], { reduce: true })
  await still.page.goto(`${BASE}/`)
  await ready(still.page)
  if (LIVE) {
    check(await popupShown(still.page), `${still.label}: reduce motion: the popup still shows`, `${still.label}: reduce motion: no popup`)
    const anim = await still.page.locator('[data-dk-raj-popup] .dk-raj-card').evaluate((e) => getComputedStyle(e).animationName)
    check(!/dk-raj-in/.test(anim), `${still.label}: reduce motion: no scale-in (${anim})`, `${still.label}: reduce motion still scales: ${anim}`)
    await still.page.keyboard.press('Escape')
    // two frames apart, the still flag stays the same picture
    const frames = await still.page.evaluate(async () => {
      const c = document.querySelector('canvas[data-dk-bg=rajyotsava]')
      const a = c.toDataURL()
      await new Promise((r) => setTimeout(r, 400))
      return [a.length > 1000, a === c.toDataURL()]
    })
    check(frames[0] && frames[1], `${still.label}: reduce motion: the flag is drawn once and stays still`, `${still.label}: flag frames ${JSON.stringify(frames)}`)
  }
  await still.ctx.close()
  // Without reduce motion the flag moves
  if (LIVE) {
    const moving = await newPage(engine, [390, 844])
    await moving.page.goto(`${BASE}/`)
    await ready(moving.page)
    await sleep(500)
    const changes = await moving.page.evaluate(async () => {
      const c = document.querySelector('canvas[data-dk-bg=rajyotsava]')
      const a = c.toDataURL()
      await new Promise((r) => setTimeout(r, 500))
      return a !== c.toDataURL()
    })
    check(changes, `${moving.label}: the flag waves gently`, `${moving.label}: the flag does not move`)
    await moving.ctx.close()
  }
}

/* ======================= 3. the language button switches the logo at once ======================= */
{
  const { ctx, page, label } = await newPage(ENGINES[1], [390, 844])
  await page.goto(`${BASE}/`)
  await ready(page)
  if (LIVE && (await popupShown(page))) await page.locator('[data-dk-raj-close]').click()
  await page.locator('header button:has(> span[lang=kn])').click()
  await page.waitForSelector('[data-dk-hero=lockup][data-dk-logo=kn]', { timeout: 10000 })
  const t = await page.locator('[data-dk-hero=lockup]').textContent()
  check(/ಡ್ರೀಮ್/.test(t) && !(await page.locator('[data-dk-logo=en]').count()), `${label}: the language button turns the logo Kannada without a reload`, `${label}: logo after switching: ${t}`)
  const font = await page.locator('[data-dk-hero=lockup] .dk-lockup__name').evaluate((e) => getComputedStyle(e).fontFamily)
  check(/Noto Serif Kannada/.test(font), `${label}: Kannada logo in Noto Serif Kannada`, `${label}: logo font ${font}`)
  await shot(page, `logo-switched-${label}`)
  await page.locator('header button:has(> span[lang=en])').click()
  await page.waitForSelector('[data-dk-hero=lockup][data-dk-logo=en]')
  ok(`${label}: and back to English`)
  await ctx.close()
}

/* ======================= 4. the admin: 5 sizes, a cookie tin, the Rajyotsava card; one full order ======================= */
if (PHASE === 'nov1') {
  const { ctx, page, label } = await newPage(ENGINES[0], [390, 844])
  page.setDefaultTimeout(15000)
  await page.goto(`${BASE}/admin`)
  await page.fill('input[type=email]', ADMIN.email)
  await page.fill('input[type=password]', ADMIN.password)
  await page.click('button[type=submit]')
  await page.waitForSelector('nav[aria-label=Admin]')
  check(!(await popup(page).count()), `${label}: no popup on the admin`, `${label}: popup on the admin`)

  // + Add new product with 5 sizes (Chocolates)
  await page.goto(`${BASE}/admin/menu`)
  await page.locator('[data-admin-add-product=chocolates]').click()
  const form = page.locator('[data-admin-add-form=chocolates]')
  await form.locator('[data-admin-name-en]').fill('Truffle Box')
  await form.locator('[data-admin-name-kn]').fill('ಟ್ರಫಲ್ ಬಾಕ್ಸ್')
  await form.locator('[data-admin-priced=sizes]').check()
  const sizes = [
    ['1 kg', '1599', 'xl'],
    ['100 g', '199', 'small'],
    ['250 g', '449', 'small'],
    ['500 g', '849', 'large'],
    ['12 pieces', '999', 'large'],
  ]
  for (let i = 0; i < sizes.length; i++) {
    if (i > 0) await form.locator('[data-admin-size-add]').click()
    const row = form.locator('[data-admin-size-row]').nth(i)
    await row.locator('[data-admin-size-label]').fill(sizes[i][0])
    await row.locator('[data-admin-size-price]').fill(sizes[i][1])
    await row.locator('[data-admin-size-tier]').selectOption(sizes[i][2])
  }
  // 1 kg was typed first: move it down to the 4th place (after 500 g)
  for (let i = 0; i < 3; i++) await form.locator('[data-admin-size-row]').nth(i).locator('[data-admin-size-down]').click()
  const order5 = await form.locator('[data-admin-size-label]').evaluateAll((els) => els.map((e) => e.value))
  check(order5.join('|') === '100 g|250 g|500 g|1 kg|12 pieces', `${label}: sizes reordered with ↓ (${order5.join(', ')})`, `${label}: size order ${order5}`)
  // a duplicate name is refused, with a clear message
  await form.locator('[data-admin-size-row]').nth(4).locator('[data-admin-size-label]').fill('1 KG')
  expect400 = true
  await form.locator('[data-admin-add-save]').click()
  await page.waitForSelector('text=Two sizes have the same name')
  await sleep(200)
  expect400 = false
  ok(`${label}: two sizes with the same name are refused`)
  await form.locator('[data-admin-size-row]').nth(4).locator('[data-admin-size-label]').fill('12 pieces')
  await audit(page, `${label} admin add product`)
  await shot(page, 'admin-5-sizes', true)
  await form.locator('[data-admin-add-save]').click()
  await page.waitForSelector('[data-admin-product=truffle-box]')
  const saved = (await act('menu')).products.find((p) => p.id === 'truffle-box')
  check(saved?.sizes.map((s) => `${s.label}:${s.price}:${s.courierTier}`).join('|') === '100 g:199:small|250 g:449:small|500 g:849:large|1 kg:1599:xl|12 pieces:999:large', `${label}: Truffle Box saved with 5 sizes, prices and courier charges`, `${label}: saved ${JSON.stringify(saved?.sizes)}`)

  // A cookie tin (Cookie Tins section)
  await page.locator('[data-admin-add-product=cookie-tins]').click()
  const tin = page.locator('[data-admin-add-form=cookie-tins]')
  await tin.locator('[data-admin-name-en]').fill('Choco Chip Cookie Tin')
  await tin.locator('[data-admin-desc-en]').fill('Crunchy choco chip cookies in a gift tin.')
  await tin.locator('[data-admin-priced=sizes]').check()
  await tin.locator('[data-admin-size-row]').nth(0).locator('[data-admin-size-label]').fill('Small tin')
  await tin.locator('[data-admin-size-row]').nth(0).locator('[data-admin-size-price]').fill('399')
  await tin.locator('[data-admin-size-add]').click()
  await tin.locator('[data-admin-size-row]').nth(1).locator('[data-admin-size-label]').fill('Large tin')
  await tin.locator('[data-admin-size-row]').nth(1).locator('[data-admin-size-price]').fill('999')
  await tin.locator('[data-admin-size-row]').nth(1).locator('[data-admin-size-tier]').selectOption('large')
  await tin.locator('[data-admin-add-save]').click()
  await page.waitForSelector('[data-admin-product=choco-chip-cookie-tin]')
  ok(`${label}: cookie tin added in Cookie Tins`)

  // The Rajyotsava card in Offers
  await page.goto(`${BASE}/admin/offers`)
  await page.waitForSelector('[data-admin-raj]')
  check((await page.locator('[data-admin-raj]').getAttribute('data-admin-raj-status')) === 'live', `${label}: Offers shows the Rajyotsava card, Live`, `${label}: card status`)
  await audit(page, `${label} admin offers`)
  await shot(page, 'admin-rajyotsava-card', true)

  // The website: Cookie Tins tab and tile; the Truffle Box sheet with its 5 sizes; order 2 sizes
  const site = await newPage(ENGINES[0], [390, 844])
  const p = site.page
  p.setDefaultTimeout(15000)
  await p.goto(`${BASE}/`)
  await ready(p)
  if (await popupShown(p)) await p.locator('[data-dk-raj-close]').click()
  await p.waitForSelector('a[data-dk-tile][href="/menu#cookie-tins"]')
  ok(`${site.label}: Cookie Tins tile on Home`)
  await shot(p, 'home-with-cookie-tins', true)
  await p.goto(`${BASE}/menu?item=truffle-box`)
  await p.waitForSelector('[role=dialog] #ps-size')
  const sheetSizes = await p.locator('[role=dialog] #ps-size label').evaluateAll((els) => els.map((e) => e.innerText.replace(/\s+/g, ' ').trim()))
  check(sheetSizes.length === 5 && /^100 g .*₹199 ₹100$/.test(sheetSizes[0]) && /^1 kg .*₹1,599 ₹800$/.test(sheetSizes[3]), `${site.label}: sheet shows the 5 sizes, each crossed out and at 50% (${sheetSizes.join(' / ')})`, `${site.label}: sheet sizes ${JSON.stringify(sheetSizes)}`)
  await shot(p, 'sheet-5-sizes')
  await p.locator('[role=dialog] #ps-size label').nth(0).click()
  await p.locator('[data-dk-add]').click()
  await sleep(500)
  await p.goto(`${BASE}/menu?item=truffle-box`)
  await p.waitForSelector('[role=dialog] #ps-size')
  await p.locator('[role=dialog] #ps-size label').nth(3).click()
  await p.locator('[data-dk-add]').click()
  await sleep(500)
  // and a Delight Box with a name (free) and a ragi brownie
  await p.goto(`${BASE}/menu?item=walnut-brownies`)
  await p.waitForSelector('[role=dialog]')
  await p.locator('[role=dialog] [role=switch]').click()
  await p.locator('[data-dk-add]').click()
  await sleep(500)
  await p.goto(`${BASE}/cart`)
  await p.waitForSelector('[data-dk-continue]')
  await shot(p, 'cart', true)
  await p.locator('[data-dk-continue]').click()
  await p.waitForURL(/\/checkout$/)
  await p.fill('#co-name', 'Meera Shetty')
  await p.fill('#co-phone', '9741012345')
  await p.fill('#co-line1', '7, Lake View Apartments')
  await p.fill('#co-line2', 'Kuvempu Nagar')
  await p.fill('#co-city', 'Mysuru')
  await p.fill('#co-pincode', '570023')
  await p.selectOption('#co-state', 'karnataka')
  await p.locator('[data-dk-next]').click()
  await p.waitForURL(/\/review$/)
  await sleep(500)
  await shot(p, 'review', true)
  await p.locator('[data-dk-place]').click()
  await p.waitForURL(/\/pay\//, { timeout: 20000 })
  const code = p.url().split('/pay/')[1].split(/[?#]/)[0]
  check(!(await popup(p).count()), `${site.label}: no popup on the payment page`, `${site.label}: popup on Pay`)
  const tracked = await fetch(`${BASE}/api/order`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ code, phone: '9741012345' }) }).then((r) => r.json())
  const o = tracked.order
  // 100 g ₹100 + 1 kg ₹800 + ragi walnut ₹350 = ₹1,250; courier for the 1 kg (xl) at full price ₹100
  check(
    o?.subtotal === 1250 && o.courier === 100 && o.total === 1350 && o.items.every((i) => i.offer?.label?.en === 'Rajyotsava 50% off' && i.regularUnitPrice > i.unitPrice),
    `${site.label}: order ${code} placed at the server's offer prices: ₹1,250 + ₹100 courier = ₹1,350`,
    `${site.label}: order ${JSON.stringify(o).slice(0, 500)}`,
  )
  // Track Order shows the regular price, "Rajyotsava 50% off" and the price paid
  await p.goto(`${BASE}/track?id=${code}`)
  await p.waitForSelector('#tr-phone')
  await p.fill('#tr-phone', '9741012345')
  await p.locator('[data-dk-track]').click()
  await p.waitForSelector('[data-dk-order-saving]')
  const trackText = await p.locator('main').innerText()
  // regular ₹199 + ₹1,599 + ₹700 = ₹2,498; paid ₹1,250 (₹100 + ₹800 + ₹350, rounded to the rupee): saved ₹1,248
  check(/Rajyotsava 50% off/.test(trackText) && /−₹1,248/.test(trackText) && /₹2,498/.test(trackText) && /₹1,350/.test(trackText), `${site.label}: Track Order shows the regular price ₹2,498, “Rajyotsava 50% off” −₹1,248 and the total ₹1,350`, `${site.label}: Track text ${trackText.slice(trackText.indexOf('Truffle'), trackText.indexOf('Truffle') + 600)}`)
  await audit(p, `${site.label} track`)
  await shot(p, 'track-order', true)
  await site.ctx.close()

  // The admin: the order page and the packing slip
  await page.goto(`${BASE}/admin/orders/${code}`)
  await page.waitForSelector('[data-admin-order-saving]')
  const detail = await page.locator('main').innerText()
  check(/Rajyotsava 50% off/.test(detail) && /₹199 → ₹100 each/.test(detail) && /Items at the regular price/.test(detail), `${label}: admin order page shows each line's regular price, the offer and the price paid`, `${label}: admin order ${detail.slice(0, 400)}`)
  await shot(page, 'admin-order', true)
  await page.locator('[data-admin-slip]').click()
  await page.waitForSelector('[data-admin-slip-saving]')
  const slip = await page.locator('body').innerText()
  check(/Rajyotsava 50% off/.test(slip) && /−₹1,248/.test(slip) && /₹2,498/.test(slip) && /₹1,350/.test(slip), `${label}: packing slip shows the regular price ₹2,498, “Rajyotsava 50% off” −₹1,248 and the total ₹1,350`, `${label}: slip ${slip.slice(slip.indexOf('IN THIS PARCEL'), slip.indexOf('IN THIS PARCEL') + 700)}`)
  await shot(page, 'packing-slip', true)

  // Turn off this offer: popup, Offer Zone, flag and discount all stop at once
  await page.goto(`${BASE}/admin/offers`)
  await page.locator('[data-admin-raj-toggle]').click()
  await page.waitForSelector('[data-admin-raj][data-admin-raj-status=off]')
  ok(`${label}: “Turn off this offer” tapped`)
  const offSite = await newPage(ENGINES[1], [390, 844])
  await offSite.page.goto(`${BASE}/`)
  await ready(offSite.page)
  await sleep(1200)
  const offState = await offSite.page.evaluate(() => ({ popup: !!document.querySelector('[data-dk-raj-popup]'), zone: !!document.querySelector('[data-dk-zone]'), flag: !!document.querySelector('[data-dk-bg=rajyotsava]'), banner: !!document.querySelector('[data-dk-raj-banner]') }))
  check(!offState.popup && !offState.zone && !offState.flag && !offState.banner, `${offSite.label}: switched off: no popup, Offer Zone, flag or banner`, `${offSite.label}: after turning off ${JSON.stringify(offState)}`)
  await offSite.page.goto(`${BASE}/menu?item=pista-bar`)
  await offSite.page.waitForSelector('[data-dk-add]')
  const addText = await offSite.page.locator('[data-dk-add]').innerText()
  check(/450/.test(addText), `${offSite.label}: switched off: the regular price (${addText.trim()})`, `${offSite.label}: price when off ${addText}`)
  await offSite.ctx.close()
  await page.locator('[data-admin-raj-toggle]').click()
  await page.waitForSelector('[data-admin-raj][data-admin-raj-status=live]')
  ok(`${label}: turned on again`)
  await ctx.close()
}

/* ======================= 5. the visitor's own clock: the end of 30 Nov ======================= */
if (PHASE === 'nov30') {
  const { ctx, page, label } = await newPage(ENGINES[0], [390, 844])
  await page.goto(`${BASE}/`)
  await ready(page)
  await popupShown(page)
  // the page left open past midnight into 1 Dec: everything goes by itself within a minute
  await page.clock.setFixedTime(new Date(Date.parse('2026-11-30T18:31:00Z')))
  await page.waitForFunction(() => !document.querySelector('[data-dk-zone]') && !document.querySelector('[data-dk-bg=rajyotsava]'), null, { timeout: 70000 })
  ok(`${label}: a page left open into 1 Dec drops the Offer Zone and the flag by itself`)
  await ctx.close()
}

for (const b of Object.values(launched)) await b.close()
writeFileSync(`${OUT}/report-${PHASE}.json`, JSON.stringify(report, null, 2))
const problems = report.failures.length + report.consoleErrors.length + report.overflow.length + report.smallTargets.length
console.log(`\n${PHASE}: ${report.flows.length} checks passed, ${report.failures.length} failed; console errors ${report.consoleErrors.length}, sideways scroll ${report.overflow.length}, small targets ${report.smallTargets.length}`)
for (const k of ['consoleErrors', 'overflow', 'smallTargets']) for (const m of report[k].slice(0, 15)) console.log(`  ${k}: ${m}`)
process.exit(problems ? 1 : 0)
