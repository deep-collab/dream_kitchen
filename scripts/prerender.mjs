/*
  Vite plugin (build only): every page a visitor can land on as a real HTML file.

  Razorpay's website check (and some search engines) read a page without running JavaScript, and
  without JavaScript every address is the empty app shell. After the build this writes the home
  page (dist/index.html), menu, classes, customize, contact, faq, our-story and the four policy
  pages (terms, refund, shipping, privacy): the built index.html with the page's title,
  description and address, and the page's full text, prices, the main links and the footer
  contact details inside #root. Netlify serves /refund from refund.html before the
  "/* /app.html" rewrite. The empty shell is kept as dist/app.html for every other address (cart,
  checkout, track, order pages, 404), so those never show the home page's text for a moment.
  The app then starts as usual: src/main.jsx empties #root and renders.

  The words come from the same places the app uses (src/data/policies.js, src/config/site.js,
  src/config/shop.js, src/i18n/en.json), so they cannot drift. Hema's admin changes (prices,
  courier rates, lead times) are not known at build time: the config values are written here,
  and the app shows her live values once it starts.
*/
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { site } from '../src/config/site.js'
import { categories, optionPrices, products } from '../src/config/shop.js'
import { applySettings, formatINR, hasPrice } from '../src/lib/pricing.js'
import { policyContent, policyVars } from '../src/data/policies.js'
import { dateParts } from '../src/lib/dates.js'
import { classSchedule } from '../src/data/classInfo.js'
import { applyClassSettings, slotLabel } from '../src/lib/classTimes.js'
import { classBookingText } from '../src/lib/whatsappText.js'

// The links of src/components/layout/nav.js (that file imports the icons, which Node can't load)
const MAIN_NAV_LINKS = [
  { to: '/', key: 'home' },
  { to: '/menu', key: 'menu' },
  { to: '/customize', key: 'customize' },
  { to: '/classes', key: 'classes' },
  { to: '/contact', key: 'contact' },
]
const FOOTER_NAV_LINKS = [
  { to: '/track', key: 'track' },
  { to: '/our-story', key: 'story' },
  { to: '/faq', key: 'faq' },
  { to: '/contact', key: 'contact' },
]
const POLICY_PAGES = ['terms', 'refund', 'shipping', 'privacy']

export const PRERENDER_PAGES = ['home', 'menu', 'classes', 'customize', 'contact', 'faq', 'story', ...POLICY_PAGES]

/** Each page's address, and so its file: / -> index.html, /our-story -> our-story.html */
export const pagePath = (page) => (page === 'home' ? '/' : page === 'story' ? '/our-story' : `/${page}`)
export const pageFile = (page) => (page === 'home' ? 'index.html' : `${pagePath(page).slice(1)}.html`)
/** The empty app, for every address without a page of its own (src/config/redirects.js) */
export const SHELL_FILE = 'app.html'

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const en = (v) => (v && typeof v === 'object' ? v.en : v)
const fill = (text, vars = {}) => text.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m))
const fromPrice = (p) => (p.sizes?.length ? Math.min(...p.sizes.map((s) => s.price)) : p.price)
const btn = (variant, extra) => `btn btn-${variant} ${extra}`
const waHref = (text) => `https://wa.me/${site.whatsapp}?text=${encodeURIComponent(text)}`

const link = 'inline-flex min-h-12 items-center font-bold underline underline-offset-4'

function header(t) {
  return `<header class="on-dark border-b border-gold/45 bg-ink text-cream">
  <div class="dk-container flex flex-wrap items-center gap-x-4 py-2">
    <a href="/" class="mr-auto flex min-h-12 items-center gap-2.5" aria-label="${esc(t.brand.homeLink)}">
      <svg viewBox="0 0 220.3 213.0" class="h-10 w-auto shrink-0" aria-hidden="true" focusable="false"><use href="#dk-symbol" fill="url(#dk-gold)" /></svg>
      <span class="gold-text font-wordmark text-[20px] font-semibold uppercase" aria-hidden="true">Dream Kitchen</span>
    </a>
    <nav aria-label="${esc(t.nav.main)}">
      <ul class="flex flex-wrap gap-x-4">
        ${MAIN_NAV_LINKS.map(({ to, key }) => `<li><a href="${to}" class="inline-flex min-h-12 items-center font-bold text-cream hover:text-gold-light">${esc(t.nav[key])}</a></li>`).join('\n        ')}
      </ul>
    </nav>
  </div>
</header>`
}

