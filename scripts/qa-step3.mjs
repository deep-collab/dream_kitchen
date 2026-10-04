// Step 3 QA: checkout, dates, price check, WhatsApp order, success, call-back, Track Order.
// Needs the dev server: `npm run dev -- --port 5173`, then: node scripts/qa-step3.mjs [outDir]
// (Dev server: the sold-out fixture, cart seeding and the sample-message fixture are dev-only.)
// "Now" is frozen with Playwright's clock so the dates in the screenshots are stable.
import { mkdirSync, writeFileSync } from 'node:fs'
import { chromium } from 'playwright'
import { site } from '../src/config/site.js'

const BASE = 'http://localhost:5173'
const OUT = process.argv[2] || 'docs/screenshots/step3'
const WIDTHS = [360, 390, 768, 1280]
const HEIGHT = { 360: 780, 390: 844, 768: 1024, 1280: 800 }
const MONDAY = '2026-10-05T10:00:00+05:30'
const FRIDAY = '2026-10-09T11:00:00+05:30'
const SATURDAY_LATE = '2026-10-10T23:30:00+05:30' // 11:30 pm IST: already Sunday on a phone in Auckland
const report = { overflow: [], textOverflow: [], smallTargets: [], links: [], whatsapp: [], focus: [], dates: [], notes: [] }
mkdirSync(OUT, { recursive: true })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function newPage(browser, width, lang, { now = MONDAY, timezoneId = 'Asia/Kolkata', soldOut, blockPopups } = {}) {
  const ctx = await browser.newContext({ viewport: { width, height: HEIGHT[width] }, deviceScaleFactor: 1, timezoneId })
  await ctx.clock.setFixedTime(new Date(now))
  await ctx.addInitScript(
    ([l, sold, block]) => {
      sessionStorage.setItem('dk_intro_seen', '1')
      localStorage.setItem('dk_lang', l)
      if (sold) window.__dkTestSoldOut = sold
      if (block) window.open = () => null // a browser that blocks the WhatsApp tab
    },
    [lang, soldOut || null, Boolean(blockPopups)],
  )
  // Never leave the machine: answer wa.me with a stub page and record the URL
  await ctx.route('https://wa.me/**', (route) => {
    report.whatsapp.push(route.request().url())
    route.fulfill({ status: 200, contentType: 'text/html', body: '<title>WhatsApp</title><p>WhatsApp would open here.</p>' })
  })
  const page = await ctx.newPage()
  page.on('pageerror', (e) => report.notes.push(`${width}-${lang} page error: ${e.message}`))
  page.on('console', (m) => m.type() === 'error' && report.notes.push(`${width}-${lang} console: ${m.text()}`))
  return { ctx, page }
}

async function go(page, path) {
  await page.goto(BASE + path)
  try {
    await page.waitForFunction(() => window.__dkReady === true, null, { timeout: 15000 })
  } catch {
    report.notes.push(`retry: ${path} was not ready after 15s, reloaded once`)
    await page.reload()
    await page.waitForFunction(() => window.__dkReady === true)
  }
  // Wait until the web fonts have actually arrived (Kannada fonts load on demand)
  await page.waitForFunction(() => document.fonts.status === 'loaded' && document.fonts.check('600 20px "Cormorant Garamond"') && document.fonts.check('16px Lato'), null, { timeout: 15000 }).catch(() => report.notes.push(`fonts slow on ${path}`))
  await sleep(450)
}

const shot = (page, name) => page.screenshot({ path: `${OUT}/${name}.png` })
// Full-page shots hide the fixed bars (they would be painted mid-page); the bar has its own shot
async function fullShot(page, name) {
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }))
  await sleep(150)
  const style = await page.addStyleTag({ content: 'nav.fixed.bottom-0, div.fixed.bottom-0 { display: none !important }' })
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: true })
  await style.evaluate((el) => el.remove())
}
async function scrollTo(page, selector, block = 'start') {
  await page.locator(selector).first().evaluate((el, b) => el.scrollIntoView({ block: b, behavior: 'instant' }), block)
  await sleep(250)
}

