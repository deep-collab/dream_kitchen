// Policy pages QA (Razorpay verification): /terms, /refund, /shipping, /privacy and /contact opened
// directly and after a refresh, at 390 and 1280 px, in English and Kannada. Checks: the right
// heading, no 404, no console errors, no sideways scroll, every link and button 48 px or more, the
// footer links to all five pages with the business details, no link to the admin, every menu
// product shows a price, the "no refund" line by the pay buttons, and the admin asking for a login.
//
// Needs the dev server with the practice database (as in scripts/qa-step6.mjs), or DK_BASE pointing
// at `vite preview`: node scripts/qa-policies.mjs   (exits non-zero on any problem)
// Screenshots: docs/screenshots/policies/<width>-<lang>-<page>.png
import { mkdirSync } from 'node:fs'
import { chromium } from 'playwright'
import { dateChoices, dispatchRules } from '../src/lib/dates.js'
import { site } from '../src/config/site.js'

const BASE = process.env.DK_BASE || 'http://localhost:5173'
const OUT = 'docs/screenshots/policies'
const SHOTS = process.env.DK_SHOTS !== '0'
const PAGES = [
  ['/terms', /Terms & Conditions|ನಿಯಮಗಳು ಮತ್ತು ಷರತ್ತುಗಳು/],
  ['/refund', /Refund & Cancellation Policy|ಹಣ ವಾಪಸಾತಿ ಮತ್ತು ರದ್ದತಿ ನೀತಿ/],
  ['/shipping', /Shipping & Delivery Policy|ಶಿಪ್ಪಿಂಗ್ ಮತ್ತು ಡೆಲಿವರಿ ನೀತಿ/],
  ['/privacy', /Privacy Policy|ಗೌಪ್ಯತಾ ನೀತಿ/],
  ['/contact', /Contact Dream Kitchen|Dream Kitchen ಸಂಪರ್ಕಿಸಿ/],
]
const FOOTER_PATHS = ['/terms', '/refund', '/shipping', '/privacy', '/contact']
const failures = []
const fail = (m) => {
  failures.push(m)
  console.error('FAIL', m)
}
const ok = (m) => console.log('ok  ', m)
if (SHOTS) mkdirSync(OUT, { recursive: true })

async function newPage(browser, width, lang, orders = []) {
  const ctx = await browser.newContext({ viewport: { width, height: width < 768 ? 844 : 800 }, isMobile: width < 768, hasTouch: width < 768 })
  await ctx.addInitScript(
    ([l, mine]) => {
      localStorage.setItem('dk_intro_seen', '1')
      localStorage.setItem('dk_lang', l)
      if (mine.length) localStorage.setItem('dk_my_orders', JSON.stringify(mine))
    },
    [lang, orders],
  )
  const page = await ctx.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('console', (m) => m.type() === 'error' && !/401|404 \(Not Found\)|net::ERR_ABORTED/.test(m.text()) && errors.push(m.text()))
  return { ctx, page, errors }
}
const ready = (page) => page.waitForFunction(() => window.__dkReady === true, null, { timeout: 20000 }).then(() => page.waitForTimeout(400))

async function audit(page) {
  return page.evaluate(() => {
    const small = []
    for (const el of document.querySelectorAll('main a, main button, footer a, footer button')) {
      const r = el.getBoundingClientRect()
      if (r.width && r.height && (r.height < 47.5 || r.width < 24)) small.push(`${el.textContent.trim().slice(0, 30)} ${Math.round(r.width)}x${Math.round(r.height)}`)
    }
    const footer = document.querySelector('footer')
    return {
      overflow: document.documentElement.scrollWidth > window.innerWidth + 1,
      small,
      h1: document.querySelector('main h1')?.textContent.trim() || '',
      notFound: Boolean(document.querySelector('meta[name="robots"][content="noindex"]')),
      footerLinks: [...footer.querySelectorAll('a')].map((a) => a.getAttribute('href')),
      footerText: footer.innerText,
      adminLinks: [...document.querySelectorAll('a')].filter((a) => /\/admin/.test(a.getAttribute('href') || '')).length,
    }
  })
}

