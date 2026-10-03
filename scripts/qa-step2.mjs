// Step 2 QA: screenshots + checks for the shop, sheets, combo builder and cart.
// Needs the dev server: `npm run dev -- --port 5173`, then: node scripts/qa-step2.mjs [outDir]
// (Dev server because the sold-out fixture and in-page cart seeding are dev-only.)
import { mkdirSync, writeFileSync } from 'node:fs'
import { chromium } from 'playwright'

const BASE = 'http://localhost:5173'
const OUT = process.argv[2] || 'docs/screenshots/step2'
const WIDTHS = [360, 390, 768, 1280]
const HEIGHT = { 360: 780, 390: 844, 768: 1024, 1280: 800 }
const report = { overflow: [], textOverflow: [], smallTargets: [], keyboard: [], swipe: [], notes: [] }
mkdirSync(OUT, { recursive: true })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function newPage(browser, width, lang, { soldOut } = {}) {
  const ctx = await browser.newContext({ viewport: { width, height: HEIGHT[width] }, deviceScaleFactor: 1 })
  await ctx.addInitScript(
    ([l, sold]) => {
      sessionStorage.setItem('dk_intro_seen', '1')
      localStorage.setItem('dk_lang', l)
      if (sold) window.__dkTestSoldOut = sold
    },
    [lang, soldOut || null],
  )
  const page = await ctx.newPage()
  page.on('pageerror', (e) => report.notes.push(`${width}-${lang} page error: ${e.message}`))
  return { ctx, page }
}

async function go(page, path) {
  await page.goto(BASE + path)
  await page.waitForFunction(() => window.__dkReady === true)
  await page.evaluate(() => document.fonts.ready)
  await sleep(500)
}

const shot = (page, name) => page.screenshot({ path: `${OUT}/${name}.png` })

// Layout checks on whatever is on screen now
async function audit(page, label) {
  const r = await page.evaluate(() => {
    const doc = document.documentElement
    const small = []
    const clipped = []
    const scope = document.querySelector('[role=dialog]') || document
    scope.querySelectorAll('a[href], button, input:not([type=hidden]), select, textarea, [role=switch], label:has(input[type=radio])').forEach((el) => {
      const b = el.getBoundingClientRect()
      if (!b.width || !b.height || el.closest('.sr-only') || getComputedStyle(el).visibility === 'hidden') return
      if (el.matches('input[type=radio]')) return
      if (el.matches('a, button') && el.closest('h3') && el.matches('button')) return // stretched card buttons cover the card
      if (b.height < 47.5 || b.width < 47.5) small.push(`${el.tagName.toLowerCase()} "${(el.innerText || el.getAttribute('aria-label') || '').trim().slice(0, 30)}" ${Math.round(b.width)}x${Math.round(b.height)}`)
    })
    scope.querySelectorAll('button, a, .chip, .btn, [role=switch], legend, h1, h2, h3, label').forEach((el) => {
      if (!el.classList.contains('sr-only') && el.scrollWidth > el.clientWidth + 1 && getComputedStyle(el).overflowX !== 'auto' && el.clientWidth > 2) clipped.push(`${el.tagName.toLowerCase()} "${el.innerText.trim().slice(0, 30)}"`)
    })
    return { overflow: doc.scrollWidth > doc.clientWidth + 1, small, clipped }
  })
  if (r.overflow) report.overflow.push(label)
  r.small.forEach((s) => report.smallTargets.push(`${label}: ${s}`))
  r.clipped.forEach((s) => report.textOverflow.push(`${label}: ${s}`))
}

async function openCard(page, name, nth = 0) {
  await page.locator('button', { hasText: name }).filter({ visible: true }).nth(nth).scrollIntoViewIfNeeded()
  await page.locator('button', { hasText: name }).filter({ visible: true }).nth(nth).click()
  await page.waitForSelector('[role=dialog]')
  await sleep(450)
}

async function closeSheet(page) {
  await page.keyboard.press('Escape')
  await sleep(400)
}

