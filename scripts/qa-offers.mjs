// QA for Hema's requests of 24 Oct 2026, in a real browser: in the admin (phone size) she renames
// a product and gives it a description, adds a product with a photo, changes a Customize page tile
// photo and makes offers (one deleted after the confirm); then the shop is checked at 390px and
// 1280px in English and Kannada: the home banner (turning to the next offer), the menu strip, the
// product sheet's description, the new product and the Customize page. Checks: no console errors,
// no sideways scroll, no clipped text, every button 48px or more.
//
// Needs the dev server with a FRESH practice database:
//   UPI_ID=dreamkitchen@okaxis HEMA_EMAIL=hema@example.com DK_DEV_ADMIN_EMAIL=hema@example.com \
//   DK_DEV_ADMIN_PASSWORD=dev-only-pass DK_RELAX_LIMITS=1 DK_DEV_DATA_DIR=.dev-data/qa-offers npx vite --port 5173
// then: node scripts/qa-offers.mjs   (exits non-zero on any problem; screenshots in DK_OUT, default docs/screenshots/offers)
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { chromium } from 'playwright'
import sharp from 'sharp'

const BASE = process.env.DK_BASE || 'http://localhost:5173'
const OUT = process.env.DK_OUT || 'docs/screenshots/offers'
const ADMIN = { email: process.env.DK_DEV_ADMIN_EMAIL || 'hema@example.com', password: process.env.DK_DEV_ADMIN_PASSWORD || 'dev-only-pass' }
const HEIGHT = { 390: 844, 1280: 800 }
mkdirSync(OUT, { recursive: true })
const report = { consoleErrors: [], overflow: [], textOverflow: [], smallTargets: [], flows: [], failures: [] }
const fail = (m) => {
  report.failures.push(m)
  console.error('FAIL', m)
}
const ok = (m) => {
  report.flows.push(m)
  console.log('ok  ', m)
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const shot = (page, name, full = false) => page.screenshot({ path: join(OUT, `${name}.png`), fullPage: full })

/** A photo "from Hema's phone": gold words on a brown background */
const photo = (w, h, words) =>
  sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><defs><linearGradient id="g" x1="0" x2="1"><stop offset="0" stop-color="#3a2416"/><stop offset="1" stop-color="#7a4a26"/></linearGradient></defs><rect width="100%" height="100%" fill="url(#g)"/><circle cx="${w * 0.75}" cy="${h * 0.5}" r="${h * 0.32}" fill="#d4af37" opacity="0.5"/><text x="50%" y="55%" font-size="${Math.round(h / 8)}" text-anchor="middle" fill="#ebd27a" font-family="Georgia">${words}</text></svg>`))
    .jpeg({ quality: 85 })
    .toBuffer()

async function newPage(browser, width, lang = 'en') {
  const ctx = await browser.newContext({ viewport: { width, height: HEIGHT[width] }, deviceScaleFactor: 1, hasTouch: width < 768, isMobile: width < 768 })
  await ctx.addInitScript((l) => {
    localStorage.setItem('dk_intro_seen', '1')
    localStorage.setItem('dk_lang', l)
  }, lang)
  const page = await ctx.newPage()
  page.on('pageerror', (e) => report.consoleErrors.push(`${width}-${lang}: ${e.message}`))
  page.on('console', (m) => m.type() === 'error' && !/401|404 \(Not Found\)|net::ERR_ABORTED/.test(m.text()) && report.consoleErrors.push(`${width}-${lang}: ${m.text()}`))
  return { ctx, page }
}

async function go(page, path) {
  await page.goto(BASE + path)
  if (!path.startsWith('/admin')) await page.waitForFunction(() => window.__dkReady === true, null, { timeout: 20000 })
  await page.waitForFunction(() => document.fonts.status === 'loaded', null, { timeout: 15000 }).catch(() => {})
  await sleep(400)
}

// Sideways scroll, clipped text, small targets (the same rules as qa-step6 and qa-admin)
async function audit(page, label, scopeSelector = null) {
  const r = await page.evaluate((sel) => {
    const small = []
    const clipped = []
    const scope = (sel && document.querySelector(sel)) || document.querySelector('[role=dialog]') || document
    scope.querySelectorAll('a[href], button, input:not([type=hidden]):not([tabindex="-1"]), select, textarea, label:has(input[type=radio]), label:has(input[type=checkbox])').forEach((el) => {
      const b = el.getBoundingClientRect()
      if (!b.width || !b.height || el.closest('.sr-only, [aria-hidden=true], [inert]') || getComputedStyle(el).visibility === 'hidden') return
      if (el.matches('input[type=radio], input[type=checkbox], input[type=file]')) return
      if (b.height < 47.5 || b.width < 31.5) small.push(`${el.tagName.toLowerCase()} "${(el.innerText || el.getAttribute('aria-label') || '').trim().slice(0, 30)}" ${Math.round(b.width)}x${Math.round(b.height)}`)
    })
    scope.querySelectorAll('button, a, .btn, legend, h1, h2, h3, label, p, li, span').forEach((el) => {
      if (el.closest('.sr-only, [aria-hidden=true]') || el.classList.contains('truncate')) return
      const cs = getComputedStyle(el)
      if (el.scrollWidth > el.clientWidth + 1 && cs.overflowX !== 'auto' && cs.display !== 'inline' && el.clientWidth > 2) clipped.push(`${el.tagName.toLowerCase()} "${el.innerText.trim().slice(0, 30)}"`)
    })
    const doc = document.documentElement
    return { overflow: doc.scrollWidth > doc.clientWidth + 1, small, clipped }
  }, scopeSelector)
  if (r.overflow) report.overflow.push(label)
  r.small.forEach((s) => report.smallTargets.push(`${label}: ${s}`))
  r.clipped.forEach((s) => report.textOverflow.push(`${label}: ${s}`))
}

/* ---------------- 1. the admin, at phone size ---------------- */
async function adminFlows(browser) {
  const { ctx, page } = await newPage(browser, 390)
  await go(page, '/admin')
  await page.fill('input[type=email]', ADMIN.email)
  await page.fill('input[type=password]', ADMIN.password)
  await page.click('button[type=submit]')
  await page.waitForSelector('[data-admin-card=newOrders]')
  if ((await page.locator('nav[aria-label=Admin] a').allInnerTexts()).map((s) => s.trim()).join(',') !== 'Home,Orders,Offers,Classes,Menu,More') fail('the admin tabs are not Home, Orders, Offers, Classes, Menu, More')
  else ok('the Offers tab sits between Orders and Classes')
  await audit(page, 'admin-home')

  // Edit name + Description
  await go(page, '/admin/menu')
  await page.waitForSelector('[data-admin-product=almond-bar]')
  const bar = page.locator('[data-admin-product=almond-bar]')
  await bar.locator('[data-admin-edit-name]').click()
  await bar.locator('[data-admin-text-en]').fill('Almond Crunch Bar')
  await bar.locator('[data-admin-text-kn]').fill('ಬಾದಾಮಿ ಕ್ರಂಚ್ ಬಾರ್')
  await bar.locator('[data-admin-text-save]').click()
  await bar.locator('text=Name saved').waitFor()
  if ((await bar.locator('[data-admin-product-name]').innerText()).trim() !== 'Almond Crunch Bar') fail('the new name does not show in the admin')
  else ok('Edit name: English and Kannada saved, id unchanged')
  await bar.locator('[data-admin-edit-description]').click()
  await bar.locator('[data-admin-text-en]').fill('Whole roasted almonds in smooth milk chocolate.')
  if (!(await bar.locator('[data-admin-counter]').first().innerText()).includes('/ 200')) fail('the description has no counter')
  await bar.locator('[data-admin-text-kn]').fill('ನಯವಾದ ಮಿಲ್ಕ್ ಚಾಕೊಲೇಟ್‌ನಲ್ಲಿ ಹುರಿದ ಬಾದಾಮಿ.')
  await shot(page, 'admin-01-description-390')
  await bar.locator('[data-admin-text-save]').click()
  await bar.locator('text=Description saved').waitFor()
  ok('Description: saved with a 200-letter counter')
  await audit(page, 'admin-menu-edit')

  // + Add new product (chocolates), with a photo
  await page.click('[data-admin-add-product=chocolates]')
  const form = page.locator('[data-admin-add-form=chocolates]')
  await form.locator('[data-admin-new-name-en]').fill('Kaju Celebration Bar')
  await form.locator('[data-admin-new-name-kn]').fill('ಗೋಡಂಬಿ ಸೆಲೆಬ್ರೇಷನ್ ಬಾರ್')
  await form.locator('[data-admin-new-desc-en]').fill('Whole cashews in dark chocolate, wrapped as a gift.')
  await form.locator('[data-admin-new-price]').fill('399')
  await form.locator('label:has-text("Yes, ragi too")').click()
  await form.locator('[data-admin-new-ragi-price]').fill('40')
  await form.locator('label:has-text("Large")').click()
  await form.locator('[data-admin-new-photo]').setInputFiles({ name: 'IMG_3001.jpg', mimeType: 'image/jpeg', buffer: await photo(1600, 1200, 'Kaju bar') })
  await form.locator('img').first().waitFor()
  await shot(page, 'admin-02-add-product-390', true)
  await audit(page, 'admin-add-product', '[data-admin-add-form=chocolates]')
  await form.locator('[data-admin-new-save]').click()
  await page.waitForSelector('[data-admin-product=kaju-celebration-bar]')
  const added = page.locator('[data-admin-product=kaju-celebration-bar]')
  await added.scrollIntoViewIfNeeded()
  await shot(page, 'admin-03-added-390')
  ok('+ Add new product: on the menu with its photo, ragi and courier size')

  // Customize page tile photo
  await page.locator('[data-admin-tile=delight-box]').scrollIntoViewIfNeeded()
  await page.setInputFiles('[data-admin-tile-photo=delight-box]', { name: 'IMG_3002.jpg', mimeType: 'image/jpeg', buffer: await photo(1200, 1200, 'Name box') })
  await page.locator('[data-admin-tile=delight-box]').locator('text=Photo saved').waitFor({ timeout: 15000 })
  await shot(page, 'admin-04-tiles-390')
  ok('Customize page tile photo saved')

  // Offers: two live (one with a banner photo), one to delete
  await go(page, '/admin/offers')
  await page.waitForSelector('[data-admin-add-offer]')
  const addOffer = async (o) => {
    await page.click('[data-admin-add-offer]')
    const f = page.locator('[data-admin-offer-form]')
    await f.locator('[data-admin-offer-title-en]').fill(o.title)
    if (o.titleKn) await f.locator('label:has-text("Title in Kannada") input').fill(o.titleKn)
    if (o.message) await f.locator('[data-admin-offer-message-en]').fill(o.message)
    if (o.messageKn) await f.locator('label:has-text("Short message in Kannada") textarea').fill(o.messageKn)
    if (o.photo) await f.locator('[data-admin-offer-photo]').setInputFiles({ name: 'banner.jpg', mimeType: 'image/jpeg', buffer: o.photo })
    if (o.photo) await f.locator('img').first().waitFor()
    await f.locator('[data-admin-offer-link]').selectOption(o.link)
    await f.locator('[data-admin-offer-button-en]').fill(o.button)
    if (o.buttonKn) await f.locator('label:has-text("Button text in Kannada") input').fill(o.buttonKn)
    if (o.shot) {
      await shot(page, o.shot, true)
      await audit(page, 'admin-offer-form', '[data-admin-offer-form]')
    }
    await f.locator('[data-admin-offer-save]').click()
    await page.waitForSelector(`[data-admin-offer] >> text=${o.title}`)
  }
  await addOffer({
    title: 'Diwali gift boxes',
    titleKn: 'ದೀಪಾವಳಿ ಉಡುಗೊರೆ ಬಾಕ್ಸ್‌ಗಳು',
    message: 'Any Delight Box can carry a name for free, or a drawing.',
    messageKn: 'ಯಾವುದೇ ಡಿಲೈಟ್ ಬಾಕ್ಸ್ ಮೇಲೆ ಹೆಸರು ಉಚಿತ, ಅಥವಾ ಚಿತ್ರ.',
    photo: await photo(2400, 1200, 'Diwali boxes'),
    link: 'category:delight-boxes',
    button: 'See Delight Boxes',
    buttonKn: 'ಡಿಲೈಟ್ ಬಾಕ್ಸ್‌ಗಳನ್ನು ನೋಡಿ',
    shot: 'admin-05-offer-form-390',
  })
  await addOffer({ title: 'New: Kaju Celebration Bar', message: 'Whole cashews in dark chocolate.', link: 'product:kaju-celebration-bar', button: 'Order now' })
  await addOffer({ title: 'Delete me', link: 'category:brownies', button: 'Order now' })
  const del = page.locator('[data-admin-offer]', { hasText: 'Delete me' })
  await del.locator('[data-admin-offer-delete]').click()
  await del.locator('[role=alertdialog]').waitFor()
  await shot(page, 'admin-06-offer-delete-confirm-390')
  await del.locator('[data-admin-offer-delete-yes]').click()
  await page.waitForFunction(() => ![...document.querySelectorAll('[data-admin-offer]')].some((e) => e.innerText.includes('Delete me')))
  ok('Offers: add (with banner photo), and delete after the confirm')
  await shot(page, 'admin-07-offers-390', true)
  await audit(page, 'admin-offers')
  await ctx.close()

  // The same admin screens at desktop width
  const desk = await newPage(browser, 1280)
  await go(desk.page, '/admin')
  await desk.page.fill('input[type=email]', ADMIN.email)
  await desk.page.fill('input[type=password]', ADMIN.password)
  await desk.page.click('button[type=submit]')
  await desk.page.waitForSelector('[data-admin-card=newOrders]')
  for (const [path, name] of [
    ['/admin/offers', 'admin-08-offers-1280'],
    ['/admin/menu', 'admin-09-menu-1280'],
  ]) {
    await go(desk.page, path)
    await sleep(600)
    await shot(desk.page, name)
    await audit(desk.page, name)
  }
  await desk.ctx.close()
}

/* ---------------- 2. the shop, 390 / 1280 × English / Kannada ---------------- */
async function shop(browser, width, lang) {
  const tag = `${width}-${lang}`
  const { ctx, page } = await newPage(browser, width, lang)
  await go(page, '/')
  await page.waitForSelector('[data-dk-offers]', { timeout: 15000 })
  const title = async () => (await page.locator('[data-dk-offer]:not([aria-hidden=true]) h2').innerText()).trim()
  const first = await title()
  const want = lang === 'kn' ? 'ದೀಪಾವಳಿ ಉಡುಗೊರೆ ಬಾಕ್ಸ್‌ಗಳು' : 'Diwali gift boxes'
  if (first !== want) fail(`${tag}: home banner shows "${first}", expected "${want}"`)
  await shot(page, `shop-01-home-${tag}`)
  await audit(page, `home-${tag}`)
  await page.click('[data-dk-offer-next]')
  await sleep(700)
  const second = await title()
  if (second === first) fail(`${tag}: the next button didn't change the offer`)
  else ok(`${tag}: home banner, ${first} -> ${second}`)
  await shot(page, `shop-02-home-next-${tag}`)
  // the second offer's button opens the new product's sheet
  await page.locator('[data-dk-offer]:not([aria-hidden=true]) [data-dk-offer-button]').click()
  await page.waitForSelector('[role=dialog]')
  const sheetTitle = (await page.locator('[role=dialog] h2').first().innerText()).trim()
  if (sheetTitle !== (lang === 'kn' ? 'ಗೋಡಂಬಿ ಸೆಲೆಬ್ರೇಷನ್ ಬಾರ್' : 'Kaju Celebration Bar')) fail(`${tag}: the offer button opened "${sheetTitle}"`)
  else ok(`${tag}: offer button -> the new product's sheet`)
  await sleep(400)
  await shot(page, `shop-03-new-product-sheet-${tag}`)
  await audit(page, `sheet-new-${tag}`)
  await page.keyboard.press('Escape')

  // Menu: the slim strip, and the renamed product with its description
  await go(page, '/menu')
  await page.waitForSelector('[data-dk-offer-strip]')
  await shot(page, `shop-04-menu-strip-${tag}`)
  await audit(page, `menu-${tag}`)
  const renamed = lang === 'kn' ? 'ಬಾದಾಮಿ ಕ್ರಂಚ್ ಬಾರ್' : 'Almond Crunch Bar'
  await page.locator('[data-dk-card]', { hasText: renamed }).click()
  await page.waitForSelector('[role=dialog]')
  await sleep(400)
  const text = await page.locator('[role=dialog]').innerText()
  const desc = lang === 'kn' ? 'ನಯವಾದ ಮಿಲ್ಕ್ ಚಾಕೊಲೇಟ್‌ನಲ್ಲಿ ಹುರಿದ ಬಾದಾಮಿ.' : 'Whole roasted almonds in smooth milk chocolate.'
  if (!text.includes(desc)) fail(`${tag}: the product sheet doesn't show the description`)
  else ok(`${tag}: renamed product's sheet shows its description`)
  await shot(page, `shop-05-sheet-description-${tag}`)
  await page.keyboard.press('Escape')
  await sleep(300)
  // The strip's button goes to the category on the same page
  await page.locator('[data-dk-offer-strip-button]').click()
  await sleep(900)

  // Customize: the tile photo Hema chose
  await go(page, '/customize')
  const src = await page.locator('[data-dk-tile=delight-box] img').getAttribute('src')
  if (!/\/api\/photo\/tile-delight-box\//.test(src || '')) fail(`${tag}: the Delight Box tile shows ${src}`)
  else ok(`${tag}: Customize tile shows Hema's photo`)
  await shot(page, `shop-06-customize-${tag}`)
  await audit(page, `customize-${tag}`)
  await ctx.close()
}

/* ---------------- 3. no offers = nothing at all ---------------- */
async function noOffers(browser) {
  // Turn both off through the admin API, check the pages, turn them back on
  const login = await fetch(`${BASE}/api/admin`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action: 'login', ...ADMIN }) }).then((r) => r.json())
  const call = (action, body) => fetch(`${BASE}/api/admin`, { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${login.accessToken}` }, body: JSON.stringify({ action, ...body }) }).then((r) => r.json())
  const { offers } = await call('offers', {})
  for (const o of offers) await call('saveOffer', { id: o.id, active: false })
  const { ctx, page } = await newPage(browser, 390)
  await go(page, '/')
  await sleep(800)
  if (await page.locator('[data-dk-offers]').count()) fail('the home banner shows with no live offers')
  await go(page, '/menu')
  await sleep(500)
  if (await page.locator('[data-dk-offer-strip]').count()) fail('the menu strip shows with no live offers')
  else ok('no live offers: no banner, no strip')
  await ctx.close()
  for (const o of offers) await call('saveOffer', { id: o.id, active: true })
}

const browser = await chromium.launch()
try {
  await adminFlows(browser)
  for (const width of [390, 1280]) for (const lang of ['en', 'kn']) await shop(browser, width, lang)
  await noOffers(browser)
} catch (e) {
  fail(`stopped: ${e.message.split('\n')[0]}`)
} finally {
  await browser.close()
}
writeFileSync(join(OUT, 'qa-report.json'), JSON.stringify(report, null, 2))
for (const k of ['consoleErrors', 'overflow', 'textOverflow', 'smallTargets', 'failures']) if (report[k].length) console.log(`\n${k}:\n  ${report[k].slice(0, 30).join('\n  ')}`)
const problems = ['consoleErrors', 'overflow', 'textOverflow', 'smallTargets', 'failures'].reduce((n, k) => n + report[k].length, 0)
console.log(`\n${report.flows.length} flows ok, ${problems} problems. Screenshots: ${OUT}`)
process.exit(problems ? 1 : 0)
