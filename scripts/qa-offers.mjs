// QA for Hema's requests of 23 Oct 2026, in a real browser on the practice database: the admin's
// Offers tab, Edit name / Description, + Add new product (with ragi), the Customize tiles' photos,
// and what customers see: the offer banner on Home and the strip on Menu at 390 and 1280px in
// English and Kannada (only between the dates, rotating, tappable, "Order now" still on the first
// phone screen), the new product ordered end to end with the ragi extra charged by the server.
// Checks every page for console errors, sideways scroll and targets under 48px.
// Screenshots: docs/screenshots/offers/.
//
// Needs the dev server with a FRESH practice database:
//   UPI_ID=dreamkitchen@okaxis HEMA_EMAIL=hema@example.com DK_DEV_ADMIN_EMAIL=hema@example.com \
//   DK_DEV_ADMIN_PASSWORD=dev-only-pass DK_RELAX_LIMITS=1 DK_DEV_DATA_DIR=.dev-data/qa-offers npx vite --port 5173
// then: node scripts/qa-offers.mjs   (exits non-zero on any problem; report in docs/screenshots/offers/qa-report.json)
import { mkdirSync, writeFileSync } from 'node:fs'
import { chromium } from 'playwright'
import sharp from 'sharp'
import { istToday } from '../src/lib/offers.js'
import { addDaysISO } from '../src/lib/dates.js'

const BASE = process.env.DK_BASE || 'http://localhost:5173'
const OUT = process.env.DK_OUT || 'docs/screenshots/offers'
const ADMIN = { email: process.env.DK_DEV_ADMIN_EMAIL || 'hema@example.com', password: process.env.DK_DEV_ADMIN_PASSWORD || 'dev-only-pass' }
mkdirSync(OUT, { recursive: true })
const report = { consoleErrors: [], overflow: [], smallTargets: [], flows: [], failures: [] }
const fail = (m) => {
  report.failures.push(m)
  console.error('FAIL', m)
}
const ok = (m) => {
  report.flows.push(m)
  console.log('ok  ', m)
}
const check = (cond, good, bad) => (cond ? ok(good) : fail(bad))
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const menuApi = () => fetch(`${BASE}/api/menu?t=${Date.now()}`).then((r) => r.json())
const today = istToday()

async function audit(page, label) {
  const r = await page.evaluate(() => {
    const small = []
    document.querySelectorAll('a[href], button, input:not([type=hidden]):not([type=checkbox]):not([type=radio]):not([type=file]), select, textarea, label:has(input[type=file])').forEach((el) => {
      const b = el.getBoundingClientRect()
      if (!b.width || !b.height || el.closest('.sr-only, [aria-hidden=true], [inert]') || getComputedStyle(el).visibility === 'hidden') return
      if (b.height < 47.5 || (b.width < 47.5 && !el.matches('input, select, textarea'))) small.push(`${el.tagName.toLowerCase()} "${(el.innerText || el.getAttribute('aria-label') || el.value || '').trim().slice(0, 30)}" ${Math.round(b.width)}x${Math.round(b.height)}`)
    })
    return { overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth, small }
  })
  if (r.overflow > 1) report.overflow.push(`${label}: ${r.overflow}px`)
  for (const s of r.small) report.smallTargets.push(`${label}: ${s}`)
}

async function newPage(browser, { width = 390, height = 844, lang = 'en' } = {}) {
  const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 2, hasTouch: width < 768, isMobile: width < 768 })
  await ctx.addInitScript((l) => {
    localStorage.setItem('dk_intro_seen', '1')
    localStorage.setItem('dk_lang', l)
  }, lang)
  const page = await ctx.newPage()
  page.on('pageerror', (e) => report.consoleErrors.push(`${page.url()}: ${e.message}`))
  page.on('console', (m) => m.type() === 'error' && !/status of 40[0134]/.test(m.text()) && report.consoleErrors.push(`${page.url()}: ${m.text()}`))
  return { ctx, page }
}
const shot = (page, name, full = false) => page.screenshot({ path: `${OUT}/${name}.png`, fullPage: full })
const ready = (page) => page.waitForFunction(() => window.__dkReady === true, null, { timeout: 20000 })