// Seed the cart through the app's own pure functions (dev server serves /src)
async function seedCart(page) {
  await page.evaluate(async () => {
    const cart = await import('/src/lib/cart.js')
    const { products } = await import('/src/data/products.js')
    const { categories, occasions } = await import('/src/data/categories.js')
    const { combos } = await import('/src/data/combos.js')
    const byId = Object.fromEntries(products.map((p) => [p.id, p]))
    const ctx = { sections: categories.flatMap((c) => c.sections), occasions }
    let lines = []
    lines = cart.addLine(lines, cart.makeProductLine(byId['ferrero-rocher-nutella-tub'], { size: '500g', nameOn: true, name: 'Amma', occasion: 'birthday', note: 'Please write in gold' }, 1, ctx))
    lines = cart.addLine(lines, cart.makeProductLine(byId['dreamy-biscoff-delight'], { flavour: 'mango' }, 2, ctx))
    lines = cart.addLine(lines, cart.makeProductLine(byId['classic-white-chocolate'], { size: '1kg' }, 1, ctx))
    lines = cart.addLine(lines, cart.makeComboLine(combos[0], ['walnut-white-chocolate-bar', 'coconut-bar', 'hazelnut-dark-chocolate-bar'], 1, byId))
    localStorage.setItem(cart.CART_STORAGE_KEY, cart.serialiseCart(lines))
  })
}