/** An Instagram link as the app renders it: the config address, a new tab, and the spoken label */
const instagramAttrs = (t, label = fill(t.common.instagramLabel, { handle: `@${site.instagramHandle}` })) =>
  `href="${esc(site.instagramUrl)}" target="_blank" rel="noopener noreferrer" aria-label="${esc(label)}"`

/** The same lines as src/components/layout/BusinessDetails.jsx */
function businessDetails(t, dark) {
  const label = dark ? 'text-cream' : 'font-bold'
  const a = `underline underline-offset-4 break-all ${dark ? 'text-cream' : 'font-bold'}`
  return `<address class="not-italic space-y-1">
  <p><span class="${label}">${esc(site.name)}</span> · ${esc(t.footer.owner)}</p>
  <p><span class="${label}">${esc(t.footer.phone)}:</span> ${esc(site.phone.display)}</p>
  ${site.email ? `<p><span class="${label}">${esc(t.footer.email)}:</span> <a href="mailto:${esc(site.email)}" class="${a}">${esc(site.email)}</a></p>` : ''}
  ${site.address ? `<p><span class="${label}">${esc(t.footer.address)}:</span> ${esc(site.address)}</p>` : ''}
  <p><span class="${label}">${esc(t.footer.instagram)}:</span> <a ${instagramAttrs(t)} class="${a}">@${esc(site.instagramHandle)}</a></p>
</address>`
}

function footer(t) {
  const navLink = 'inline-flex min-h-12 items-center text-cream underline-offset-4 hover:underline'
  const list = (label, items) => `<nav aria-label="${esc(label)}"><ul class="flex flex-wrap gap-x-6">
      ${items.map(({ to, key }) => `<li><a href="${to}" class="${navLink}">${esc(t.nav[key])}</a></li>`).join('\n      ')}
    </ul></nav>`
  return `<footer class="on-dark border-t border-gold/45 bg-ink text-muted">
  <div class="dk-container space-y-2 pt-8 pb-6">
    ${list(t.footer.links, FOOTER_NAV_LINKS)}
    ${list(t.footer.policies, POLICY_PAGES.map((p) => ({ to: `/${p}`, key: p })))}
  </div>
  <div class="dk-container pb-8">
    <hr class="rule-gold" />
    <section aria-label="${esc(t.footer.details)}" class="t-small pt-4">
      ${businessDetails(t, true)}
    </section>
    <div class="t-small space-y-1 pt-3">
      <p>${esc(fill(t.footer.rights, { year: new Date().getFullYear() }))}</p>
      <p>${esc(t.footer.shipping)}</p>
      ${site.fssai ? `<p>${esc(fill(t.footer.fssai, { fssai: site.fssai }))}</p>` : ''}
    </div>
  </div>
</footer>`
}

/** src/pages/Policy.jsx, without the parts that need JavaScript */
function policyMain(t, page, settings) {
  const doc = policyContent(page, policyVars(settings))
  const d = dateParts(site.policiesUpdated)
  const updated = `${d.day} ${t.dates.months[d.month - 1]} ${d.year}`
  const body = (part) =>
    Array.isArray(part) ? `<ul class="mt-2 list-disc space-y-1 pl-6">${part.map((item) => `<li>${esc(item)}</li>`).join('')}</ul>` : `<p class="mt-2">${esc(part)}</p>`
  return `<div class="dk-container py-6 lg:py-12">
  <article class="max-w-2xl" data-dk-policy="${page}">
    <h1 class="t-h2">${esc(t.policy[page])}</h1>
    <p class="t-small mt-1 text-brown-2">${esc(fill(t.policy.updated, { date: updated }))}</p>
    <div class="mt-5 space-y-6">
      <p>${esc(doc.intro)}</p>
      ${doc.sections.map((s, i) => `<section aria-labelledby="policy-${i}">
        <h2 id="policy-${i}" class="t-h3">${esc(s.heading)}</h2>
        ${s.body.map(body).join('\n        ')}
      </section>`).join('\n      ')}
    </div>
    <section aria-labelledby="policy-contact" class="mt-8 rounded-card bg-champagne p-5">
      <h2 id="policy-contact" class="t-h3">${esc(t.policy.contactTitle)}</h2>
      <div class="mt-2">${businessDetails(t, false)}</div>
    </section>
    <nav aria-labelledby="policy-others" class="mt-8">
      <h2 id="policy-others" class="font-bold">${esc(t.policy.others)}</h2>
      <ul class="mt-1 flex flex-wrap gap-x-6">
        ${POLICY_PAGES.filter((p) => p !== page).map((p) => `<li><a href="/${p}" class="${link}">${esc(t.policy[p])}</a></li>`).join('\n        ')}
      </ul>
    </nav>
  </article>
</div>`
}

