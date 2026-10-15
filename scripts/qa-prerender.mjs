// Pre-rendered pages QA (scripts/prerender.mjs). For every page with its own HTML file, and two
// that use the empty app (/cart, /track):
//  - without JavaScript (Razorpay's check): the page's heading and its real text are there
//  - with JavaScript: the app takes over (no pre-rendered markup left), the same heading shows,
//    no console errors (on /faq the answers start closed and Razorpay is off locally: the question is checked), and the first-visit loading screen still finishes on the home page
// Needs a built dist/ served like Netlify: node scripts/serve-http2.mjs (port 4443), then
//   node scripts/qa-prerender.mjs        (exits non-zero on any problem; DK_BASE to point elsewhere)
import { chromium } from 'playwright'

const BASE = process.env.DK_BASE || 'https://localhost:4443'
const PAGES = [
  ['/', /Order now/],
  ['/menu', /Delight Box/],
  ['/classes', /₹2,500/],
  ['/customize', /Drawing Chocolate Bar/],
  ['/contact', /dreamkitchen\.web01@gmail\.com/],
  ['/faq', /Razorpay/],
  ['/our-story', /₹2,500/],
  ['/terms', /Terms & Conditions/],
  ['/refund', /No refunds on handmade products/],
  ['/shipping', /Shipping & Delivery Policy/],
  ['/privacy', /Privacy Policy/],
]
const APP_ONLY = [
  ['/cart', /cart/i],
  ['/track', /Track/],
]
const failures = []
const fail = (m) => {
  failures.push(m)
  console.error('FAIL', m)
}
const ok = (m) => console.log('ok  ', m)

const browser = await chromium.launch()
try {
  // 1. No JavaScript
  const off = await browser.newContext({ javaScriptEnabled: false, ignoreHTTPSErrors: true })
  for (const [path, text] of PAGES) {
    const page = await off.newPage()
    await page.goto(BASE + path)
    const body = await page.locator('#root').innerText()
    if (!text.test(body)) fail(`${path} without JS: missing ${text}`)
    else if (!/\+91 95357|Phone/.test(body)) fail(`${path} without JS: no contact details`)
    else ok(`${path} without JS: text, prices and contact details`)
    await page.close()
  }
  for (const [path] of APP_ONLY) {
    const page = await off.newPage()
    await page.goto(BASE + path)
    const html = await page.locator('#root').innerHTML()
    if (html.trim()) fail(`${path}: the empty app should have an empty #root`)
    else ok(`${path}: the empty app (no other page's text)`)
    await page.close()
  }
  await off.close()

  // 2. With JavaScript: the app takes over
  for (const first of [false, true]) {
    const ctx = await browser.newContext({ ignoreHTTPSErrors: true, viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
    if (!first) await ctx.addInitScript(() => localStorage.setItem('dk_intro_seen', '1'))
    for (const [path, text] of first ? [PAGES[0]] : [...PAGES, ...APP_ONLY]) {
      const page = await ctx.newPage()
      const errors = []
      page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
      page.on('pageerror', (e) => errors.push(e.message))
      await page.goto(BASE + path)
      await page.waitForFunction(() => !document.querySelector('[data-dk-prerendered]') && document.querySelector('#main'), null, { timeout: 15000 }).catch(() => {})
      await page.waitForTimeout(first ? 1500 : 300)
      const left = await page.locator('[data-dk-prerendered]').count()
      const body = await page.locator('body').innerText()
      const intro = await page.locator('#dk-intro').count()
      const canonical = await page.locator('link[rel="canonical"]').getAttribute('href')
      const tag = `${path}${first ? ' (first visit, loading screen)' : ''}`
      // /api/* is not served by the static server: those fetch errors are expected here
      const real = errors.filter((e) => !/api\/|Failed to load resource|404/.test(e))
      if (left) fail(`${tag}: pre-rendered markup still there after the app started`)
      else if (!(path === '/faq' ? /How do I pay\?/ : text).test(body)) fail(`${tag}: the app does not show ${text}`)
      else if (real.length) fail(`${tag}: console errors: ${real.join(' | ')}`)
      else if (first && intro) fail(`${tag}: the loading screen did not finish`)
      else if (!canonical?.endsWith(path === '/' ? '/' : path)) fail(`${tag}: canonical is ${canonical}`)
      else ok(`${tag}: the app took over, canonical ${canonical}`)
      await page.close()
    }
    await ctx.close()
  }
} finally {
  await browser.close()
}
console.log(failures.length ? `\n${failures.length} problem(s)` : '\nAll pre-rendered pages OK')
process.exit(failures.length ? 1 : 0)