// A phone-sized photo (1600 × 1200 JPEG) in a colour, to tell the uploads apart
const photoOf = (r, g, b) => sharp({ create: { width: 1600, height: 1200, channels: 3, background: { r, g, b } } }).jpeg({ quality: 85 }).toBuffer()

const browser = await chromium.launch()
try {
  /* ---------------- 1. admin, at phone size ---------------- */
  const { ctx, page } = await newPage(browser)
  await page.goto(`${BASE}/admin`)
  await page.fill('input[type=email]', ADMIN.email)
  await page.fill('input[type=password]', ADMIN.password)
  await page.click('button[type=submit]')
  await page.waitForSelector('[data-admin-card=newOrders]')

  // Bottom nav: Home · Orders · Offers · Classes · Menu · More, readable at 360px
  const labels = await page.locator('nav[aria-label=Admin] li').allInnerTexts()
  check(labels.map((l) => l.trim()).join(' · ') === 'Home · Orders · Offers · Classes · Menu · More', `bottom nav: ${labels.join(' · ')}`, `bottom nav order is ${labels.join(' · ')}`)
  for (const w of [360, 390]) {
    await page.setViewportSize({ width: w, height: 800 })
    const cut = await page.evaluate(() => [...document.querySelectorAll('nav[aria-label=Admin] li span')].filter((s) => s.scrollWidth > s.clientWidth + 1 || s.getBoundingClientRect().right > s.closest('li').getBoundingClientRect().right + 1).map((s) => s.textContent))
    check(!cut.length, `nav labels fit at ${w}px`, `nav labels cut at ${w}px: ${cut.join(', ')}`)
    if (w === 360) await page.locator('nav[aria-label=Admin]').screenshot({ path: `${OUT}/01-admin-nav-360.png` })
  }
  await page.setViewportSize({ width: 390, height: 844 })

  // Menu: Edit name and Description next to Save and Mark sold out
  await page.goto(`${BASE}/admin/menu`)
  const almond = page.locator('[data-admin-product=almond-bar]')
  await almond.waitFor()
  await almond.scrollIntoViewIfNeeded()
  await audit(page, 'admin/menu')
  await shot(page, '02-menu-card-buttons')
  await almond.locator('[data-admin-edit-name]').click()
  await almond.locator('[data-admin-name-en]').fill('Roasted Almond Bar')
  await almond.locator('[data-admin-name-kn]').fill('ಹುರಿದ ಬಾದಾಮಿ ಬಾರ್')
  await almond.locator('[data-admin-save-name]').click()
  await almond.locator('text=Name saved').waitFor()
  await shot(page, '03-edit-name-saved')
  let m = await menuApi()
  const almondO = m.overrides.find((o) => o.id === 'almond-bar')
  check(almondO?.name?.en === 'Roasted Almond Bar' && almondO.name.kn === 'ಹುರಿದ ಬಾದಾಮಿ ಬಾರ್', 'Edit name: saved in both languages, same product ID, live on /api/menu', `Edit name not live: ${JSON.stringify(almondO)}`)

  const pista = page.locator('[data-admin-product=pista-bar]')
  await pista.scrollIntoViewIfNeeded()
  await pista.locator('[data-admin-edit-desc]').click()
  await pista.locator('[data-admin-desc-en]').fill(`Rich chocolate packed with roasted pistachios. ${'Made fresh by hand. '.repeat(12)}`)
  const counted = await pista.locator('[data-admin-desc-en] + [data-admin-counter]').innerText()
  check(counted.trim() === '200 / 200', `the description stops at 200 letters and the counter shows ${counted.trim()}`, `description counter shows ${counted}`)
  await pista.locator('[data-admin-desc-en]').fill('Rich chocolate packed with roasted pistachios.')
  await pista.locator('[data-admin-desc-kn]').fill('ಹುರಿದ ಪಿಸ್ತಾ ತುಂಬಿದ ಸಮೃದ್ಧ ಚಾಕೊಲೇಟ್.')
  await pista.locator('[data-admin-save-desc]').click()
  await pista.locator('text=Description saved').waitFor({ timeout: 8000 }).catch(async (e) => {
    console.log('DEBUG', await pista.innerText())
    throw e
  })
  await shot(page, '04-description-saved')

  // Customize page photos
  const tile = page.locator('[data-admin-tile=customize-box]')
  await tile.scrollIntoViewIfNeeded()
  await shot(page, '05-customize-tiles-before')
  await page.setInputFiles('[data-admin-photo=tile-customize-box]', { name: 'IMG_3001.jpg', mimeType: 'image/jpeg', buffer: await photoOf(200, 40, 60) })
  await tile.locator('text=Photo saved').waitFor({ timeout: 15000 })
  await shot(page, '06-customize-tile-changed')
  m = await menuApi()
  const tilePhoto = m.pagePhotos?.['customize-box']
  const served = tilePhoto && (await fetch(`${BASE}${tilePhoto}`))
  const meta = served?.ok && (await sharp(Buffer.from(await served.arrayBuffer())).metadata())
  const smallServed = tilePhoto && (await fetch(`${BASE}${tilePhoto.replace('-1200.', '-600.')}`))
  const smallMeta = smallServed?.ok && (await sharp(Buffer.from(await smallServed.arrayBuffer())).metadata())
  check(meta?.width === 1200 && meta.format === 'webp' && smallMeta?.width === 600 && smallMeta.format === 'webp', 'Customize tile photo: 1200px + 600px webp, live on /api/menu', `tile photo not right: ${tilePhoto} ${JSON.stringify(meta && { w: meta.width, f: meta.format })}`)

  // + Add new product, at the bottom of Brownies, with a ragi version
  await page.locator('[data-admin-add-product=brownies]').scrollIntoViewIfNeeded()
  await shot(page, '07-add-new-product-button')
  await page.click('[data-admin-add-product=brownies]')
  const form = page.locator('[data-admin-add-form=brownies]')
  check((await form.locator('[data-admin-new-category]').inputValue()) === 'brownies', 'the Add form starts in the section where it was tapped', 'the Add form did not preselect Brownies')
  await form.locator('[data-admin-name-en]').fill('Choco Chip Brownies')
  await form.locator('[data-admin-name-kn]').fill('ಚಾಕೊ ಚಿಪ್ ಬ್ರೌನಿಗಳು')
  await form.locator('[data-admin-desc-en]').fill('Five fudgy brownies with dark chocolate chips.')
  await form.locator('[data-admin-new-price]').fill('450')
  await form.locator('[data-admin-ragi=yes]').check()
  await form.locator('[data-admin-ragi-price]').fill('60')
  await form.locator('[data-admin-new-tier=small]').check()
  await audit(page, 'admin/menu add form')
  await shot(page, '08-add-product-form', false)
  await form.locator('[data-admin-add-save]').click()
  await page.locator('text=Added. It is on the website menu now.').waitFor({ timeout: 15000 })
  const added = page.locator('[data-admin-product=choco-chip-brownies]')
  await added.waitFor()
  await added.scrollIntoViewIfNeeded()
  await shot(page, '09-new-product-added')
  m = await menuApi()
  const newO = m.overrides.find((o) => o.id === 'choco-chip-brownies')
  check(newO?.custom && newO.price === 450 && newO.ragiPrice === 60, 'new product with a ragi version (+₹60) is live on /api/menu', `new product not live: ${JSON.stringify(newO)}`)

  // Offers
  await page.click('nav[aria-label=Admin] >> text=Offers')
  await page.waitForSelector('[data-admin-add-offer]')
  await audit(page, 'admin/offers empty')
  await shot(page, '10-offers-empty')
  check(await page.locator('[data-admin-offer-note]').isVisible(), 'Offers page says offers do not change prices', 'the price note is missing')

  const addOffer = async ({ title, titleKn, message, link, button, starts, ends, photo }, name) => {
    await page.click('[data-admin-add-offer]')
    const f = page.locator('[data-admin-offer-form]')
    await f.locator('[data-admin-offer-title]').fill(title)
    if (titleKn) await f.locator('input[lang=kn]').first().fill(titleKn)
    if (message) await f.locator('[data-admin-offer-message]').fill(message)
    if (link) await f.locator('[data-admin-offer-link]').selectOption(link)
    if (button) await f.locator('[data-admin-offer-button]').fill(button)
    await f.locator('[data-admin-offer-start]').fill(starts)
    await f.locator('[data-admin-offer-end]').fill(ends)
    if (photo) await page.setInputFiles('[data-admin-offer-photo]', { name: 'offer.jpg', mimeType: 'image/jpeg', buffer: photo })
    if (name) {
      await audit(page, `admin/offers form ${name}`)
      await shot(page, name, true)
    }
    await f.locator('[data-admin-offer-save]').click()
    await page.waitForSelector('[data-admin-offer-flash]', { timeout: 15000 })
  }
  // Errors first: no title, end before start
  await page.click('[data-admin-add-offer]')
  await page.locator('[data-admin-offer-end]').fill(addDaysISO(today, -1))
  await page.locator('[data-admin-offer-start]').fill(today)
  await page.locator('[data-admin-offer-save]').click()
  await page.locator('text=Write the title in English.').waitFor()
  check(await page.locator('text=The end date is before the start date.').isVisible(), 'the offer form explains what is missing in plain words', 'no date error shown')
  await shot(page, '11-offer-form-errors', true)
  await page.locator('[data-admin-offer-form] >> text=Cancel').click()

  await addOffer({ title: 'New: Choco Chip Brownies', titleKn: 'ಹೊಸದು: ಚಾಕೊ ಚಿಪ್ ಬ್ರೌನಿಗಳು', message: 'Fudgy, with dark chocolate chips. Ragi version too.', link: 'product:choco-chip-brownies', button: 'Try them', starts: today, ends: addDaysISO(today, 5), photo: await photoOf(110, 60, 30) }, '12-offer-form-filled')
  await addOffer({ title: 'Diwali Delight Boxes', message: 'Order by Sunday for delivery before Diwali.', link: 'category:delight-boxes', starts: today, ends: addDaysISO(today, 2) })
  await addOffer({ title: 'Christmas tubs', message: 'Coming soon.', link: 'category:brownie-tubs', starts: addDaysISO(today, 3), ends: addDaysISO(today, 9) })
  const statuses = await page.locator('[data-admin-offer]').evaluateAll((els) => els.map((e) => e.getAttribute('data-admin-offer-status')))
  check(statuses.join(',') === 'live,live,scheduled', `offers list shows ${statuses.join(', ')}`, `offers list statuses: ${statuses.join(', ')}`)
  await audit(page, 'admin/offers list')
  await shot(page, '13-offers-list', true)
  m = await menuApi()
  check(m.offers.length === 2 && !m.offers.some((o) => o.title.en === 'Christmas tubs'), 'the website gets the 2 live offers, not the scheduled one', `website offers: ${m.offers.map((o) => o.title.en).join(', ')}`)
  const offerPhoto = m.offers.find((o) => o.photo)?.photo
  check(/\/api\/photo\/offer-[0-9a-f-]+\/\d+-1200\.webp$/.test(offerPhoto || ''), 'the banner photo is stored in two sizes', `banner photo: ${offerPhoto}`)

  // Admin at desktop size
  const desk = await newPage(browser, { width: 1280, height: 900 })
  await desk.ctx.addCookies(await ctx.cookies())
  await desk.page.goto(`${BASE}/admin`)
  await desk.page.evaluate((s) => Object.entries(s).forEach(([k, v]) => localStorage.setItem(k, v)), await page.evaluate(() => Object.fromEntries(Object.entries(localStorage))))
  await desk.page.goto(`${BASE}/admin/offers`)
  await desk.page.waitForSelector('[data-admin-offer]')
  await audit(desk.page, 'admin/offers 1280')
  await shot(desk.page, '14-offers-list-1280', true)
  await desk.page.goto(`${BASE}/admin/menu`)
  await desk.page.locator('[data-admin-product=almond-bar]').scrollIntoViewIfNeeded()
  await audit(desk.page, 'admin/menu 1280')
  await shot(desk.page, '15-menu-1280')
  await desk.ctx.close()

  /* ---------------- 2. the website: banner, strip, tiles ---------------- */
  for (const lang of ['en', 'kn']) {
    for (const [width, height] of [
      [390, 844],
      [1280, 800],
    ]) {
      const tag = `${width}-${lang}`
      const site = await newPage(browser, { width, height, lang })
      const p = site.page
      await p.goto(`${BASE}/`)
      await ready(p)
      await p.waitForSelector('[data-dk-offers=banner]', { timeout: 10000 })
      await sleep(500)
      const info = await p.evaluate(() => {
        const banner = document.querySelector('[data-dk-offers=banner]')
        const order = document.querySelector('[data-dk-order]').getBoundingClientRect()
        const tabs = document.querySelector('nav[aria-label] ul')?.closest('nav')
        const tabTop = tabs && getComputedStyle(tabs).position === 'fixed' ? tabs.getBoundingClientRect().top : innerHeight
        return { top: banner.getBoundingClientRect().top, height: banner.getBoundingClientRect().height, dots: banner.querySelectorAll('[data-dk-offer-dot]').length, orderBottom: order.bottom, visibleBottom: Math.min(innerHeight, tabTop), text: banner.innerText }
      })
      check(info.dots === 2, `${tag}: two live offers, two dots`, `${tag}: ${info.dots} dots`)
      check(info.orderBottom <= info.visibleBottom, `${tag}: "Order now" still on the first screen (bottom ${Math.round(info.orderBottom)} of ${Math.round(info.visibleBottom)}px; banner ${Math.round(info.height)}px)`, `${tag}: Order now pushed below the first screen (${info.orderBottom} > ${info.visibleBottom})`)
      check(!/Christmas/.test(info.text), `${tag}: the scheduled offer is not shown`, `${tag}: the scheduled offer shows`)
      if (lang === 'kn') {
        await p.locator('[data-dk-offer-dot]').nth(info.text.includes('Diwali') ? 1 : 0).click()
        await sleep(400)
        const t = await p.locator('[data-dk-offers=banner]').innerText()
        check(/ಹೊಸದು/.test(t), `${tag}: Hema's Kannada title shows for Kannada readers`, `${tag}: no Kannada title: ${t}`)
      }
      await audit(p, `site ${tag} home`)
      await shot(p, `20-home-banner-${tag}`)
      // It rotates on its own (6 s), and the dots pick one
      const first = await p.locator('[data-dk-offers=banner] p').first().innerText()
      await p.mouse.move(1, height - 1)
      await sleep(6600)
      const second = await p.locator('[data-dk-offers=banner] p').first().innerText()
      check(first !== second, `${tag}: offers take turns (${first.slice(0, 20)}… → ${second.slice(0, 20)}…)`, `${tag}: the banner did not rotate`)

      await p.goto(`${BASE}/menu`)
      await ready(p)
      await p.waitForSelector('[data-dk-offers=strip]')
      const strip = await p.locator('[data-dk-offers=strip]').boundingBox()
      check(strip.height <= 56, `${tag}: slim strip on the Menu page (${Math.round(strip.height)}px)`, `${tag}: menu strip ${strip.height}px tall`)
      await audit(p, `site ${tag} menu`)
      await shot(p, `21-menu-strip-${tag}`)

      await p.goto(`${BASE}/customize`)
      await ready(p)
      const img = p.locator(`img[src*="page-customize-box"]`)
      await img.waitFor({ state: 'attached', timeout: 10000 })
      check(await img.evaluate((i) => i.complete && i.naturalWidth > 0), `${tag}: the Customize tile shows Hema's photo`, `${tag}: Customize tile photo not loaded`)
      await audit(p, `site ${tag} customize`)
      await shot(p, `22-customize-${tag}`)
      if (width === 390 && lang === 'en') {
        // The product sheet shows Hema's description, above the options
        await p.goto(`${BASE}/menu?item=pista-bar`)
        await p.waitForSelector('[role=dialog]')
        const sheet = await p.locator('[role=dialog]').innerText()
        check(sheet.includes('Rich chocolate packed with roasted pistachios.'), 'the product sheet shows the new description', 'description missing on the sheet')
        await shot(p, '23-sheet-description-390-en')
      }
      if (width === 390 && lang === 'kn') {
        await p.goto(`${BASE}/menu?item=pista-bar`)
        await p.waitForSelector('[role=dialog]')
        check((await p.locator('[role=dialog]').innerText()).includes('ಹುರಿದ ಪಿಸ್ತಾ'), 'Kannada readers see the Kannada description', 'Kannada description missing')
        await shot(p, '23-sheet-description-390-kn')
        await p.goto(`${BASE}/menu#chocolates`)
        await ready(p)
        check(await p.locator('text=ಹುರಿದ ಬಾದಾಮಿ ಬಾರ್').first().isVisible(), 'Kannada readers see the new Kannada name', 'Kannada name missing')
      }
      await site.ctx.close()
    }
  }

  /* ---------------- 3. tap the offer, order the new product with ragi ---------------- */
  {
    const { ctx: c, page: p } = await newPage(browser)
    await p.goto(`${BASE}/`)
    await ready(p)
    await p.waitForSelector('[data-dk-offers=banner]')
    // Show the Choco Chip offer (dots), then tap its button: the product sheet opens
    for (let i = 0; i < 2; i++) {
      if ((await p.locator('[data-dk-offers=banner]').innerText()).includes('Choco Chip')) break
      await p.locator('[data-dk-offer-dot]').nth(i).tap()
      await sleep(300)
    }
    await p.locator('[data-dk-offer-link]').tap()
    await p.waitForSelector('[role=dialog]', { timeout: 10000 })
    const sheet = await p.locator('[role=dialog]').innerText()
    check(/Choco Chip Brownies/.test(sheet) && /Five fudgy brownies/.test(sheet), 'tapping the offer opens the new product’s sheet', `the offer led to: ${p.url()} ${sheet.slice(0, 60)}`)
    await p.locator('[role=dialog] [role=switch]').tap()
    await shot(p, '24-new-product-sheet-ragi')
    const addText = await p.locator('[data-dk-add]').innerText()
    check(/510/.test(addText), `the sheet adds the ragi extra (${addText.trim()})`, `sheet price: ${addText}`)
    await p.locator('[data-dk-add]').tap()
    await sleep(500)
    await p.locator('[data-dk-cart]').first().tap()
    await p.waitForURL(/\/cart$/)
    await p.locator('[data-dk-continue]').tap()
    await p.waitForURL(/\/checkout$/)
    await p.fill('#co-name', 'Meera Shetty')
    await p.fill('#co-phone', '9741012345')
    await p.fill('#co-line1', '7, Lake View Apartments')
    await p.fill('#co-line2', 'Kuvempu Nagar')
    await p.fill('#co-city', 'Mysuru')
    await p.fill('#co-pincode', '570023')
    await p.selectOption('#co-state', 'karnataka')
    await p.locator('[data-dk-next]').tap()
    await p.waitForURL(/\/review$/)
    await sleep(400)
    await p.locator('[data-dk-place]').tap()
    await p.waitForURL(/\/pay\//, { timeout: 15000 })
    const code = p.url().split('/pay/')[1]
    const order = await fetch(`${BASE}/api/order`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ code, phone: '9741012345' }) }).then((r) => r.json())
    const line = order.order?.items?.[0]
    check(order.order?.total === 600 && line?.name?.en === 'Choco Chip Brownies' && line.ragi === true && line.unitPrice === 510, `ordered: ${code}, Choco Chip Brownies (ragi) ₹510 + ₹90 courier = ₹${order.order?.total}, priced by the server`, `order: ${JSON.stringify(order).slice(0, 300)}`)
    await shot(p, '25-new-product-ordered')
    await c.close()
  }

  /* ---------------- 4. only between the dates: the customer's clock moves on ---------------- */
  {
    const { ctx: c, page: p } = await newPage(browser)
    // 3 days later in India, the Diwali offer (ends in 2 days) has gone; the Choco Chip one stays
    await p.clock.setFixedTime(new Date(Date.now() + 3 * 86_400_000))
    await p.goto(`${BASE}/`)
    await ready(p)
    await p.waitForSelector('[data-dk-offers=banner]')
    await sleep(500)
    const text = await p.locator('[data-dk-offers=banner]').innerText()
    const dots = await p.locator('[data-dk-offer-dot]').count()
    check(!/Diwali/.test(text) && /Choco Chip/.test(text) && dots === 0, 'after its end date an offer is gone from the banner (one left, no dots)', `3 days later the banner shows: ${text} (${dots} dots)`)
    await shot(p, '26-home-after-end-date')
    await p.clock.setFixedTime(new Date(Date.now() + 7 * 86_400_000))
    await p.reload()
    await ready(p)
    await sleep(800)
    check((await p.locator('[data-dk-offers]').count()) === 0, 'after every end date there is no banner at all', 'a banner shows after every end date')
    await c.close()
  }

  /* ---------------- 5. turn off and delete ---------------- */
  await page.goto(`${BASE}/admin/offers`)
  await page.waitForSelector('[data-admin-offer]')
  const diwali = page.locator('[data-admin-offer]', { hasText: 'Diwali' })
  await diwali.locator('[data-admin-offer-toggle]').click()
  await page.waitForSelector('[data-admin-offer-status=off]')
  await shot(page, '16-offer-turned-off', true)
  m = await menuApi()
  check(m.offers.length === 1 && m.offers[0].title.en.startsWith('New: Choco'), 'Turn off: the offer leaves the website at once', `after Turn off the website has: ${m.offers.map((o) => o.title.en)}`)
  const choco = page.locator('[data-admin-offer]', { hasText: 'Choco Chip' })
  await choco.locator('[data-admin-offer-delete]').click()
  await shot(page, '17-offer-delete-confirm')
  await choco.locator('[data-admin-offer-delete-yes]').click()
  await page.locator('text=Offer deleted.').waitFor()
  check((await page.locator('[data-admin-offer]').count()) === 2, 'Delete asks first, then removes the offer', 'the offer was not deleted')
  m = await menuApi()
  check(m.offers.length === 0, 'with no live offer the website gets none', `offers left: ${m.offers.length}`)
  // Edit the scheduled one to start today: it goes live
  await page.locator('[data-admin-offer]', { hasText: 'Christmas' }).locator('[data-admin-offer-edit]').click()
  await page.locator('[data-admin-offer-start]').fill(today)
  await page.locator('[data-admin-offer-save]').click()
  await page.waitForSelector('[data-admin-offer-flash]')
  check((await page.locator('[data-admin-offer]', { hasText: 'Christmas' }).getAttribute('data-admin-offer-status')) === 'live', 'Edit: a scheduled offer moved to today is live', 'edit did not make it live')
  await page.locator('[data-admin-offer]', { hasText: 'Christmas' }).locator('[data-admin-offer-delete]').click()
  await page.locator('[data-admin-offer-delete-yes]').click()
  await page.locator('text=Offer deleted.').waitFor()
  await shot(page, '18-offers-after', true)
  {
    const { ctx: c, page: p } = await newPage(browser)
    await p.goto(`${BASE}/`)
    await ready(p)
    await sleep(1200)
    check((await p.locator('[data-dk-offers]').count()) === 0, 'no live offer: Home shows no banner', 'Home still shows a banner')
    await shot(p, '27-home-no-offer')
    await c.close()
  }
  await ctx.close()

  /* ---------------- 6. the demo admin has sample offers ---------------- */
  {
    const { ctx: c, page: p } = await newPage(browser)
    await p.goto(`${BASE}/admin/demo/offers`)
    await p.waitForSelector('[data-admin-offer]')
    const s = await p.locator('[data-admin-offer]').evaluateAll((els) => els.map((e) => e.getAttribute('data-admin-offer-status')))
    check(s.join(',') === 'live,scheduled,off,ended', `demo: sample offers ${s.join(', ')}`, `demo offers: ${s.join(', ')}`)
    await audit(p, 'demo offers')
    await shot(p, '19-demo-offers', true)
    await p.goto(`${BASE}/admin/demo/menu`)
    await p.waitForSelector('[data-admin-tile]')
    check((await p.locator('[data-admin-tile]').count()) === 3, 'demo: the Customize page photos section', 'demo: no Customize tiles')
    await c.close()
  }
} catch (e) {
  fail(`stopped: ${e.message.split('\n')[0]}`)
  for (const c of browser.contexts()) for (const pg of c.pages()) await pg.screenshot({ path: `${OUT}/zz-failure-${c.pages().indexOf(pg)}.png` }).catch(() => {})
} finally {
  await browser.close()
}

if (report.consoleErrors.length) fail(`console errors: ${report.consoleErrors.length}`)
if (report.overflow.length) fail(`sideways scroll: ${report.overflow.join('; ')}`)
if (report.smallTargets.length) fail(`targets under 48px: ${report.smallTargets.length}`)
writeFileSync(`${OUT}/qa-report.json`, JSON.stringify(report, null, 2))
console.log(`\n${report.flows.length} checks passed, ${report.failures.length} problems. Report: ${OUT}/qa-report.json`)
if (report.consoleErrors.length) console.log(report.consoleErrors.slice(0, 10).join('\n'))
if (report.smallTargets.length) console.log(report.smallTargets.slice(0, 20).join('\n'))
process.exit(report.failures.length ? 1 : 0)