/** src/pages/Contact.jsx (the message form needs JavaScript, so WhatsApp, Instagram and email only) */
function contactMain(t) {
  const row = 'flex min-h-16 items-center gap-4 rounded-card border border-line bg-[#fffcf5] p-4'
  const item = (href, title, text, external) =>
    `<li><a ${href === site.instagramUrl ? instagramAttrs(t) : `href="${esc(href)}"${external ? ' rel="noopener noreferrer"' : ''}`} class="${row}"><span><span class="block font-bold">${esc(title)}</span><span class="t-small block break-all text-brown-2">${esc(text)}</span></span></a></li>`
  return `<div class="dk-container py-6 lg:py-12">
  <div class="max-w-xl">
    <h1 class="t-h2">${esc(t.contact.title)}</h1>
    <p class="mt-1 text-brown-2">${esc(t.contact.lead)}</p>
    <ul class="mt-5 space-y-3">
      ${item(`https://wa.me/${site.whatsapp}`, t.contact.whatsapp, t.contact.whatsappText, true)}
      ${item(site.instagramUrl, t.contact.instagram, `@${site.instagramHandle}`, true)}
      ${site.email ? item(`mailto:${site.email}`, t.contact.email, site.email, false) : ''}
    </ul>
    <address class="mt-5 space-y-1 not-italic" data-dk-business>
      <p><span class="font-bold">${esc(site.name)}</span> · ${esc(t.footer.owner)}</p>
      <p><span class="font-bold">${esc(t.contact.phone)}:</span> ${esc(site.phone.display)}</p>
      ${site.address ? `<p><span class="font-bold">${esc(t.footer.address)}:</span> ${esc(site.address)}</p>` : ''}
    </address>
    ${site.fssai ? `<p class="mt-3"><span class="font-bold">${esc(t.contact.fssai)}:</span> ${esc(site.fssai)}</p>` : ''}
    <p class="mt-6 flex flex-wrap gap-x-6">
      <a href="/track" class="${link}">${esc(t.contact.track)}</a>
      <a href="/faq" class="${link}">${esc(t.contact.faq)}</a>
    </p>
  </div>
</div>`
}

/** src/pages/Menu.jsx as a plain list: every product on the menu with its prices (config prices) */
function menuMain(t) {
  const shown = products.filter((p) => p.active !== false && p.menu !== false && hasPrice(p)).sort((a, b) => a.sort - b.sort)
  const price = (p) => (p.sizes?.length ? p.sizes.map((s) => `${esc(s.label || `${s.grams} g`)}: ${formatINR(s.price)}`).join(' · ') : formatINR(p.price))
  const cats = categories.filter((c) => !c.hidden).sort((a, b) => a.sort - b.sort)
  return `<div class="dk-container pt-5 pb-3 lg:pt-8">
  <h1 class="t-h2">${esc(t.menu.title)}</h1>
  <p class="t-small mt-1 text-brown-2">${esc(t.menu.lead)}</p>
</div>
${cats
  .map((c) => {
    const list = shown.filter((p) => p.category === c.id)
    if (!list.length) return ''
    return `<section id="${c.id}" aria-labelledby="${c.id}-title" class="pt-6 pb-4 lg:pt-10">
  <div class="dk-container">
    <div class="mb-3 flex flex-wrap items-baseline gap-x-3">
      <h2 id="${c.id}-title" class="t-h3">${esc(en(c.name))}</h2>
      ${c.note ? `<p class="t-small text-brown-2">${esc(en(c.note))}</p>` : ''}
    </div>
    <ul class="space-y-3">
      ${list
        .map(
          (p) => `<li class="rounded-card border border-line bg-[#fffcf5] p-4">
        <p class="font-bold">${esc(en(p.name))}</p>
        ${p.description ? `<p class="t-small text-brown-2">${esc(en(p.description))}</p>` : ''}
        <p class="t-price mt-1">${price(p)}</p>
      </li>`,
        )
        .join('\n      ')}
    </ul>
  </div>
</section>`
  })
  .join('\n')}
<div class="h-6"></div>`
}

/** src/pages/Home.jsx: the hero (logo, tagline, three buttons), the six tiles and the drawings card */
function homeMain(t) {
  const cats = categories.filter((c) => !c.hidden).sort((a, b) => a.sort - b.sort)
  const tiles = [...cats.map((c) => ({ to: `/menu#${c.id}`, label: en(c.name) })), { to: '/customize', label: t.nav.customize }, { to: '/classes', label: t.nav.classes }]
  const bar = products.find((p) => p.id === 'drawing-chocolate-bar')
  return `<section class="on-dark relative isolate overflow-hidden bg-ink text-cream">
  <div class="dk-container flex flex-col items-center pt-3 pb-4 text-center md:pt-10 md:pb-12">
    <h1 class="dk-lockup dk-lockup--hero" aria-label="${esc(t.brand.lockupLabel)}">
      <svg viewBox="0 0 220.3 213.0" class="dk-lockup__symbol" aria-hidden="true" focusable="false"><use href="#dk-symbol" fill="url(#dk-gold)" /></svg>
      <span class="dk-lockup__name" aria-hidden="true"><span>Dream</span> <span>Kitchen</span></span>
      <span class="dk-lockup__sub" aria-hidden="true"><span class="dk-lockup__ruled">Handmade</span> <span>Chocolates</span></span>
    </h1>
    <p class="dk-tagline mt-3 md:mt-5">${esc(t.brand.tagline)}</p>
    <p class="mt-3 flex w-full max-w-sm flex-wrap justify-center gap-2 md:mt-6 md:w-auto md:max-w-none md:flex-nowrap md:gap-3">
      <a href="/menu" class="${btn('primary', 'btn-lg w-full md:w-auto md:min-w-52')}">${esc(t.home.orderNow)}</a>
      <a href="${esc(waHref(site.whatsappOrderText))}" class="${btn('secondary', 'btn-lg flex-auto')}" rel="noopener noreferrer">${esc(t.home.whatsappOrder)}</a>
      <a href="/classes#book" class="${btn('secondary', 'btn-lg flex-auto')}">${esc(t.home.bookClass)}</a>
    </p>
  </div>
</section>
<section aria-labelledby="pick-title" class="py-6 md:py-10">
  <div class="dk-container">
    <h2 id="pick-title" class="sr-only">${esc(t.home.pick)}</h2>
    <ul class="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5">
      ${tiles.map((tile) => `<li><a href="${tile.to}" class="flex min-h-12 items-center rounded-card border border-line bg-[#fffcf5] px-3 py-2 font-bold">${esc(tile.label)}</a></li>`).join('\n      ')}
    </ul>
    ${
      bar && hasPrice(bar)
        ? `<section aria-labelledby="special-title" class="mt-3 rounded-card border border-line bg-[#fffcf5] p-3 sm:mt-5 sm:p-4">
      <h2 id="special-title" class="leading-snug font-bold">${esc(t.home.special.title)}</h2>
      <p class="t-small mt-0.5 text-brown-2">${esc(fill(t.home.special.text, { drawingPrice: formatINR(optionPrices.drawing), barPrice: formatINR(fromPrice(bar)) }))}</p>
      <a href="/customize" class="${btn('primary', 'mt-2')}">${esc(t.nav.customize)}</a>
    </section>`
        : ''
    }
  </div>
</section>`
}