// Layout checks on whatever is on screen (or in the open dialog)
async function audit(page, label) {
  const r = await page.evaluate(() => {
    const doc = document.documentElement
    const small = []
    const clipped = []
    const scope = document.querySelector('[role=dialog]') || document
    scope.querySelectorAll('a[href], button, input:not([type=hidden]), select, textarea, [role=switch], label:has(input[type=radio]), label:has(input[type=checkbox])').forEach((el) => {
      const b = el.getBoundingClientRect()
      if (!b.width || !b.height || el.closest('.sr-only') || getComputedStyle(el).visibility === 'hidden') return
      if (el.matches('input[type=radio], input[type=checkbox]')) return // their labels are the targets
      if (el.matches('button') && el.closest('h3')) return // stretched card buttons cover the card
      if (b.height < 47.5 || b.width < 47.5) small.push(`${el.tagName.toLowerCase()} "${(el.innerText || el.getAttribute('aria-label') || '').trim().slice(0, 30)}" ${Math.round(b.width)}x${Math.round(b.height)}`)
    })
    scope.querySelectorAll('button, a, .chip, .btn, legend, h1, h2, h3, label, dd, p').forEach((el) => {
      if (!el.classList.contains('sr-only') && el.scrollWidth > el.clientWidth + 1 && getComputedStyle(el).overflowX !== 'auto' && el.clientWidth > 2)
        clipped.push(`${el.tagName.toLowerCase()} "${el.innerText.trim().slice(0, 30)}"`)
    })
    return { overflow: doc.scrollWidth > doc.clientWidth + 1, small, clipped }
  })
  if (r.overflow) report.overflow.push(label)
  r.small.forEach((s) => report.smallTargets.push(`${label}: ${s}`))
  r.clipped.forEach((s) => report.textOverflow.push(`${label}: ${s}`))
  // Every call and WhatsApp link on the page
  const links = await page.evaluate(() => [...document.querySelectorAll('a[href^="tel:"], a[href*="wa.me"]')].map((a) => a.getAttribute('href')))
  for (const href of links) {
    const ok = href.startsWith('tel:') ? href === `tel:${site.phone.tel}` : href.startsWith(`https://wa.me/${site.whatsapp}`)
    if (!ok) report.links.push(`${label}: BAD ${href}`)
  }
  report.links.push(`${label}: ${links.length} call/WhatsApp links checked`)
}

// Seed the cart through the app's own pure functions (the dev server serves /src)
async function seedCart(page, { stalePrice = false, withBiscoff = false } = {}) {
  await page.evaluate(
    async ([stale, biscoff]) => {
      const cart = await import('/src/lib/cart.js')
      const { products } = await import('/src/data/products.js')
      const { categories, occasions } = await import('/src/data/categories.js')
      const { combos } = await import('/src/data/combos.js')
      const byId = Object.fromEntries(products.map((p) => [p.id, p]))
      const ctx = { sections: categories.flatMap((c) => c.sections), occasions }
      let lines = []
      lines = cart.addLine(lines, cart.makeProductLine(byId['ferrero-rocher-nutella-tub'], { size: '500g', nameOn: true, name: 'Asha', occasion: 'birthday', note: 'Less sweet please' }, 1, ctx))
      if (biscoff) lines = cart.addLine(lines, cart.makeProductLine(byId['dreamy-biscoff-delight'], { flavour: 'mango' }, 2, ctx))
      lines = cart.addLine(lines, cart.makeComboLine(combos[0], ['walnut-white-chocolate-bar', 'coconut-bar', 'coconut-bar'], 1, byId))
      // A price from an earlier visit: the menu now says ₹1,099 for this line
      if (stale) lines = lines.map((l, i) => (i === 0 ? { ...l, unitPrice: 999 } : l))
      localStorage.setItem(cart.CART_STORAGE_KEY, cart.serialiseCart(lines))
    },
    [stalePrice, withBiscoff],
  )
}

