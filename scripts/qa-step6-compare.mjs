// Step 6: before/after at 390px. Screenshots of Home, Menu, a product sheet and Checkout, the
// height of each in screens (844px phone screen), and the taps from opening the site to "Add to cart".
// Needs the dev server on port 5173. Run: node scripts/qa-step6-compare.mjs before|after
// "before" was run on the Step 5 code (the first commit of the step6 branch), "after" on Step 6.
import { mkdirSync, writeFileSync } from 'node:fs'
import { chromium } from 'playwright'

const BASE = process.env.DK_BASE || 'http://localhost:5173'
const label = process.argv[2] || 'after'
const OUT = `docs/screenshots/step6/${label}`
const VIEW = { width: 390, height: 844 }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
mkdirSync(OUT, { recursive: true })

// What differs between the Step 5 site and the Step 6 site
const SITES = {
  before: {
    menu: '/shop',
    openProduct: 'article h3 button', // first product card
    addButton: '[role=dialog] .btn-primary.btn-lg',
    homeToMenu: 'a[href="/shop"].btn',
  },
  after: {
    menu: '/menu',
    openProduct: '[data-dk-card] button[data-dk-open]',
    addButton: '[role=dialog] [data-dk-add]',
    homeToMenu: 'a[data-dk-tile]',
  },
}
const s = SITES[label]
if (!s) throw new Error('label must be before or after')

const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: VIEW, deviceScaleFactor: 1, timezoneId: 'Asia/Kolkata', hasTouch: true, isMobile: true })
await ctx.clock.setFixedTime(new Date('2026-10-05T10:00:00+05:30'))
await ctx.addInitScript(() => {
  try {
    sessionStorage.setItem('dk_intro_seen', '1')
    localStorage.setItem('dk_intro_seen', '1')
  } catch {}
})
const page = await ctx.newPage()
const errors = []
page.on('pageerror', (e) => errors.push(e.message))

async function go(path) {
  await page.goto(BASE + path)
  await page.waitForFunction(() => window.__dkReady === true, null, { timeout: 20000 })
  await page.waitForFunction(() => document.fonts.status === 'loaded', null, { timeout: 15000 }).catch(() => {})
  await sleep(500)
}
const screens = async () => page.evaluate((h) => Math.round((document.documentElement.scrollHeight / h) * 100) / 100, VIEW.height)
async function fullShot(name) {
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }))
  await sleep(200)
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: true })
}

const result = { label, viewport: VIEW, pages: {}, tapsToAddToCart: null, errors }

// Home
await go('/')
result.pages.home = await screens()
await fullShot('390-home')

// Menu
await go(s.menu)
result.pages.menu = await screens()
await fullShot('390-menu')

// Product sheet: how tall its content is, in screens (what someone scrolls through inside it)
await page.locator(s.openProduct).first().click()
await page.waitForSelector('[role=dialog]')
await sleep(600)
result.pages.sheet = await page.evaluate((h) => {
  const d = document.querySelector('[role=dialog]')
  const body = d.children[1]
  const total = d.children[0].offsetHeight + body.scrollHeight + (d.children[2]?.offsetHeight || 0)
  return Math.round((total / h) * 100) / 100
}, VIEW.height)
await page.screenshot({ path: `${OUT}/390-sheet.png` })
await page.locator(s.addButton).click()
await sleep(400)

// Checkout (with that one item in the cart)
await go('/checkout')
result.pages.checkout = await screens()
await fullShot('390-checkout')

// Taps from opening the site to "Add to cart": count each tap a person makes
await ctx.clearCookies()
await page.evaluate(() => localStorage.removeItem('dk_cart_v2'))
await go('/')
let taps = 0
await page.locator(s.homeToMenu).first().tap()
taps++
await page.waitForSelector(s.openProduct)
await sleep(500)
await page.locator(s.openProduct).first().tap()
taps++
await page.waitForSelector('[role=dialog]')
await sleep(500)
await page.locator(s.addButton).tap()
taps++
await sleep(400)
const count = await page.evaluate(() => JSON.parse(localStorage.getItem('dk_cart_v2') || localStorage.getItem('dk_cart_v3') || '{"lines":[]}').lines.length)
result.tapsToAddToCart = count > 0 ? taps : `failed after ${taps} taps`

writeFileSync(`${OUT}/heights.json`, JSON.stringify(result, null, 2))
console.log(JSON.stringify(result, null, 2))
await browser.close()