/** src/pages/Classes.jsx without JavaScript: when, how long, the slots, each class with its fee (book on WhatsApp) */
function classesMain(t) {
  const now = applyClassSettings()
  const facts = [
    ['when', en(classSchedule.when)],
    ['duration', en(classSchedule.duration)],
    ['slots', now.slots.map((s) => slotLabel(s, 'en', en)).join(t.classes.slotsOr)],
  ]
  return `<div class="dk-container py-6 lg:py-10">
  <h1 class="t-h2">${esc(t.classes.title)}</h1>
  <p class="mt-1 text-brown-2">${esc(t.classes.lead)}</p>
  <dl class="mt-5 divide-y divide-line border-y border-line">
    ${facts.map(([k, v]) => `<div class="grid gap-1 py-3 sm:grid-cols-[10rem_1fr]"><dt class="font-bold">${esc(t.classes.sections[k])}</dt><dd>${esc(v)}</dd></div>`).join('\n    ')}
  </dl>
  <section id="book" aria-labelledby="cl-title" class="mt-8">
    <h2 id="cl-title" class="t-h3">${esc(t.classes.choose)}</h2>
    <ul class="mt-3 space-y-3">
      ${now.classes
        .map(
          (c) => `<li class="rounded-card border border-line bg-[#fffcf5] p-4 sm:p-5">
        <div class="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1"><h3 class="t-h3">${esc(fill(t.classes.cardTitle, { name: en(c.name) }))}</h3><p class="t-price tabular-nums">${formatINR(c.price)}</p></div>
        ${c.beginnerFriendly ? `<p class="t-small mt-2 font-bold">${esc(t.classes.beginner)}</p>` : ''}
        <a href="${esc(waHref(classBookingText(c)))}" class="${btn('whatsapp', 'btn-block mt-3')}" rel="noopener noreferrer">${esc(t.classes.bookWhatsApp)}</a>
      </li>`,
        )
        .join('\n      ')}
    </ul>
  </section>
</div>`
}

