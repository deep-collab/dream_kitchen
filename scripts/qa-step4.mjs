// Step 4 QA: classes + booking, home sections, Our Story, Gallery, Contact, FAQ, 404,
// full Kannada, plus the Step 3 carry-overs checked in a real browser (order ID date).
// Needs the dev server: `npm run dev -- --port 5173`, then: node scripts/qa-step4.mjs [outDir]
// "Now" is frozen with Playwright's clock (Monday 5 Oct 2026, 10 am IST) so dates are stable.
// WhatsApp is stubbed: wa.me answers with a local page and every URL is recorded.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { chromium } from 'playwright'
import { site } from '../src/config/site.js'

const BASE = 'http://localhost:5173'
const OUT = process.argv[2] || 'docs/screenshots/step4'
const WIDTHS = [360, 390, 768, 1280]
const HEIGHT = { 360: 780, 390: 844, 768: 1024, 1280: 800 }
const MONDAY = '2026-10-05T10:00:00+05:30'
const TEL = `tel:${site.phone.tel}`
const WA = `https://wa.me/${site.whatsapp}`
const I18N = { en: JSON.parse(readFileSync('src/i18n/en.json', 'utf8')), kn: JSON.parse(readFileSync('src/i18n/kn.json', 'utf8')) }
const report = { overflow: [], textOverflow: [], smallTargets: [], links: [], whatsapp: [], flows: [], honesty: [], kannada: [], orderId: [], focus: [], notes: [], failures: [] }
const fail = (msg) => report.failures.push(msg)
const opened = [] // every wa.me URL a tab was opened with
mkdirSync(OUT, { recursive: true })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function newPage(browser, width, lang, { now = MONDAY, timezoneId = 'Asia/Kolkata', blockPopups = false } = {}) {
  const ctx = await browser.newContext({ viewport: { width, height: HEIGHT[width] }, deviceScaleFactor: 1, timezoneId })
  await ctx.clock.setFixedTime(new Date(now))
  await ctx.addInitScript(
    ([l, block]) => {
      sessionStorage.setItem('dk_intro_seen', '1')
      localStorage.setItem('dk_lang', l)
      if (block) window.open = () => null // a browser that blocks the WhatsApp tab
    },
    [lang, blockPopups],
  )
  await ctx.route('https://wa.me/**', (route) => {
    opened.push(route.request().url())
    route.fulfill({ status: 200, contentType: 'text/html', body: '<title>WhatsApp</title><p>WhatsApp would open here.</p>' })
  })
  const page = await ctx.newPage()
  page.on('pageerror', (e) => fail(`${width}-${lang} page error: ${e.message}`))
  page.on('console', (m) => m.type() === 'error' && fail(`${width}-${lang} console: ${m.text()}`))
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
  await page.waitForFunction(() => document.fonts.status === 'loaded' && document.fonts.check('600 20px "Cormorant Garamond"') && document.fonts.check('16px Lato'), null, { timeout: 15000 }).catch(() => report.notes.push(`fonts slow on ${path}`))
  await sleep(450)
}

const shot = (page, name) => page.screenshot({ path: `${OUT}/${name}.png` })
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
async function openDialog(page, trigger) {
  await trigger.click()
  await page.waitForSelector('[role=dialog]')
  await sleep(450)
}
async function closeDialog(page) {
  await page.keyboard.press('Escape')
  await page.waitForSelector('[role=dialog]', { state: 'detached' })
  await sleep(200)
}