const browser = await chromium.launch()
try {
  // Every page, opened directly and refreshed
  for (const width of [390, 1280]) {
    for (const lang of ['en', 'kn']) {
      const { ctx, page, errors } = await newPage(browser, width, lang)
      for (const [path, heading] of PAGES) {
        for (const pass of ['open', 'refresh']) {
          if (pass === 'open') await page.goto(BASE + path)
          else await page.reload()
          await ready(page)
          const a = await audit(page)
          const label = `${width}-${lang} ${path} (${pass})`
          if (!heading.test(a.h1)) fail(`${label}: heading is "${a.h1}"`)
          if (a.notFound) fail(`${label}: shows the 404 page`)
          if (a.overflow) fail(`${label}: sideways scroll`)
          if (a.small.length) fail(`${label}: small targets ${a.small.join(' | ')}`)
          const missing = FOOTER_PATHS.filter((p) => !a.footerLinks.includes(p))
          if (missing.length) fail(`${label}: footer has no link to ${missing.join(', ')}`)
          for (const text of [site.name, site.phone.display, site.instagram.handle]) if (!a.footerText.includes(text)) fail(`${label}: footer lacks "${text}"`)
          if (!/Owner: Hema|ಮಾಲೀಕರು: ಹೇಮಾ/.test(a.footerText)) fail(`${label}: footer lacks the owner`)
          if (a.adminLinks) fail(`${label}: links to the admin`)
        }
        if (SHOTS) await page.screenshot({ path: `${OUT}/${width}-${lang}-${path.slice(1)}.png`, fullPage: true })
      }
      if (errors.length) fail(`${width}-${lang}: console errors ${errors.join(' | ')}`)
      else ok(`${width}-${lang}: 5 pages open directly and after a refresh, footer complete, no errors`)
      await ctx.close()
    }
  }

  // The refund policy says what Hema asked for
  {
    const { ctx, page } = await newPage(browser, 390, 'en')
    await page.goto(`${BASE}/refund`)
    await ready(page)
    const text = await page.locator('main').innerText()
    const need = [/no refunds/i, /Customized orders cannot be refunded or cancelled once the order is confirmed/, /Class fees are non-refundable/, /at least 24 hours before your class/, /within 24 hours of delivery/, /photos or a video/, /cannot be cancelled once preparation has started/]
    const gone = need.filter((r) => !r.test(text))
    if (!text.includes(site.phone.display)) gone.push('the phone number')
    if (gone.length) fail(`/refund lacks ${gone.join(', ')}`)
    else ok('/refund has every rule and the contact details')
    if (/TODO|undefined|NaN|\{\w+\}/.test(text)) fail('/refund shows a placeholder')
    for (const p of ['/terms', '/shipping', '/privacy']) {
      await page.goto(BASE + p)
      await ready(page)
      const t = await page.locator('main').innerText()
      if (/TODO|undefined|NaN|\{\w+\}/.test(t)) fail(`${p} shows a placeholder`)
    }
    await page.goto(`${BASE}/shipping`)
    await ready(page)
    const shipping = await page.locator('main').innerText()
    if (!/₹90 within Karnataka, ₹100 elsewhere in India/.test(shipping)) fail('/shipping lacks the courier rates')
    else ok('/shipping shows the courier rates from the config')
    await ctx.close()
  }

  // Every product on the menu shows a price
  {
    const { ctx, page } = await newPage(browser, 390, 'en')
    await page.goto(`${BASE}/menu`)
    await ready(page)
    const cards = await page.locator('[data-dk-card]').allInnerTexts()
    const noPrice = cards.filter((c) => !/₹\s?[\d,]+|Sold out/.test(c))
    if (!cards.length || noPrice.length) fail(`menu cards without a price: ${noPrice.join(' | ') || 'no cards'}`)
    else ok(`menu: all ${cards.length} products show a price`)
    await ctx.close()
  }

  // "No refund on customized orders and classes" by the pay buttons
  {
    const post = (name, body) => fetch(`${BASE}/api/${name}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }).then(async (r) => ({ status: r.status, body: await r.json().catch(() => null) }))
    const phone = '9845012345'
    const r = await post('create-order', {
      idempotencyKey: `qa-policy-${Date.now()}`,
      items: [{ productId: 'assorted-brownies', selection: { ragi: true }, qty: 1, unitPrice: 780 }],
      customer: { name: 'Asha Rao', phone, email: '', line1: '12, 3rd Cross', line2: 'Jayanagar 4th Block', city: 'Bengaluru', pincode: '560011', state: 'karnataka', landmark: '', note: '' },
      dispatchDate: dateChoices(new Date(), 1, dispatchRules())[0],
      expectedTotal: 780 + 90,
    })
    if (r.status !== 201) fail(`could not create a practice order: ${JSON.stringify(r.body)}`)
    else {
      for (const width of [390, 1280]) {
        const { ctx, page } = await newPage(browser, width, 'en', [{ code: r.body.order.code, phone }])
        await page.goto(`${BASE}/pay/${r.body.order.code}`)
        await ready(page)
        const note = page.locator('[data-dk-no-refund]')
        if (!(await note.isVisible().catch(() => false))) fail(`${width}: no "no refund" line on the pay page`)
        else ok(`${width}: pay page shows "${await note.innerText()}"`)
        if (SHOTS) await page.screenshot({ path: `${OUT}/${width}-en-pay.png` })
        await page.goto(`${BASE}/classes/book?class=brownie`)
        await ready(page)
        if (!(await page.locator('[data-dk-no-refund]').isVisible().catch(() => false))) fail(`${width}: no "no refund" line on the class booking page`)
        else ok(`${width}: class booking page shows the "no refund" line`)
        await ctx.close()
      }
    }
  }

  // The admin asks for a login and shows nothing without one
  {
    const { ctx, page } = await newPage(browser, 390, 'en')
    for (const path of ['/admin', '/admin/menu', '/admin/orders']) {
      await page.goto(BASE + path)
      await page.getByRole('heading', { name: 'Log in' }).waitFor({ timeout: 15000 }).then(
        () => ok(`${path}: shows the login`),
        () => fail(`${path}: no login screen`),
      )
    }
    const api = await fetch(`${BASE}/api/admin`, { method: 'POST', headers: { 'content-type': 'application/json', origin: BASE }, body: JSON.stringify({ action: 'menu' }) })
    if (api.status !== 401) fail(`/api/admin without a login answered ${api.status}`)
    else ok('/api/admin without a login: 401')
    await ctx.close()
  }
} finally {
  await browser.close()
}

console.log(failures.length ? `\n${failures.length} problem(s)` : '\nAll policy checks passed')
process.exit(failures.length ? 1 : 0)