async function main() {
  const browser = await chromium.launch()
  for (const width of WIDTHS) {
    for (const lang of ['en', 'kn']) {
      const tag = `${width}-${lang}`
      const T = (en, kn) => (lang === 'en' ? en : kn)
      const { ctx, page } = await newPage(browser, width, lang)

      // Shop: top, Delight Boxes, Chocolates
      await go(page, '/shop')
      await shot(page, `shop-top-${tag}`)
      await audit(page, `${tag} /shop`)
      await go(page, '/shop#delight-boxes')
      await shot(page, `shop-delight-boxes-${tag}`)
      await go(page, '/shop#chocolates')
      await shot(page, `shop-chocolates-${tag}`)
      const activeTab = await page.locator('#shop-tabs [aria-current=true]').innerText()
      report.notes.push(`${tag}: deep link #chocolates highlights tab "${activeTab}"`)

      // Search: results and empty state
      await go(page, '/shop')
      await page.fill('#shop-search', 'Nutella')
      await sleep(300)
      await shot(page, `search-results-${tag}`)
      await page.fill('#shop-search', T('zzz', 'ಜಜಜ'))
      await sleep(300)
      await shot(page, `search-empty-${tag}`)
      await audit(page, `${tag} search empty`)

      // Sheet: Ferrero Rocher Nutella with a name
      await go(page, '/shop')
      await openCard(page, 'Ferrero Rocher Nutella')
      await page.getByRole('switch').click()
      await page.locator('[role=dialog] input[maxlength="20"]').fill('Amma')
      await page.locator('[role=dialog] input[maxlength="20"]').scrollIntoViewIfNeeded()
      await sleep(250)
      await shot(page, `sheet-ferrero-name-${tag}`)
      await audit(page, `${tag} sheet ferrero`)
      await closeSheet(page)

      // Sheet: Dreamy Biscoff with the flavour error
      await openCard(page, T('Dreamy Biscoff Delight', 'ಡ್ರೀಮಿ Biscoff ಡಿಲೈಟ್'))
      await page.locator('[role=dialog] .btn-lg').click()
      await sleep(700)
      await shot(page, `sheet-biscoff-flavour-error-${tag}`)
      await closeSheet(page)

      // Sheet: White Chocolate (Classic Favourites is the second "White Chocolate")
      await openCard(page, T('White Chocolate', 'ವೈಟ್ ಚಾಕೊಲೇಟ್'), 1)
      await page.locator('[role=dialog] fieldset').first().scrollIntoViewIfNeeded()
      await sleep(250)
      await shot(page, `sheet-classic-white-${tag}`)
      await closeSheet(page)

      // Combo: savings, then the cheaper-individually hint
      const pickBars = async (ids) => {
        await openCard(page, T('Pick any 3 bars', 'ಯಾವುದೇ 3 ಬಾರ್'))
        for (const n of ids) await page.locator('[role=dialog] li', { has: page.locator(`text="${n}"`) }).locator('button').click()
        await page.locator('[role=dialog] dl').evaluate((el) => el.scrollIntoView({ block: 'center' }))
        await sleep(300)
      }
      await pickBars(T(['Walnut White Chocolate', 'Coconut Bar', 'Hazelnut Dark Chocolate'], ['ವಾಲ್‌ನಟ್ ವೈಟ್ ಚಾಕೊಲೇಟ್', 'ತೆಂಗಿನಕಾಯಿ ಬಾರ್', 'ಹ್ಯಾಜಲ್‌ನಟ್ ಡಾರ್ಕ್ ಚಾಕೊಲೇಟ್']))
      await shot(page, `combo-savings-${tag}`)
      await audit(page, `${tag} combo`)
      await closeSheet(page)
      await pickBars(T(['Dark Chocolate', 'Milk Chocolate', 'White Chocolate'], ['ಡಾರ್ಕ್ ಚಾಕೊಲೇಟ್', 'ಮಿಲ್ಕ್ ಚಾಕೊಲೇಟ್', 'ವೈಟ್ ಚಾಕೊಲೇಟ್']))
      await page.locator('[role=dialog] .btn-secondary').scrollIntoViewIfNeeded()
      await sleep(200)
      await shot(page, `combo-cheaper-hint-${tag}`)
      await closeSheet(page)

      // Cart with 4 lines, then empty
      await seedCart(page)
      await go(page, '/cart')
      await shot(page, `cart-4-lines-${tag}`)
      await page.screenshot({ path: `${OUT}/cart-4-lines-full-${tag}.png`, fullPage: true })
      await audit(page, `${tag} /cart`)
      await page.evaluate(() => localStorage.removeItem('dk_cart_v2'))
      await go(page, '/cart')
      await shot(page, `cart-empty-${tag}`)

      // Product page
      await go(page, '/product/ferrero-rocher-nutella-tub')
      await shot(page, `product-page-${tag}`)
      await page.screenshot({ path: `${OUT}/product-page-full-${tag}.png`, fullPage: true })
      await audit(page, `${tag} /product`)
      await ctx.close()

      // Sold-out card (dev-only fixture, never in data)
      const sold = await newPage(browser, width, lang, { soldOut: ['oreo-overload-tub'] })
      await go(sold.page, '/shop')
      await sold.page.locator('article', { hasText: 'Oreo' }).scrollIntoViewIfNeeded()
      await sleep(200)
      await shot(sold.page, `sold-out-card-${tag}`)
      await sold.ctx.close()
    }
  }

  // Keyboard: open a card with Enter, Tab stays inside, Esc closes and focus returns
  {
    const { ctx, page } = await newPage(browser, 1280, 'en')
    await go(page, '/shop')
    const card = page.getByRole('button', { name: 'Lotus Biscoff Bliss' })
    await card.focus()
    await page.keyboard.press('Enter')
    await page.waitForSelector('[role=dialog]')
    await sleep(400)
    let escaped = false
    for (let i = 0; i < 40; i++) {
      await page.keyboard.press('Tab')
      if (!(await page.evaluate(() => document.querySelector('[role=dialog]')?.contains(document.activeElement)))) escaped = true
    }
    report.keyboard.push(`focus stayed inside the sheet for 40 Tabs: ${!escaped}`)
    await page.keyboard.press('Escape')
    await sleep(400)
    report.keyboard.push(`Esc closed it: ${!(await page.$('[role=dialog]'))}`)
    report.keyboard.push(`focus returned to the card: ${await page.evaluate(() => document.activeElement?.innerText === 'Lotus Biscoff Bliss')}`)
    await ctx.close()
  }

  // Swipe down on the sheet's top strip closes it on phones; bottom bar hides while open
  {
    const { ctx, page } = await newPage(browser, 390, 'en')
    await go(page, '/shop')
    await openCard(page, 'Lotus Biscoff Bliss')
    const barHidden = await page.evaluate(() => getComputedStyle(document.querySelector('nav.fixed.bottom-0')).translate)
    report.swipe.push(`bottom bar translate while sheet open: ${barHidden}`)
    const strip = await page.locator('[role=dialog] h2').boundingBox()
    await page.mouse.move(strip.x + 10, strip.y + 5)
    await page.mouse.down()
    for (let y = 0; y <= 220; y += 20) await page.mouse.move(strip.x + 10, strip.y + 5 + y)
    await page.mouse.up()
    await sleep(450)
    report.swipe.push(`swipe down closed the sheet: ${!(await page.$('[role=dialog]'))}`)
    await openCard(page, 'Lotus Biscoff Bliss')
    await page.mouse.click(195, 20)
    await sleep(450)
    report.swipe.push(`tap outside closed the sheet: ${!(await page.$('[role=dialog]'))}`)
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
