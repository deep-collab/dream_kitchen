// Step 5 QA: the launch defaults (classes off, unconfirmed details empty), switching to ಕನ್ನಡ
// in the middle of an order, and a failed Kannada download.
// Needs the dev server: `npm run dev -- --port 5173`, then: node scripts/qa-step5.mjs [outDir]
// (Classes switched ON are covered by scripts/qa-step4.mjs; download sizes and "no Kannada for
// English visitors" on the production build by scripts/bundle-report.mjs.)
// "Now" is frozen (Mon 5 Oct 2026, 10 am IST); WhatsApp is stubbed, nothing leaves the machine.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { chromium } from 'playwright'
import { site } from '../src/config/site.js'

const BASE = 'http://localhost:5173'
const OUT = process.argv[2] || 'docs/screenshots/step5'
const WIDTHS = [360, 390, 768, 1280]
const HEIGHT = { 360: 780, 390: 844, 768: 1024, 1280: 800 }
const MONDAY = '2026-10-05T10:00:00+05:30'
const TEL = `tel:${site.phone.tel}`
const WA = `https://wa.me/${site.whatsapp}`
const I18N = { en: JSON.parse(readFileSync('src/i18n/en.json', 'utf8')), kn: JSON.parse(readFileSync('src/i18n/kn.json', 'utf8')) }
const report = { overflow: [], textOverflow: [], smallTargets: [], links: [], classesOff: [], halfWritten: [], kannada: [], language: [], placeholders: [], flows: [], notes: [], failures: [] }
const fail = (m) => report.failures.push(m)
const opened = []
// All Kannada is one JSON file (scripts/kannada-split.mjs); the dev server serves it here
const KANNADA_FILE = /\/__dk\/kannada\.json/
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
mkdirSync(OUT, { recursive: true })

async function newPage(browser, width, lang, { testSite, blockKannada = false } = {}) {
  const ctx = await browser.newContext({ viewport: { width, height: HEIGHT[width] }, deviceScaleFactor: 1, timezoneId: 'Asia/Kolkata' })
  await ctx.clock.setFixedTime(new Date(MONDAY))
  await ctx.addInitScript(
    ([l, ts]) => {
      sessionStorage.setItem('dk_intro_seen', '1')
      localStorage.setItem('dk_lang', l)
      if (ts) window.__dkTestSite = ts
    },
    [lang, testSite || null],
  )
  await ctx.route('https://wa.me/**', (route) => {
    opened.push(route.request().url())
    route.fulfill({ status: 200, contentType: 'text/html', body: '<title>WhatsApp</title>' })
  })
  if (blockKannada) await ctx.route(KANNADA_FILE, (route) => route.abort('internetdisconnected'))
  const page = await ctx.newPage()
  const kannadaRequests = []
  page.on('request', (r) => KANNADA_FILE.test(r.url()) && kannadaRequests.push(r.url()))
  page.on('pageerror', (e) => fail(`${width}-${lang} page error: ${e.message}`))
  page.on('console', (m) => m.type() === 'error' && !/ERR_INTERNET_DISCONNECTED|Failed to fetch dynamically imported module|net::ERR/.test(m.text()) && fail(`${width}-${lang} console: ${m.text()}`))
  return { ctx, page, kannadaRequests }
}

async function go(page, path) {
  await page.goto(BASE + path)
  await page.waitForFunction(() => window.__dkReady === true, null, { timeout: 20000 })
  await page.waitForFunction(() => document.fonts.status === 'loaded', null, { timeout: 15000 }).catch(() => report.notes.push(`fonts slow on ${path}`))
  await sleep(400)
}
const shot = (page, name) => page.screenshot({ path: `${OUT}/${name}.png` })
async function fullShot(page, name) {
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }))
  await sleep(150)
  const style = await page.addStyleTag({ content: 'nav.fixed.bottom-0, div.fixed.bottom-0 { display: none !important }' })
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: true })
  await style.evaluate((el) => el.remove())
}

