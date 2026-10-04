import { readFileSync } from 'node:fs'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { readSymbol, spriteMarkup } from './scripts/symbol.mjs'
import { FONTS_EN, FONTS_KN, KN_FONTS_LINK_ID } from './src/config/fonts.js'
import { site } from './src/config/site.js'
import kannadaSplit, { kannadaFileName } from './scripts/kannada-split.mjs'
import stringsSplit from './scripts/strings-split.mjs'
import { robotsTxt, sitemapXml } from './scripts/sitemap.mjs'

const readJson = (path) => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'))
const escapeHtml = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;')

// Fills the {{dk:*}} markers in index.html: the symbol sprite (from the unaltered
// src/assets/symbol.svg) and the loading-screen tagline (from the i18n files), so the
// inline loading screen has one source for its artwork and its words. Font URLs come
// from src/config/fonts.js; the phone number in the description and JSON-LD from
// src/config/site.js.
function dreamKitchenHtml() {
  return {
    name: 'dream-kitchen-html',
    transformIndexHtml: {
      order: 'pre',
      handler(html) {
        const sym = readSymbol()
        const en = readJson('./src/i18n/en.json')
        const kn = readJson('./src/i18n/kn.json')
        return html
          .replace('{{dk:sprite}}', spriteMarkup(sym))
          .replaceAll('{{dk:viewBox}}', sym.viewBox)
          .replace('{{dk:tagline-en}}', escapeHtml(en.brand.tagline))
          .replace('{{dk:tagline-kn}}', escapeHtml(kn.brand.tagline))
          .replace('{{dk:brand-aria}}', escapeHtml(en.brand.lockupLabel))
          .replaceAll('{{dk:fonts-en}}', escapeHtml(FONTS_EN))
          .replace('{{dk:fonts-kn}}', FONTS_KN)
          .replace('{{dk:kn-link-id}}', KN_FONTS_LINK_ID)
          .replace('{{dk:meta-desc}}', escapeHtml(en.seo.home.desc.replace('{phone}', site.phone.display)))
          .replace('{{dk:telephone}}', site.phone.tel)
      },
    },
  }
}

// Kannada is one JSON file, fetched only when needed (scripts/kannada-split.mjs). For someone
// who chose ಕನ್ನಡ before, a tiny script in <head> starts downloading it at once, alongside the
// main bundle, instead of after it. English readers skip it. Build only: the name has a hash.
function kannadaPreload() {
  return {
    name: 'dk-kannada-preload',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler(html) {
        const file = kannadaFileName(import.meta.dirname)
        // as=fetch + crossorigin so the page's own fetch() reuses this download
        const script = `<script>try{if(localStorage.getItem('dk_lang')==='kn'){var l=document.createElement('link');l.rel='preload';l.as='fetch';l.crossOrigin='anonymous';l.href='/${file}';document.head.appendChild(l)}}catch(e){}</script>`
        // Before the stylesheet: an inline script placed after a stylesheet waits for it to
        // download (about 0.6 s on a slow phone connection), and this hint would start late.
        if (!html.includes('<script type="module"')) throw new Error('[dk-kannada-preload] no module script to place the hint before')
        return html.replace('<script type="module"', `${script}\n    <script type="module"`)
      },
    },
  }
}