async function fillCheckout(page, lang) {
  await page.fill('#co-name', 'Asha Rao')
  await page.fill('#co-phone', '+91 98450 12345')
  await page.fill('#co-address', '12, 3rd Cross\nJayanagar 4th Block')
  await page.fill('#co-area', lang === 'kn' ? 'ಜಯನಗರ, ಬೆಂಗಳೂರು' : 'Jayanagar, Bengaluru')
  await page.fill('#co-pincode', '560011')
  await page.locator('label:has(input[name="co-date"])').nth(1).click()
  await page.fill('#co-note', lang === 'kn' ? 'ತಲುಪಿಸುವ ಮೊದಲು ಕರೆ ಮಾಡಿ.' : 'Please call before delivering.')
  await page.locator('#co-note').blur()
  await sleep(200)
}

const submitButton = (page, width) => (width < 768 ? page.locator('div.fixed.bottom-0 button[type=submit]') : page.locator('button[type=submit][form="checkout-form"]').first())

async function main() {
  const browser = await chromium.launch()

  for (const width of WIDTHS) {
    for (const lang of ['en', 'kn']) {
      const tag = `${width}-${lang}`

      /* ---------- checkout: empty, errors, filled, sticky bar, success, fallback, track ---------- */
      {
        const { ctx, page } = await newPage(browser, width, lang)
        await go(page, '/shop')
        await seedCart(page)
        await go(page, '/checkout')
        await shot(page, `checkout-empty-${tag}`)
        await fullShot(page, `checkout-empty-full-${tag}`)
        await audit(page, `${tag} /checkout`)
        if (width < 768) {
          await scrollTo(page, '#co-address', 'center')
          await shot(page, `sticky-bar-${tag}`)
        }

        // Submit with nothing filled in
        await submitButton(page, width).click()
        await sleep(500)
        const focus = await page.evaluate(() => ({ id: document.activeElement?.id, invalid: document.querySelectorAll('[aria-invalid=true]').length, live: document.querySelector('p.sr-only[aria-live]')?.textContent }))
        report.focus.push(`${tag}: after empty submit focus=#${focus.id}, aria-invalid fields=${focus.invalid}, announced="${focus.live}"`)
        await shot(page, `checkout-errors-${tag}`)
        await fullShot(page, `checkout-errors-full-${tag}`)
        await audit(page, `${tag} /checkout errors`)

        // Each pincode message, then a valid form
        await page.fill('#co-pincode', '600001')
        await page.locator('#co-pincode').blur()
        await sleep(150)
        report.focus.push(`${tag}: pincode 600001 says "${await page.locator('#co-pincode-error').innerText()}"`)
        await fillCheckout(page, lang)
        await scrollTo(page, '#co-date-group')
        await shot(page, `checkout-filled-dates-${tag}`)
        await fullShot(page, `checkout-filled-full-${tag}`)
        await audit(page, `${tag} /checkout filled`)
        if (width >= 768) {
          await scrollTo(page, 'button[type=submit][form="checkout-form"]', 'center')
          await shot(page, `checkout-submit-area-${tag}`)
        }

        // Call-back sheet from the top card
        await go(page, '/checkout')
        await page.locator('main button[aria-haspopup=dialog]').first().click()
        await page.waitForSelector('[role=dialog]')
        await sleep(450)
        await shot(page, `callback-form-${tag}`)
        await audit(page, `${tag} call-back sheet`)
        await page.locator('[role=dialog] button[type=submit]').click() // phone was prefilled? no: empty first visit → error
        await sleep(250)
        await shot(page, `callback-error-${tag}`)
        await page.fill('[role=dialog] input[type=tel]', '98450 12345')
        await page.locator('[role=dialog] .chip').first().click()
        const popup = ctx.waitForEvent('page')
        await page.locator('[role=dialog] button[type=submit]').click()
        await (await popup).close()
        await sleep(350)
        await shot(page, `callback-confirmation-${tag}`)
        await audit(page, `${tag} call-back confirmation`)
        await page.keyboard.press('Escape')
        await sleep(400)

        // Send the order
        await fillCheckout(page, lang)
        const orderPopup = ctx.waitForEvent('page')
        await submitButton(page, width).click()
        await (await orderPopup).close()
        await page.waitForURL(/\/order\//)
        await sleep(600)
        await shot(page, `success-${tag}`)
        await fullShot(page, `success-full-${tag}`)
        await audit(page, `${tag} success`)
        const cartAfter = await page.evaluate(() => JSON.parse(localStorage.getItem('dk_cart_v2')).lines.length)
        await page.reload()
        await page.waitForFunction(() => window.__dkReady === true)
        await sleep(400)
        report.notes.push(`${tag}: cart lines after success page = ${cartAfter}; after refresh the page still shows "${(await page.locator('h1').innerText()).trim()}"`)
        await scrollTo(page, '#fallback-title', 'start')
        await shot(page, `whatsapp-fallback-${tag}`)

        // Track this order (found)
        await page.locator('a[href^="/track?id"]').first().click()
        await page.waitForSelector('#track-found')
        await sleep(400)
        await shot(page, `track-found-${tag}`)
        await fullShot(page, `track-found-full-${tag}`)
        await audit(page, `${tag} track found`)
        report.notes.push(`${tag}: tracker aria-current = ${await page.locator('[aria-current=step]').innerText().then((s) => s.replace(/\s+/g, ' '))}`)
        await ctx.close()
      }

      /* ---------- a browser that blocks the WhatsApp tab: fallback box emphasised ---------- */
      {
        const { ctx, page } = await newPage(browser, width, lang, { blockPopups: true })
        await go(page, '/shop')
        await seedCart(page)
        await go(page, '/checkout')
        await fillCheckout(page, lang)
        await submitButton(page, width).click()
        await page.waitForURL(/\/order\//)
        await sleep(500)
        await scrollTo(page, '#fallback-title', 'center')
        await shot(page, `whatsapp-fallback-blocked-${tag}`)
        await ctx.close()
      }

      /* ---------- track not found ---------- */
      {
        const { ctx, page } = await newPage(browser, width, lang)
        await go(page, '/track?id=DK-261007-7Q4M&phone=9845012345')
        await page.waitForSelector('text=/DK-261007-7Q4M|ಸಿಗಲಿಲ್ಲ|couldn/')
        await sleep(300)
        await shot(page, `track-not-found-${tag}`)
        await audit(page, `${tag} track not found`)
        await go(page, '/track')
        await page.locator('form button[type=submit]').click()
        await sleep(250)
        await shot(page, `track-errors-${tag}`)
        await ctx.close()
      }

      /* ---------- date chips with a mocked Friday and Saturday ---------- */
      for (const [label, now, timezoneId] of [
        ['friday', FRIDAY, 'Asia/Kolkata'],
        ['saturday-late-auckland-phone', SATURDAY_LATE, 'Pacific/Auckland'],
      ]) {
        const { ctx, page } = await newPage(browser, width, lang, { now, timezoneId })
        await go(page, '/shop')
        await seedCart(page)
        await go(page, '/checkout')
        await scrollTo(page, '#co-date-group')
        await shot(page, `dates-${label}-${tag}`)
        if (lang === 'en' && width === 390) {
          const chips = await page.locator('input[name="co-date"]').evaluateAll((els) => els.map((e) => e.value).filter((v) => v !== 'other'))
          const phoneDay = await page.evaluate(() => new Date().toString())
          report.dates.push(`${label} (phone clock: ${phoneDay}): chips ${chips.join(', ')}`)
        }
        // "Pick another date" + a Sunday typed in
        if (label === 'friday') {
          await page.locator('label:has(input[name="co-date"][value=other])').click()
          await page.fill('#co-date-other', '2026-10-18')
          await page.locator('#co-date-other').blur()
          await sleep(200)
          await scrollTo(page, '#co-date-other', 'center')
          await shot(page, `dates-other-sunday-${tag}`)
          if (lang === 'en' && width === 390) report.dates.push(`other date min=${await page.locator('#co-date-other').getAttribute('min')}, Sunday 18 Oct says "${await page.locator('#co-date-other-error').innerText()}"`)
        }
        await ctx.close()
      }

      /* ---------- price changed + unavailable (cart and checkout) ---------- */
      {
        const { ctx, page } = await newPage(browser, width, lang, { soldOut: ['dreamy-biscoff-delight'] })
        await go(page, '/shop')
        await seedCart(page, { stalePrice: true })
        await go(page, '/cart')
        await shot(page, `price-changed-cart-${tag}`)
        await audit(page, `${tag} cart price changed`)
        await go(page, '/checkout')
        await scrollTo(page, '#co-summary')
        await shot(page, `price-changed-checkout-summary-${tag}`)
        await go(page, '/checkout')
        await shot(page, `price-changed-checkout-top-${tag}`)

        await seedCart(page, { withBiscoff: true })
        await go(page, '/cart')
        await shot(page, `unavailable-cart-${tag}`)
        await audit(page, `${tag} cart unavailable`)
        await scrollTo(page, 'li:has(.grayscale)', 'center')
        await shot(page, `unavailable-line-${tag}`)
        await go(page, '/checkout')
        await fillCheckout(page, lang)
        await submitButton(page, width).click()
        await sleep(400)
        report.focus.push(`${tag}: submit with an unavailable item focuses #${await page.evaluate(() => document.activeElement?.id)}`)
        await shot(page, `unavailable-checkout-blocked-${tag}`)
        await page.locator('#co-unavailable button').click()
        await sleep(400)
        await shot(page, `unavailable-removed-${tag}`)
        await ctx.close()
      }

      /* ---------- empty cart → /cart with a message; empty search with call options ---------- */
      {
        const { ctx, page } = await newPage(browser, width, lang)
        await go(page, '/checkout')
        report.notes.push(`${tag}: empty cart /checkout redirected to ${new URL(page.url()).pathname}`)
        await shot(page, `checkout-empty-cart-redirect-${tag}`)
        await go(page, '/shop')
        await page.fill('#shop-search', lang === 'en' ? 'zzz' : 'ಜಜಜ')
        await sleep(300)
        await scrollTo(page, '#results-title')
        await shot(page, `search-empty-call-options-${tag}`)
        await audit(page, `${tag} search empty`)
        await ctx.close()
      }
    }
  }

  // Three sample WhatsApp messages, built by the same fixture the unit tests use
  {
    const { ctx, page } = await newPage(browser, 390, 'en')
    await go(page, '/')
    const text = await page.evaluate(async () => {
      const { SAMPLES } = await import('/tests/fixtures/sampleOrders.js')
      const { orderMessage, orderWhatsAppUrl } = await import('/src/lib/whatsappMessage.js')
      const titles = { simple: '1. Simple order', personalised: '2. Order with a name on the box, an occasion and notes', combo: '3. Order with the bars combo' }
      return Object.entries(SAMPLES)
        .map(([k, make]) => {
          const order = make()
          return `${titles[k]}\n${'-'.repeat(titles[k].length)}\n${orderMessage(order)}\n\nLink: ${orderWhatsAppUrl(order).slice(0, 90)}…\n`
        })
        .join('\n')
    })
    writeFileSync(`${OUT}/whatsapp-samples.txt`, `Sample WhatsApp order messages (always English, plain text). Generated by scripts/qa-step3.mjs.\n\n${text}`)
    await ctx.close()
  }

  // WhatsApp URLs actually opened during the run
  const bad = report.whatsapp.filter((u) => !u.startsWith(`https://wa.me/${site.whatsapp}`))
  report.whatsapp = [`${report.whatsapp.length} WhatsApp tabs opened, ${bad.length} to a wrong number`, ...bad]

  await browser.close()
  writeFileSync(`${OUT}/qa-report.json`, JSON.stringify(report, null, 2))
  const brief = { ...report, links: report.links.filter((l) => l.includes('BAD')) }
  console.log(JSON.stringify(brief, null, 2))
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