/** src/pages/Customize.jsx: a Delight Box with a name or a drawing, and the Drawing Chocolate Bar */
function customizeMain(t) {
  const boxes = products.filter((p) => p.category === 'delight-boxes' && p.active !== false && hasPrice(p)).sort((a, b) => a.sort - b.sort)
  const bar = products.find((p) => p.id === 'drawing-chocolate-bar')
  return `<div class="dk-container py-6 lg:py-10">
  <h1 class="t-h2">${esc(t.customize.title)}</h1>
  <p class="mt-1 text-brown-2">${esc(t.customize.lead)}</p>
  <div class="mt-6 grid gap-5 lg:grid-cols-2">
    <section aria-labelledby="cz-box" class="rounded-card border border-line bg-[#fffcf5] p-4 sm:p-5">
      <h2 id="cz-box" class="t-h3">${esc(t.customize.box.title)}</h2>
      <p class="t-small mt-1">${esc(fill(t.customize.box.text, { price: formatINR(optionPrices.drawing) }))}</p>
      <p class="mt-4 font-bold">${esc(t.customize.box.pick)}</p>
      <ul class="mt-2 grid grid-cols-2 gap-2">
        ${boxes.map((p) => `<li><a href="/menu?item=${p.id}" class="flex min-h-14 flex-col justify-center rounded-control border-[1.5px] border-control-line bg-cream px-3 py-2"><span class="leading-tight font-bold">${esc(en(p.name))}</span><span class="t-small text-brown-2">${esc(fill(t.menu.from, { price: formatINR(fromPrice(p)) }))}</span></a></li>`).join('\n        ')}
      </ul>
    </section>
    ${
      bar && hasPrice(bar)
        ? `<section aria-labelledby="cz-bar" class="rounded-card border border-line bg-[#fffcf5] p-4 sm:p-5">
      <h2 id="cz-bar" class="t-h3">${esc(t.customize.bar.title)}</h2>
      <p class="t-small mt-1">${esc(t.customize.bar.text)}</p>
      <p class="t-price mt-2">${formatINR(fromPrice(bar))}</p>
    </section>`
        : ''
    }
  </div>
  <p class="t-small mt-4 text-brown-2">${esc(t.customize.drawingNote)}</p>
</div>`
}

const FAQ_ITEMS = ['order', 'pay', 'courier', 'when', 'track', 'name', 'ragi', 'change']

/** src/pages/FAQ.jsx: every question with its answer open (no JavaScript needed); paying = Razorpay, the way the site takes payments */
function faqMain(t, settings) {
  const r = settings.courier.rates
  const vars = {
    phone: site.phone.display,
    days: settings.leadTimes.standardBusinessDays,
    drawingPrice: formatINR(optionPrices.drawing),
    smallKa: formatINR(r.small.karnataka),
    smallOut: formatINR(r.small.outside),
    largeKa: formatINR(r.large.karnataka),
    largeOut: formatINR(r.large.outside),
    xlKa: formatINR(r.xl.karnataka),
    xlOut: formatINR(r.xl.outside),
  }
  return `<div class="dk-container py-6 lg:py-12">
  <div class="max-w-2xl">
    <h1 class="t-h2">${esc(t.faq.title)}</h1>
    <p class="mt-1 text-brown-2">${esc(fill(t.faq.lead, vars))}</p>
    <div class="mt-5 divide-y divide-line border-y border-line">
      ${FAQ_ITEMS.map((k) => `<details open><summary class="flex min-h-14 items-center py-3 font-bold">${esc(t.faq.items[k].q)}</summary><p class="pb-4">${esc(fill(t.faq.items[k].aOnline || t.faq.items[k].a, vars))}</p></details>`).join('\n      ')}
    </div>
  </div>
</div>`
}