// Every page is its own chunk (src/routes.js). Left alone, a first visit downloads them in a
// chain: HTML, then the main code, then the page's code, then the menu data, each waiting for
// the one before (a slow round trip each on a phone). This writes a tiny script into <head> that
// reads the address and starts the page's own files at once, alongside the main code.
// Built from the real file names, so it can never point at a file that doesn't exist.
const ROUTE_FILES = [
  ['^/$', 'src/pages/Home.jsx', true],
  ['^/shop$', 'src/pages/Shop.jsx', true],
  ['^/product/', 'src/pages/Product.jsx', true],
  ['^/cart$', 'src/pages/Cart.jsx', true],
  ['^/checkout$', 'src/pages/Checkout.jsx', true],
  ['^/faq$', 'src/pages/FAQ.jsx', true],
  ['^/order/', 'src/pages/OrderSuccess.jsx'],
  ['^/track$', 'src/pages/Track.jsx'],
  ['^/our-story$', 'src/pages/About.jsx'],
  ['^/gallery$', 'src/pages/Gallery.jsx'],
  ['^/contact$', 'src/pages/Contact.jsx'],
  ['^/classes$', 'src/pages/Classes.jsx'],
  ['^/classes/booked/', 'src/pages/ClassBooked.jsx'],
]
function routePreload() {
  return {
    name: 'dk-route-preload',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler(html, ctx) {
        const chunks = Object.values(ctx.bundle).filter((c) => c.type === 'chunk')
        const chunkOf = (path) => chunks.find((c) => c.facadeModuleId?.replaceAll('\\', '/').endsWith(`/${path}`))
        // A chunk and everything it imports statically
        const filesOf = (chunk, seen = new Set()) => {
          if (!chunk || seen.has(chunk.fileName)) return seen
          seen.add(chunk.fileName)
          for (const f of chunk.imports) filesOf(ctx.bundle[f], seen)
          return seen
        }
        const menu = chunkOf('src/data/menu.js')
        if (!menu) throw new Error('[dk-route-preload] the menu data chunk was not found')
        const routes = ROUTE_FILES.filter(([, page]) => site.classes.enabled === true || !page.includes('Class')).map(([pattern, page, needsMenu]) => {
          const chunk = chunkOf(page)
          if (!chunk) throw new Error(`[dk-route-preload] no chunk for ${page}`)
          const files = filesOf(chunk)
          if (needsMenu) filesOf(menu, files)
          return [pattern, [...files]]
        })
        const notFound = [...filesOf(chunkOf('src/pages/NotFound.jsx'))]
        const script = `<script>(function(){var p=location.pathname.replace(/\\/+$/,'')||'/',r=${JSON.stringify(routes)},f=${JSON.stringify(notFound)};for(var i=0;i<r.length;i++)if(new RegExp(r[i][0]).test(p)){f=r[i][1];break}f.forEach(function(h){var l=document.createElement('link');l.rel='modulepreload';l.crossOrigin='';l.href='/'+h;document.head.appendChild(l)})})()</script>`
        return html.replace('<script type="module"', `${script}\n    <script type="module"`)
      },
    },
  }
}

// sitemap.xml and robots.txt from the data and config (scripts/sitemap.mjs). Build only.
function seoFiles() {
  return {
    name: 'dk-seo-files',
    apply: 'build',
    generateBundle() {
      const opts = { url: site.url, classesEnabled: site.classes.enabled === true }
      this.emitFile({ type: 'asset', fileName: 'sitemap.xml', source: sitemapXml(opts) })
      this.emitFile({ type: 'asset', fileName: 'robots.txt', source: robotsTxt(opts) })
    },
  }
}

// The site runs on Preact through its React compatibility layer: same components, same
// react-router, about 55 KB less JavaScript for every visitor (React + ReactDOM are ~63 KB
// compressed, Preact ~8 KB). Decided in Step 5 to meet the 100 KB first-load target; see
// docs/PROGRESS.md. `react` stays in package.json only because react-router and the build
// plugin declare it as a peer; it is never sent to the browser.
const PREACT = [
  { find: /^react-dom\/client$/, replacement: 'preact/compat/client' },
  { find: /^react-dom\/test-utils$/, replacement: 'preact/test-utils' },
  { find: /^react-dom$/, replacement: 'preact/compat' },
  { find: /^react\/jsx-runtime$/, replacement: 'preact/jsx-runtime' },
  { find: /^react\/jsx-dev-runtime$/, replacement: 'preact/jsx-dev-runtime' },
  { find: /^react$/, replacement: 'preact/compat' },
]

export default defineConfig({
  plugins: [dreamKitchenHtml(), kannadaSplit(), stringsSplit(), kannadaPreload(), routePreload(), seoFiles(), react(), tailwindcss()],
  resolve: { alias: PREACT },
})