// Layout: sideways scroll, clipped text, small targets, and every Call/WhatsApp link
async function audit(page, label) {
  const r = await page.evaluate(() => {
    const doc = document.documentElement
    const small = []
    const clipped = []
    const scope = document.querySelector('[role=dialog]') || document
    scope.querySelectorAll('a[href], button, input:not([type=hidden]), select, textarea, summary, [role=switch], label:has(input[type=radio]), label:has(input[type=checkbox])').forEach((el) => {
      const b = el.getBoundingClientRect()
      if (!b.width || !b.height || el.closest('.sr-only') || getComputedStyle(el).visibility === 'hidden') return
      if (el.matches('input[type=radio], input[type=checkbox]')) return
      if (el.matches('button') && el.closest('h3')) return // stretched card buttons cover the card
      if (b.height < 47.5 || b.width < 47.5) small.push(`${el.tagName.toLowerCase()} "${(el.innerText || el.getAttribute('aria-label') || '').trim().slice(0, 30)}" ${Math.round(b.width)}x${Math.round(b.height)}`)
    })
    scope.querySelectorAll('button, a, .chip, .btn, legend, h1, h2, h3, h4, label, dd, dt, p, li, summary').forEach((el) => {
      if (!el.classList.contains('sr-only') && el.scrollWidth > el.clientWidth + 1 && getComputedStyle(el).overflowX !== 'auto' && el.clientWidth > 2) clipped.push(`${el.tagName.toLowerCase()} "${el.innerText.trim().slice(0, 30)}"`)
    })
    const links = [...document.querySelectorAll('a[href^="tel:"], a[href*="wa.me"]')].map((a) => a.getAttribute('href'))
    return { overflow: doc.scrollWidth > doc.clientWidth + 1, small, clipped, links }
  })
  if (r.overflow) report.overflow.push(label)
  r.small.forEach((s) => report.smallTargets.push(`${label}: ${s}`))
  r.clipped.forEach((s) => report.textOverflow.push(`${label}: ${s}`))
  r.links.filter((h) => (h.startsWith('tel:') ? h !== TEL : !h.startsWith(WA))).forEach((h) => report.links.push(`${label}: BAD ${h}`))
  report.links.push(`${label}: ${r.links.length} call/WhatsApp links checked`)
}

// Everything a person can see or hear on the page: text (also screen-reader-only) and labels
const pageText = (page) =>
  page.evaluate(() => {
    document.querySelectorAll('details').forEach((d) => (d.open = true))
    const parts = []
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const el = n.parentElement
      if (!el || el.closest('script, style, svg, #dk-intro')) continue
      if (!el.checkVisibility() && !el.closest('.sr-only')) continue
      if (n.textContent.trim()) parts.push(n.textContent.trim())
    }
    document.querySelectorAll('[aria-label], [alt], [placeholder], [title]').forEach((el) => ['aria-label', 'alt', 'placeholder', 'title'].forEach((a) => el.getAttribute(a) && parts.push(el.getAttribute(a))))
    return { text: parts.join(' ¦ '), classLinks: [...document.querySelectorAll('a[href^="/classes"]')].map((a) => a.getAttribute('href')), title: document.title, desc: document.querySelector('meta[name=description]')?.content || '' }
  })

