/*
  Vite plugin (build only): the policy pages, Contact and the Menu as real HTML files.

  Razorpay's website check (and some search engines) read a page without running JavaScript, and
  without JavaScript every address is the empty app shell. After the build this writes
  dist/terms.html, refund.html, shipping.html, privacy.html, contact.html and menu.html: the built
  index.html with the page's title and description, and the page's full text, the main links and
  the footer contact details inside #root. Netlify serves /refund from refund.html before the
  "/* /index.html" rewrite. The app then starts as usual: src/main.jsx empties #root and renders.

  The words come from the same places the app uses (src/data/policies.js, src/config/site.js,
  src/config/shop.js, src/i18n/en.json), so they cannot drift. Hema's admin changes (prices,
  courier rates, lead times) are not known at build time: the config values are written here,
  and the app shows her live values once it starts.
*/
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { site } from '../src/config/site.js'
import { categories, products } from '../src/config/shop.js'
import { applySettings, formatINR, hasPrice } from '../src/lib/pricing.js'
import { policyContent, policyVars } from '../src/data/policies.js'
import { dateParts } from '../src/lib/dates.js'

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

export const PRERENDER_PAGES = [...POLICY_PAGES, 'contact', 'menu']

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const en = (v) => (v && typeof v === 'object' ? v.en : v)
const fill = (text, vars = {}) => text.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m))

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

/** The same lines as src/components/layout/BusinessDetails.jsx */
function businessDetails(t, dark) {
  const label = dark ? 'text-cream' : 'font-bold'
  const a = `underline underline-offset-4 break-all ${dark ? 'text-cream' : 'font-bold'}`
  return `<address class="not-italic space-y-1">
  <p><span class="${label}">${esc(site.name)}</span> · ${esc(t.footer.owner)}</p>
  <p><span class="${label}">${esc(t.footer.phone)}:</span> ${esc(site.phone.display)}</p>
  ${site.email ? `<p><span class="${label}">${esc(t.footer.email)}:</span> <a href="mailto:${esc(site.email)}" class="${a}">${esc(site.email)}</a></p>` : ''}
  ${site.address ? `<p><span class="${label}">${esc(t.footer.address)}:</span> ${esc(site.address)}</p>` : ''}
  <p><span class="${label}">${esc(t.footer.instagram)}:</span> <a href="${esc(site.instagram.url)}" class="${a}" rel="noopener noreferrer">${esc(site.instagram.handle)}</a></p>
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
    `<li><a href="${esc(href)}" class="${row}"${external ? ' rel="noopener noreferrer"' : ''}><span><span class="block font-bold">${esc(title)}</span><span class="t-small block break-all text-brown-2">${esc(text)}</span></span></a></li>`
  return `<div class="dk-container py-6 lg:py-12">
  <div class="max-w-xl">
    <h1 class="t-h2">${esc(t.contact.title)}</h1>
    <p class="mt-1 text-brown-2">${esc(t.contact.lead)}</p>
    <ul class="mt-5 space-y-3">
      ${item(`https://wa.me/${site.whatsapp}`, t.contact.whatsapp, t.contact.whatsappText, true)}
      ${item(site.instagram.url, t.contact.instagram, site.instagram.handle, true)}
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

/** The page's HTML: the built index.html with its own title, description and content */
export function prerenderPage(indexHtml, page, t) {
  const seo = t.seo[page]
  const title = seo.title
  const desc = fill(seo.desc, { phone: site.phone.display })
  const settings = applySettings({})
  const main = POLICY_PAGES.includes(page) ? policyMain(t, page, settings) : page === 'contact' ? contactMain(t) : menuMain(t)
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
  let html = indexHtml
  if (!/<title>[^<]*<\/title>/.test(html) || !html.includes('<div id="root"></div>')) throw new Error('[dk-prerender] index.html has no <title> or empty #root')
  html = html.replace(/<title>[^<]*<\/title>/, `<title>${esc(title)}</title>`)
  html = setMeta(html, 'name', 'description', desc)
  html = setMeta(html, 'property', 'og:title', title)
  html = setMeta(html, 'property', 'og:description', desc)
  html = html.replace('<div id="root"></div>', `<div id="root">${content}</div>`)
  return html
}

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
        for (const page of PRERENDER_PAGES) writeFileSync(resolve(outDir, `${page}.html`), prerenderPage(indexHtml, page, t))
      },
    },
  }
}