/** src/pages/Story.jsx */
function storyMain(t) {
  return `<div class="dk-container py-6 lg:py-12">
  <div class="max-w-[40rem]">
    <h1 class="t-h1">${esc(t.story.title)}</h1>
    <p class="t-lead mt-2 text-brown-2">${esc(t.story.lead)}</p>
    <div class="mt-6 space-y-6">
      ${['start', 'fresh', 'teach'].map((k) => `<section aria-labelledby="story-${k}"><h2 id="story-${k}" class="t-h3">${esc(t.story[k].title)}</h2><p class="mt-2">${esc(t.story[k].text)}</p></section>`).join('\n      ')}
    </div>
    <p class="mt-6 flex flex-wrap gap-x-6">
      <a href="/classes" class="${link}">${esc(t.story.teach.cta)}</a>
      <a ${instagramAttrs(t, `${t.story.instagram.cta}: ${fill(t.common.instagramLabel, { handle: `@${site.instagramHandle}` })}`)} class="${link}">${esc(t.story.instagram.cta)}</a>
      <a href="/menu" class="${link}">${esc(t.story.cta)}</a>
    </p>
  </div>
</div>`
}

const MAINS = { home: homeMain, menu: menuMain, classes: classesMain, customize: customizeMain, contact: contactMain, faq: faqMain, story: storyMain }

/** The page's HTML: the built index.html with its own title, description and content */
export function prerenderPage(indexHtml, page, t) {
  const seo = t.seo[page]
  const title = seo.title
  const desc = fill(seo.desc, { phone: site.phone.display })
  const settings = applySettings({})
  const main = POLICY_PAGES.includes(page) ? policyMain(t, page, settings) : MAINS[page](t, settings)
  const href = site.url.replace(/\/$/, '') + pagePath(page)
  const content = `<div id="dk-app" class="flex min-h-dvh flex-col" data-dk-prerendered="${page}">
${header(t)}
<main id="main" class="flex-1">
${main}
</main>
${footer(t)}
</div>`
  const setMeta = (html, attr, key, value) => {
    const re = new RegExp(`<meta ${attr}="${key}" content="[^"]*"\\s*/?>`)
    if (!re.test(html)) throw new Error(`[dk-prerender] index.html has no <meta ${attr}="${key}">`)
    return html.replace(re, `<meta ${attr}="${key}" content="${esc(value)}" />`)
  }
  const setCanonical = (html, value) => {
    const re = /<link rel="canonical" href="[^"]*"\s*\/?>/
    if (!re.test(html)) throw new Error('[dk-prerender] index.html has no <link rel="canonical">')
    return html.replace(re, `<link rel="canonical" href="${esc(value)}" />`)
  }
  let html = indexHtml
  if (!/<title>[^<]*<\/title>/.test(html) || !html.includes('<div id="root"></div>')) throw new Error('[dk-prerender] index.html has no <title> or empty #root')
  html = html.replace(/<title>[^<]*<\/title>/, `<title>${esc(title)}</title>`)
  html = setMeta(html, 'name', 'description', desc)
  html = setMeta(html, 'property', 'og:title', title)
  html = setMeta(html, 'property', 'og:description', desc)
  html = setMeta(html, 'property', 'og:url', href)
  html = setCanonical(html, href)
  html = html.replace('<div id="root"></div>', `<div id="root">${content}</div>`)
  return html
}

/** The empty app for addresses without a page of their own: no canonical / og:url (the app sets both) */
export const shellHtml = (indexHtml) => indexHtml.replace(/\s*<link rel="canonical" href="[^"]*"\s*\/?>/, '').replace(/\s*<meta property="og:url" content="[^"]*"\s*\/?>/, '')

export default function prerender() {
  let outDir
  return {
    name: 'dk-prerender',
    apply: 'build',
    configResolved(config) {
      outDir = resolve(config.root, config.build.outDir)
    },
    // After every file is written: read the final index.html (with its hashed file names)
    writeBundle: {
      sequential: true,
      order: 'post',
      handler() {
        const t = JSON.parse(readFileSync(new URL('../src/i18n/en.json', import.meta.url), 'utf8'))
        const indexHtml = readFileSync(resolve(outDir, 'index.html'), 'utf8')
        // The shell first: index.html is about to become the home page
        writeFileSync(resolve(outDir, SHELL_FILE), shellHtml(indexHtml))
        for (const page of PRERENDER_PAGES) writeFileSync(resolve(outDir, pageFile(page)), prerenderPage(indexHtml, page, t))
      },
    },
  }
}