// Classes are off, unconfirmed details are empty: nothing about classes, nothing half-written
const SECTIONS = 'checkout|cart|success|home|faq|shop|customise|combo|callback|contact|about|gallery|notFound|product|hero|track|classes|booking|booked|common|nav|seo|hours|notice|footer|mobileBar|mobileMenu|callOptions|brand|langError|units'
async function contentChecks(page, label, lang) {
  const { text, classLinks, title, desc } = await pageText(page)
  const all = `${text} ¦ ${title} ¦ ${desc}`
  const classWord = lang === 'kn' ? /ತರಗತಿ/ : /\bclass(es)?\b/i // ("classic" is a menu section and fine)
  const hit = all.match(new RegExp(`.{0,40}${classWord.source}.{0,40}`, classWord.flags))
  if (hit) report.classesOff.push(`${label}: "${hit[0]}"`)
  classLinks.forEach((h) => report.classesOff.push(`${label}: link to ${h}`))
  const half = [
    [/₹\s*(?![\d,]+)/, 'a ₹ with no amount'],
    [/\b(undefined|null|NaN)\b/, 'undefined/null/NaN'],
    [/\{[a-zA-Z]+\}/, 'an unfilled {placeholder}'],
    [new RegExp(`\\b(${SECTIONS})\\.[a-zA-Z]+`), 'a raw text key'],
    [lang === 'kn' ? /ಕರೆ ಸಮಯ/ : /Call hours/, 'call hours (not confirmed yet)'],
    [/₹\s?50\b(?!\d)/, 'the unconfirmed ₹50 delivery charge'],
  ]
  for (const [re, what] of half) {
    const m = all.match(new RegExp(`.{0,40}${re.source}.{0,30}`, re.flags))
    if (m) report.halfWritten.push(`${label}: ${what}: "${m[0]}"`)
  }
}

// The content checks must catch planted mistakes, or a clean result proves nothing
async function selfTest(page) {
  await page.evaluate(() =>
    document.querySelector('main').insertAdjacentHTML('beforeend', '<div id="qa-plant"><p>Delivery: ₹</p><p>checkout.title</p><p>Send order {price}</p><p>Book one of our classes</p></div>'),
  )
  const before = [report.halfWritten.length, report.classesOff.length]
  await contentChecks(page, 'self-test', 'en')
  const caught = [report.halfWritten.splice(before[0]).length, report.classesOff.splice(before[1]).length]
  await page.evaluate(() => document.getElementById('qa-plant').remove())
  if (caught[0] < 3 || caught[1] < 1) fail(`content-check self-test caught ${caught[0]}/3 half-written and ${caught[1]}/1 class mentions`)
  else report.notes.push(`content-check self-test: caught ${caught[0]} half-written and ${caught[1]} class mention(s)`)
}