// Layout checks on the page (or the open dialog), plus every Call and WhatsApp link
async function audit(page, label) {
  const r = await page.evaluate(() => {
    const doc = document.documentElement
    const small = []
    const clipped = []
    const scope = document.querySelector('[role=dialog]') || document
    scope.querySelectorAll('a[href], button, input:not([type=hidden]), select, textarea, summary, [role=switch], label:has(input[type=radio]), label:has(input[type=checkbox])').forEach((el) => {
      const b = el.getBoundingClientRect()
      if (!b.width || !b.height || el.closest('.sr-only') || getComputedStyle(el).visibility === 'hidden') return
      if (el.matches('input[type=radio], input[type=checkbox]')) return // their labels are the targets
      if (el.matches('button') && el.closest('h3')) return // stretched card buttons cover the whole card
      if (b.height < 47.5 || b.width < 47.5) small.push(`${el.tagName.toLowerCase()} "${(el.innerText || el.getAttribute('aria-label') || '').trim().slice(0, 30)}" ${Math.round(b.width)}x${Math.round(b.height)}`)
    })
    scope.querySelectorAll('button, a, .chip, .btn, legend, h1, h2, h3, h4, label, dd, dt, p, li, summary').forEach((el) => {
      if (!el.classList.contains('sr-only') && el.scrollWidth > el.clientWidth + 1 && getComputedStyle(el).overflowX !== 'auto' && el.clientWidth > 2)
        clipped.push(`${el.tagName.toLowerCase()} "${el.innerText.trim().slice(0, 30)}"`)
    })
    const links = [...document.querySelectorAll('a[href^="tel:"], a[href*="wa.me"]')].map((a) => a.getAttribute('href'))
    return { overflow: doc.scrollWidth > doc.clientWidth + 1, small, clipped, links }
  })
  if (r.overflow) report.overflow.push(label)
  r.small.forEach((s) => report.smallTargets.push(`${label}: ${s}`))
  r.clipped.forEach((s) => report.textOverflow.push(`${label}: ${s}`))
  const bad = r.links.filter((h) => (h.startsWith('tel:') ? h !== TEL : !h.startsWith(WA)))
  bad.forEach((h) => report.links.push(`${label}: BAD ${h}`))
  report.links.push(`${label}: ${r.links.length} call/WhatsApp links checked`)
  return r
}

