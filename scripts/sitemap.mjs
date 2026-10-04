/*
  sitemap.xml and robots.txt, written at build time from the real data and config, so they
  can never list products that don't exist (the old hand-written sitemap did) and follow the
  classes switch. Used by vite.config.js; tests/sitemap.test.js checks the output.
*/
import { products } from '../src/data/products.js'

// Pages people can land on from Google. Cart, checkout, order pages and the 404 are left out.
export const STATIC_PATHS = ['/', '/shop', '/our-story', '/gallery', '/contact', '/faq', '/track']

/** Every public address, in sitemap order. */
export function sitemapPaths({ classesEnabled }) {
  return [
    ...STATIC_PATHS,
    ...(classesEnabled ? ['/classes'] : []),
    ...products.filter((p) => p.active).map((p) => `/product/${p.slug}`),
  ]
}

export function sitemapXml({ url, classesEnabled }) {
  const base = url.replace(/\/$/, '')
  const rows = sitemapPaths({ classesEnabled }).map((path) => `  <url><loc>${base}${path}</loc></url>`)
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${rows.join('\n')}\n</urlset>\n`
}

export const robotsTxt = ({ url }) => `User-agent: *\nAllow: /\n\nSitemap: ${url.replace(/\/$/, '')}/sitemap.xml\n`