async function kannadaScan(page, label) {
  const words = await page.evaluate(() => {
    const found = []
    const add = (text) => {
      // Order IDs (also the example written with non-breaking hyphens) and what the test customer typed
      const clean = text.replace(/\b(?:DK|CL)[-\u2011]\d{6}[-\u2011][A-Z0-9]{4}\b/g, '').replace(/\b(Asha|Rao)\b/g, '').replace(/@\S+/g, '').replace(/https?:\/\/\S+/g, '')
      for (const m of clean.matchAll(/[A-Za-z][A-Za-z’'-]*/g)) found.push(m[0])
    }
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const el = n.parentElement
      if (!el || el.closest('script, style, svg, [lang=en], #dk-intro')) continue
      if (!el.checkVisibility() && !el.closest('.sr-only')) continue
      add(n.textContent)
    }
    document.querySelectorAll('[aria-label], [alt], [placeholder], [title]').forEach((el) => !el.closest('[lang=en]') && ['aria-label', 'alt', 'placeholder', 'title'].forEach((a) => el.getAttribute(a) && add(el.getAttribute(a))))
    return found
  })
  const ALLOWED = new Set('dream kitchen handmade chocolates ferrero rocher nutella lotus biscoff oreo en fssai upi faq dk cl dreamkitchen homemade instagram'.split(' '))
  ;[...new Set(words.filter((w) => !ALLOWED.has(w.toLowerCase().replace(/[’'-].*$/, ''))))].forEach((w) => report.kannada.push(`${label}: ${w}`))
}

async function seedCart(page) {
  await page.evaluate(async () => {
    const cart = await import('/src/lib/cart.js')
    const { products } = await import('/src/data/products.js')
    const { categories, occasions } = await import('/src/data/categories.js')
    const byId = Object.fromEntries(products.map((p) => [p.id, p]))
    const ctx = { sections: categories.flatMap((c) => c.sections), occasions }
    let lines = cart.addLine([], cart.makeProductLine(byId['ferrero-rocher-nutella-tub'], { size: '500g', nameOn: true, name: 'Asha', occasion: 'birthday' }, 1, ctx))
    lines = cart.addLine(lines, cart.makeProductLine(byId['dreamy-biscoff-delight'], { flavour: 'mango' }, 2, ctx))
    localStorage.setItem(cart.CART_STORAGE_KEY, cart.serialiseCart(lines))
  })
}
const FORM = { '#co-name': 'Asha Rao', '#co-phone': '98450 12345', '#co-address': '12, 3rd Cross, Jayanagar 4th Block', '#co-area': 'Bengaluru', '#co-pincode': '560011', '#co-note': 'Please call before delivering.' }
async function fillCheckout(page) {
  for (const [sel, v] of Object.entries(FORM)) await page.fill(sel, v)
  await page.locator('label:has(input[name="co-date"])').nth(1).click()
  await page.locator('#co-note').blur()
}
const formValues = (page) => page.evaluate((sels) => Object.fromEntries([...sels, 'input[name="co-date"]:checked'].map((s) => [s, document.querySelector(s)?.value ?? null])), Object.keys(FORM))
const langButton = (page) => page.locator('header button[lang="kn"]:visible, header button:has(> span[lang="kn"]):visible').first()

const PAGES = [
  ['/', 'home'],
  ['/shop', 'shop'],
  ['/product/ferrero-rocher-nutella-tub', 'product'],
  ['/cart', 'cart'],
  ['/checkout', 'checkout'],
  ['/track', 'track'],
  ['/our-story', 'our-story'],
  ['/gallery', 'gallery'],
  ['/contact', 'contact'],
  ['/faq', 'faq'],
  ['/classes', 'classes-off'], // must be the 404 page
  ['/no-such-page', 'not-found'],
]

async function main() {
  const browser = await chromium.launch()

  /* ---------- 1. launch defaults, every page, 4 widths × EN/KN ---------- */
  for (const width of WIDTHS) {
    for (const lang of ['en', 'kn']) {
      const tag = `${width}-${lang}`
      const T = I18N[lang]
      const { ctx, page } = await newPage(browser, width, lang)
      await go(page, '/shop')
      await seedCart(page)
      for (const [path, name] of PAGES) {
        await go(page, path)
        if (path === '/classes') {
          const h1 = (await page.locator('main h1').first().innerText()).trim()
          if (h1 !== T.notFound.title) fail(`${tag}: /classes with classes off shows "${h1}", not the 404`)
          report.flows.push(`${tag}: /classes with classes off → "${h1}"`)
        }
        if (path === '/' && tag === '360-en') await selfTest(page)
        await shot(page, `${name}-${tag}`)
        await fullShot(page, `${name}-full-${tag}`)
        await audit(page, `${tag} ${path}`)
        await contentChecks(page, `${tag} ${path}`, lang)
        if (lang === 'kn') await kannadaScan(page, `${tag} ${path}`)
      }
      // Phone menu and footer: no Classes link while classes are off
      if (width < 1280) {
        await go(page, '/')
        await page.locator('header button[aria-haspopup=dialog]').last().click()
        await page.waitForSelector('[role=dialog]')
        await sleep(400)
        await shot(page, `menu-${tag}`)
        await audit(page, `${tag} phone menu`)
        await contentChecks(page, `${tag} phone menu`, lang)
        await page.keyboard.press('Escape')
      }
      // Summary rows while the delivery charge is unconfirmed
      await go(page, '/cart')
      const rows = await page.locator('aside dl').first().innerText()
      report.placeholders.push(`${tag} cart summary: ${rows.replace(/\s+/g, ' ')}`)
      if (!rows.includes(T.cart.deliveryToConfirm) || !rows.includes(T.cart.totalBeforeDelivery)) fail(`${tag}: cart summary does not say the delivery charge is to be confirmed`)
      await scrollToSummary(page)
      await shot(page, `cart-summary-${tag}`)
      await ctx.close()
    }
  }

  /* ---------- 2. an order sent while the delivery charge is unconfirmed ---------- */
  {
    const { ctx, page } = await newPage(browser, 390, 'en')
    await go(page, '/shop')
    await seedCart(page)
    await go(page, '/checkout')
    await fillCheckout(page)
    const button = (await page.locator('div.fixed.bottom-0 button[type=submit]').innerText()).trim()
    const before = opened.length
    const tab = ctx.waitForEvent('page')
    await page.locator('div.fixed.bottom-0 button[type=submit]').click()
    await (await tab).close()
    await page.waitForURL(/\/order\//)
    await sleep(500)
    const msg = new URL(opened.slice(before).find((u) => u.includes('text=')) || WA).searchParams.get('text') || ''
    report.placeholders.push(`checkout button: "${button}"`)
    report.placeholders.push(`WhatsApp totals line: "${msg.split('\n').find((l) => l.startsWith('Subtotal')) || '(none)'}"`)
    // Seeded cart: Ferrero Rocher Nutella 500g with a name (₹1,099) + 2 × Dreamy Biscoff (₹1,100) = ₹2,199
    if (!msg.includes('Subtotal: ₹2,199 | Delivery: to be confirmed | Total: ₹2,199 + delivery')) fail(`order message totals: ${msg}`)
    if (!button.endsWith('+ delivery')) fail(`checkout button "${button}" should say "+ delivery"`)
    writeFileSync(`${OUT}/whatsapp-sample-unconfirmed-delivery.txt`, `Order sent while the delivery charge is not confirmed yet (site.delivery.charge empty), captured from the real page by scripts/qa-step5.mjs:\n\n${msg}\n`)
    await shot(page, 'order-sent-390-en')
    await fullShot(page, 'order-sent-full-390-en')
    await contentChecks(page, '390-en order sent', 'en')
    await ctx.close()
  }

  /* ---------- 3. switching to ಕನ್ನಡ in the middle of an order keeps everything ---------- */
  for (const width of [390, 1280]) {
    const { ctx, page, kannadaRequests } = await newPage(browser, width, 'en')
    await go(page, '/shop')
    await seedCart(page)
    await go(page, '/checkout')
    await fillCheckout(page)
    const before = await formValues(page)
    const linesBefore = await page.evaluate(() => JSON.parse(localStorage.getItem('dk_cart_v2')).lines.length)
    const requestedBefore = kannadaRequests.length
    await langButton(page).click()
    await page.waitForFunction(() => document.documentElement.lang === 'kn', null, { timeout: 15000 })
    await sleep(600)
    const after = await formValues(page)
    const linesAfter = await page.evaluate(() => JSON.parse(localStorage.getItem('dk_cart_v2')).lines.length)
    const title = (await page.locator('main h1').first().innerText()).trim()
    const same = JSON.stringify(before) === JSON.stringify(after)
    report.language.push(`${width}: Kannada files before switching ${requestedBefore}, after ${kannadaRequests.length}; form kept ${same}; cart lines ${linesBefore} → ${linesAfter}; heading "${title}"`)
    if (requestedBefore) fail(`${width}: an English visitor downloaded Kannada before switching`)
    if (!kannadaRequests.length) fail(`${width}: switching never downloaded Kannada`)
    if (!same) fail(`${width}: form changed on switching: ${JSON.stringify(before)} → ${JSON.stringify(after)}`)
    if (linesBefore !== linesAfter) fail(`${width}: cart changed on switching`)
    if (title !== I18N.kn.checkout.title) fail(`${width}: checkout heading is "${title}" after switching`)
    await shot(page, `switch-midorder-kn-${width}`)
    await kannadaScan(page, `${width} checkout after switching`)
    await ctx.close()
  }

  /* ---------- 4. Kannada can't download (no signal): stay in English, keep the form, retry ---------- */
  {
    const { ctx, page } = await newPage(browser, 390, 'en', { blockKannada: true })
    await go(page, '/shop')
    await seedCart(page)
    await go(page, '/checkout')
    await fillCheckout(page)
    const before = await formValues(page)
    await langButton(page).click()
    await page.waitForSelector('[role=alert]', { timeout: 15000 })
    await sleep(300)
    const lang = await page.evaluate(() => document.documentElement.lang)
    const kept = JSON.stringify(before) === JSON.stringify(await formValues(page))
    await page.evaluate(() => window.scrollTo(0, 0))
    await shot(page, 'kannada-failed-390')
    await audit(page, '390 Kannada failed strip')
    report.language.push(`no signal: page stays "${lang}", form kept ${kept}, message "${(await page.locator('[role=alert] p').innerText()).trim()}"`)
    if (lang !== 'en' || !kept) fail('a failed Kannada download changed the page')
    await ctx.unroute(KANNADA_FILE)
    await page.locator('[role=alert] button').first().click()
    await page.waitForFunction(() => document.documentElement.lang === 'kn', null, { timeout: 15000 })
    await sleep(400)
    const keptAfterRetry = JSON.stringify(before) === JSON.stringify(await formValues(page))
    report.language.push(`retry with signal back: page now "kn", form kept ${keptAfterRetry}, message gone ${!(await page.locator('[role=alert]').count())}`)
    if (!keptAfterRetry) fail('retrying Kannada lost the form')
    await ctx.close()
  }

  /* ---------- 5. once Hema confirms hours and charge, they show (and read naturally) ---------- */
  {
    const testSite = { hours: { opens: 10, closes: 20, days: 'monSat' }, delivery: { charge: 50 } }
    const { ctx, page } = await newPage(browser, 390, 'en', { testSite })
    await go(page, '/shop')
    await seedCart(page)
    await go(page, '/cart')
    const rows = (await page.locator('aside dl').first().innerText()).replace(/\s+/g, ' ')
    await go(page, '/contact')
    const contact = (await page.locator('main').innerText()).replaceAll('\u00a0', ' ') // times use non-breaking spaces
    report.placeholders.push(`filled in: cart "${rows}"; contact shows call hours: ${contact.includes('Call hours')}`)
    if (!rows.includes('₹50') || !rows.includes('₹2,249')) fail(`with a ₹50 charge the cart reads: ${rows}`)
    if (!contact.includes('10 am – 8 pm, Monday to Saturday')) fail('confirmed call hours are not shown on Contact')
    await shot(page, 'contact-hours-filled-390-en')
    await ctx.close()
  }

  // The production sitemap (built from data and config) has no classes page
  try {
    const xml = readFileSync('dist/sitemap.xml', 'utf8')
    report.flows.push(`dist/sitemap.xml: ${xml.match(/<url>/g).length} addresses, classes page listed: ${/\/classes\b/.test(xml)}`)
    if (/\/classes\b/.test(xml)) fail('sitemap lists /classes while classes are off')
  } catch {
    report.notes.push('dist/sitemap.xml not found: run npm run build first to check it')
  }

  await browser.close()
  writeFileSync(`${OUT}/qa-report.json`, JSON.stringify(report, null, 2))
  const brief = { ...report, links: report.links.filter((l) => l.includes('BAD')), linksChecked: report.links.reduce((n, l) => n + (Number(l.match(/: (\d+) call/)?.[1]) || 0), 0) }
  console.log(JSON.stringify(brief, null, 2))
  const problems = report.failures.length + report.overflow.length + report.textOverflow.length + report.smallTargets.length + report.kannada.length + report.classesOff.length + report.halfWritten.length + brief.links.length
  console.log(problems ? `\n${problems} problems` : '\nClean run')
  process.exit(problems ? 1 : 0)
}

async function scrollToSummary(page) {
  await page.locator('aside').first().evaluate((el) => el.scrollIntoView({ block: 'center', behavior: 'instant' }))
  await sleep(200)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