// Kannada pages: any English words left over (visible text, aria-labels, alt, placeholders).
// Brand names stay English by rule; the wordmark, IDs and the Instagram handle are expected.
const ALLOWED = new Set(
  'dream kitchen handmade chocolates ferrero rocher nutella lotus biscoff oreo en fssai upi faq dk cl dreamkitchen homemade instagram'.split(' '),
)
async function kannadaScan(page, label, { selfTest = false } = {}) {
  if (selfTest) {
    // The scanner must catch a planted English sentence, or an empty result means nothing
    await page.evaluate(() => document.querySelector('main').insertAdjacentHTML('beforeend', '<p id="qa-plant">Leftover sentence</p>'))
    const before = report.kannada.length
    await kannadaScan(page, 'self-test')
    const caught = report.kannada.splice(before).length
    await page.evaluate(() => document.getElementById('qa-plant').remove())
    if (caught !== 2) fail(`Kannada scan self-test caught ${caught} of 2 planted words`)
    else report.notes.push('Kannada scan self-test: planted English caught')
  }
  const words = await page.evaluate(() => {
    document.querySelectorAll('details').forEach((d) => (d.open = true))
    const found = []
    const add = (text, where) => {
      const clean = text.replace(/\b(?:DK|CL)-\d{6}-[A-Z0-9]{4}\b/g, '').replace(/@\S+/g, '').replace(/https?:\/\/\S+/g, '')
      for (const m of clean.matchAll(/[A-Za-z][A-Za-z’'-]*/g)) found.push(`${m[0]} (${where})`)
    }
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const el = n.parentElement
      if (!el || el.closest('script, style, svg, [lang=en], #dk-intro')) continue
      if (!el.checkVisibility() && !el.closest('.sr-only')) continue
      add(n.textContent, el.tagName.toLowerCase())
    }
    document.querySelectorAll('[aria-label], [alt], [placeholder], [title]').forEach((el) => {
      if (el.closest('[lang=en]')) return
      for (const a of ['aria-label', 'alt', 'placeholder', 'title']) if (el.getAttribute(a)) add(el.getAttribute(a), `@${a}`)
    })
    return found
  })
  const left = [...new Set(words.filter((w) => !ALLOWED.has(w.split(' ')[0].toLowerCase().replace(/[’'-].*$/, ''))))]
  left.forEach((w) => report.kannada.push(`${label}: ${w}`))
}

// Seed the cart through the app's own pure functions (the dev server serves /src)
async function seedCart(page) {
  await page.evaluate(async () => {
    const cart = await import('/src/lib/cart.js')
    const { products } = await import('/src/data/products.js')
    const { categories, occasions } = await import('/src/data/categories.js')
    const byId = Object.fromEntries(products.map((p) => [p.id, p]))
    const ctx = { sections: categories.flatMap((c) => c.sections), occasions }
    const lines = cart.addLine([], cart.makeProductLine(byId['oreo-overload-tub'], { size: '250g' }, 1, ctx))
    localStorage.setItem(cart.CART_STORAGE_KEY, cart.serialiseCart(lines))
  })
}

const textOf = (url) => new URL(url).searchParams.get('text') || ''
const h1 = async (page) => (await page.locator('main h1').first().innerText()).trim()

async function main() {
  const browser = await chromium.launch()
  const samples = []

  for (const width of WIDTHS) {
    for (const lang of ['en', 'kn']) {
      const tag = `${width}-${lang}`
      const T = I18N[lang]

      /* ---------- static pages: screenshots, layout, links, Kannada scan ---------- */
      {
        const { ctx, page } = await newPage(browser, width, lang)
        for (const [path, name] of [
          ['/', 'home'],
          ['/classes', 'classes'],
          ['/our-story', 'our-story'],
          ['/gallery', 'gallery'],
          ['/contact', 'contact'],
          ['/faq', 'faq'],
          ['/no-such-page', 'not-found'],
        ]) {
          await go(page, path)
          await shot(page, `${name}-${tag}`)
          await fullShot(page, `${name}-full-${tag}`)
          await audit(page, `${tag} ${path}`)
          if (lang === 'kn') await kannadaScan(page, `${tag} ${path}`, { selfTest: path === '/' })
          if ((await page.evaluate(() => document.documentElement.lang)) !== lang) fail(`${tag} ${path}: <html lang> is not ${lang}`)
        }

        // Home: best-seller card and combo teaser open their sheets; the talk band opens the call-back sheet
        await go(page, '/')
        await scrollTo(page, '#best-title')
        await shot(page, `home-best-sellers-${tag}`)
        await openDialog(page, page.locator('section[aria-labelledby=best-title] h3 button').first())
        await audit(page, `${tag} home: customise sheet from best sellers`)
        report.flows.push(`${tag}: best-seller card opened "${(await page.locator('[role=dialog] h2').innerText()).trim()}"`)
        await closeDialog(page)
        await scrollTo(page, '#tubs-title', 'center')
        await shot(page, `home-tub-spotlight-${tag}`)
        await scrollTo(page, '#combo-title', 'center')
        await shot(page, `home-combo-${tag}`)
        await openDialog(page, page.locator('section[aria-labelledby=combo-title] button[aria-haspopup=dialog]'))
        await shot(page, `home-combo-sheet-${tag}`)
        await audit(page, `${tag} home: combo builder from teaser`)
        await closeDialog(page)
        await scrollTo(page, '#home-classes-title')
        await shot(page, `home-classes-${tag}`)
        await scrollTo(page, '#talk-title')
        await shot(page, `home-talk-band-${tag}`)
        await openDialog(page, page.locator('section[aria-labelledby=talk-title] button[aria-haspopup=dialog]'))
        await audit(page, `${tag} home: call-back sheet`)
        await closeDialog(page)
        if (await page.locator('#reviews-title').count()) fail(`${tag}: reviews section shows although there are no reviews`)

        // /classes#slug from the home teaser lands on that class
        await go(page, '/classes#kids-chocolate-fun')
        await sleep(300)
        const { top, header } = await page.evaluate(() => ({
          top: Math.round(document.getElementById('kids-chocolate-fun').getBoundingClientRect().top),
          header: Math.round(document.querySelector('header').getBoundingClientRect().bottom),
        }))
        report.flows.push(`${tag}: /classes#kids-chocolate-fun lands ${top - header}px below the header`)
        if (top < header || top > header + 40) fail(`${tag}: /classes#kids-chocolate-fun card is ${top - header}px below the header (want 0–40)`)

        // …and someone who scrolls straight away keeps their own position (no pulling back)
        await page.goto(`${BASE}/classes#kids-chocolate-fun`)
        await page.waitForFunction(() => window.__dkReady === true)
        await sleep(150)
        await page.mouse.move(Math.round(width / 2), 400)
        await page.mouse.wheel(0, -600)
        await sleep(300)
        const cardGap = () => page.evaluate(() => Math.round(document.getElementById('kids-chocolate-fun').getBoundingClientRect().top - document.querySelector('header').getBoundingClientRect().bottom))
        const afterWheel = await cardGap()
        await sleep(3000)
        const later = await cardGap()
        report.flows.push(`${tag}: scrolled up right after a #class link: card ${afterWheel}px below the header, 3 s later ${later}px`)
        if (afterWheel > 40 && Math.abs(later - afterWheel) > 40) fail(`${tag}: the page pulled a person back after they scrolled (${afterWheel}px → ${later}px)`)
        await ctx.close()
      }

      /* ---------- class booking: empty submit, filled, sent, success page, refresh ---------- */
      {
        const { ctx, page } = await newPage(browser, width, lang)
        await go(page, '/classes')
        const book = page.locator('#chocolate-making-beginners button[aria-haspopup=dialog]')
        await openDialog(page, book)
        await shot(page, `booking-sheet-${tag}`)
        await audit(page, `${tag} booking sheet`)
        if (lang === 'kn') await kannadaScan(page, `${tag} booking sheet`)

        const beforeEmpty = opened.length
        await page.locator('[role=dialog] button[type=submit]').click()
        await sleep(400)
        const f = await page.evaluate(() => ({
          focus: document.activeElement?.getAttribute('autocomplete') || document.activeElement?.tagName.toLowerCase(),
          invalid: document.querySelectorAll('[role=dialog] [aria-invalid=true]').length,
          errors: [...document.querySelectorAll('[role=dialog] .text-error')].map((e) => e.innerText.trim()),
          live: document.querySelector('[role=dialog] p.sr-only[aria-live]')?.textContent,
        }))
        report.focus.push(`${tag}: empty booking submit focus=${f.focus}, aria-invalid=${f.invalid}, errors=${f.errors.length}, announced="${f.live}"`)
        if (f.errors.length < 3 || !f.live) fail(`${tag}: empty booking submit did not show and announce its errors`)
        if (opened.length > beforeEmpty) fail(`${tag}: an empty booking opened WhatsApp`)
        await shot(page, `booking-errors-${tag}`)
        await audit(page, `${tag} booking sheet errors`)

        await page.locator('[role=dialog] label:has(input[type=radio])').first().click()
        await page.locator('[role=dialog] [role=group] button').last().click() // 2 people
        await page.fill('[role=dialog] input[autocomplete=name]', lang === 'kn' ? 'ಆಶಾ ರಾವ್' : 'Asha Rao')
        await page.fill('[role=dialog] input[type=tel]', '+91 98450 12345')
        await page.locator('[role=dialog] input[type=tel]').blur()
        await sleep(250)
        await shot(page, `booking-filled-${tag}`)
        await audit(page, `${tag} booking sheet filled`)

        const before = opened.length
        const tab = ctx.waitForEvent('page')
        await page.locator('[role=dialog] button[type=submit]').click()
        await (await tab).close()
        await page.waitForURL(/\/classes\/booked\//)
        await sleep(500)
        const url = opened.slice(before).find((u) => textOf(u).startsWith('New class booking'))
        if (!url) fail(`${tag}: booking did not open WhatsApp`)
        else {
          const msg = textOf(url)
          const id = msg.match(/^New class booking: (CL-\d{6}-\w{4})/)?.[1]
          const checks = [
            [id?.startsWith('CL-261005-'), 'ID carries the booking day 5 Oct (IST)'],
            [msg.includes('Class: Chocolate Making for Beginners (in person, 3 hours)'), 'class line in English'],
            [msg.includes('Batch: Sat, 10 Oct 2026, 11 am'), 'first batch is Sat 10 Oct, 11 am'],
            [msg.includes('People: 2 × ₹1,499 = ₹2,998'), 'people and total'],
            [msg.includes('Phone: +91 98450 12345'), 'phone tidied'],
            [page.url().endsWith(`/classes/booked/${id}`), 'success page URL has the same ID'],
          ]
          checks.filter(([ok]) => !ok).forEach(([, what]) => fail(`${tag}: booking message: ${what}\n${msg}`))
          report.flows.push(`${tag}: booking sent, ${checks.filter(([ok]) => ok).length}/${checks.length} checks passed (${id})`)
          if (tag === '390-en' || tag === '390-kn') samples.push(`Booking sent from the ${lang === 'en' ? 'English' : 'Kannada'} site (390px)\n${msg}\n\nLink: ${url.slice(0, 90)}…\n`)
        }
        const title = await h1(page)
        report.honesty.push(`${tag}: booking with WhatsApp opened → "${title}"`)
        if (title !== T.booked.title) fail(`${tag}: booking success title is "${title}", expected "${T.booked.title}"`)
        await shot(page, `booked-${tag}`)
        await fullShot(page, `booked-full-${tag}`)
        await audit(page, `${tag} booked`)
        if (lang === 'kn') await kannadaScan(page, `${tag} booked`)
        await page.reload()
        await page.waitForFunction(() => window.__dkReady === true)
        await sleep(400)
        report.flows.push(`${tag}: after refresh the booking page still shows "${await h1(page)}"`)
        if ((await page.locator('#your-booking').count()) !== 1) fail(`${tag}: booking details gone after refresh`)

        // Keyboard: Esc closes the sheet and focus returns to its button
        await go(page, '/classes')
        await openDialog(page, book)
        await closeDialog(page)
        const back = await page.evaluate(() => document.activeElement?.closest('article')?.id)
        report.focus.push(`${tag}: Esc closed the booking sheet, focus back on the Book button of #${back}`)
        if (back !== 'chocolate-making-beginners') fail(`${tag}: focus did not return to the Book a seat button`)
        await ctx.close()
      }

      /* ---------- a browser that blocks the WhatsApp tab: no success message ---------- */
      {
        const { ctx, page } = await newPage(browser, width, lang, { blockPopups: true })
        await go(page, '/classes')
        await openDialog(page, page.locator('#online-chocolate-basics button[aria-haspopup=dialog]'))
        await page.locator('[role=dialog] label:has(input[type=radio])').first().click()
        await page.fill('[role=dialog] input[autocomplete=name]', 'Ravi')
        await page.fill('[role=dialog] input[type=tel]', '9845012345')
        await page.locator('[role=dialog] button[type=submit]').click()
        await page.waitForURL(/\/classes\/booked\//)
        await sleep(500)
        const title = await h1(page)
        report.honesty.push(`${tag}: booking with WhatsApp blocked → "${title}"`)
        if (title !== T.booked.blockedTitle) fail(`${tag}: blocked booking shows "${title}"`)
        const first = await page.evaluate(() => document.querySelector('#fallback-title')?.compareDocumentPosition(document.querySelector('#booking-id-label')) & Node.DOCUMENT_POSITION_FOLLOWING)
        if (!first) fail(`${tag}: blocked booking does not put Open WhatsApp first`)
        await shot(page, `booked-blocked-${tag}`)
        await audit(page, `${tag} booked blocked`)

        // Call-back on Contact, blocked
        await go(page, '/contact')
        await page.fill('section[aria-labelledby=cb-title] input[type=tel]', '9845012345')
        await page.locator('section[aria-labelledby=cb-title] button[type=submit]').click()
        await sleep(400)
        const cb = (await page.locator('section[aria-labelledby=cb-title] h3').innerText()).trim()
        report.honesty.push(`${tag}: call-back with WhatsApp blocked → "${cb}"`)
        if (cb !== T.callback.blockedTitle) fail(`${tag}: blocked call-back shows "${cb}"`)
        await scrollTo(page, '#cb-title')
        await shot(page, `callback-blocked-${tag}`)
        await audit(page, `${tag} call-back blocked`)
        await ctx.close()
      }

      /* ---------- call-back on Contact: error, then sent ---------- */
      {
        const { ctx, page } = await newPage(browser, width, lang)
        await go(page, '/contact')
        await page.locator('section[aria-labelledby=cb-title] button[type=submit]').click()
        await sleep(300)
        const err = await page.locator('section[aria-labelledby=cb-title] [aria-invalid=true]').count()
        if (err !== 1) fail(`${tag}: empty call-back did not flag the phone field`)
        await scrollTo(page, '#cb-title')
        await shot(page, `callback-error-${tag}`)
        await page.fill('section[aria-labelledby=cb-title] input[type=tel]', '98450 12345')
        await page.locator('section[aria-labelledby=cb-title] .chip').nth(2).click()
        const before = opened.length
        const tab = ctx.waitForEvent('page')
        await page.locator('section[aria-labelledby=cb-title] button[type=submit]').click()
        await (await tab).close()
        await sleep(400)
        const msg = textOf(opened.slice(before).find((u) => u.startsWith(WA)) || WA)
        report.flows.push(`${tag}: call-back sent: "${msg}"`)
        if (msg !== 'Hi Dream Kitchen, please call me back on +91 98450 12345 in the evening.') fail(`${tag}: call-back message was "${msg}"`)
        const cb = (await page.locator('section[aria-labelledby=cb-title] h3').innerText()).trim()
        report.honesty.push(`${tag}: call-back with WhatsApp opened → "${cb}"`)
        if (cb !== T.callback.doneTitle) fail(`${tag}: call-back confirmation shows "${cb}"`)
        await scrollTo(page, '#cb-title')
        await shot(page, `callback-sent-${tag}`)
        await audit(page, `${tag} call-back sent`)
        await ctx.close()
      }
    }
  }

  /* ---------- order ID in the browser: the day the order is placed, in Indian time ---------- */
  for (const [label, now, timezoneId, expected] of [
    ['Monday 10 am IST, delivery picked for Wed 7 Oct', MONDAY, 'Asia/Kolkata', 'DK-261005-'],
    ['00:15 Tue 6 Oct IST on a phone set to UTC (still Mon 5 Oct there)', '2026-10-05T18:45:00Z', 'UTC', 'DK-261006-'],
  ]) {
    const { ctx, page } = await newPage(browser, 390, 'en', { now, timezoneId })
    await go(page, '/shop')
    await seedCart(page)
    await go(page, '/checkout')
    await page.fill('#co-name', 'Asha Rao')
    await page.fill('#co-phone', '9845012345')
    await page.fill('#co-address', '12, 3rd Cross, Jayanagar 4th Block')
    if (await page.locator('#co-area').count()) await page.fill('#co-area', 'Bengaluru')
    await page.fill('#co-pincode', '560011')
    await page.locator('label:has(input[name="co-date"])').first().click()
    const date = await page.locator('input[name="co-date"]:checked').getAttribute('value')
    const before = opened.length
    const tab = ctx.waitForEvent('page')
    await page.locator('div.fixed.bottom-0 button[type=submit]').click()
    await (await tab).close()
    await page.waitForURL(/\/order\//)
    const msg = textOf(opened.slice(before).find((u) => textOf(u).startsWith('New order')) || WA)
    const id = msg.match(/^New order: (DK-\S+)/)?.[1] || '(none)'
    const ok = id.startsWith(expected) && page.url().endsWith(`/order/${id}`)
    report.orderId.push(`${label}: preferred date ${date}, ID ${id}, success page /order/${id} → ${ok ? 'OK' : 'WRONG'}`)
    if (!ok) fail(`order ID: ${label}: got ${id}, expected ${expected}…`)
    if (label.startsWith('Monday')) samples.push(`Order placed Monday 5 Oct 2026, 10 am IST (preferred date ${date})\n${msg}\n`)
    await ctx.close()
  }

  const bad = opened.filter((u) => !u.startsWith(WA))
  report.whatsapp = [`${opened.length} WhatsApp tabs opened during the run, ${bad.length} to a wrong number`, ...bad]
  bad.forEach((u) => fail(`WhatsApp tab to a wrong number: ${u}`))
  writeFileSync(`${OUT}/whatsapp-samples.txt`, `Sample WhatsApp messages captured from the real pages during scripts/qa-step4.mjs (always English, plain text).\n\n${samples.join('\n')}`)

  await browser.close()
  writeFileSync(`${OUT}/qa-report.json`, JSON.stringify(report, null, 2))
  const brief = { ...report, links: report.links.filter((l) => l.includes('BAD')), linksChecked: report.links.reduce((n, l) => n + (Number(l.match(/: (\d+) call/)?.[1]) || 0), 0) }
  console.log(JSON.stringify(brief, null, 2))
  const problems = report.failures.length + report.overflow.length + report.textOverflow.length + report.smallTargets.length + report.kannada.length + brief.links.length
  console.log(problems ? `\n${problems} problems` : '\nClean run')
  process.exit(problems ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
