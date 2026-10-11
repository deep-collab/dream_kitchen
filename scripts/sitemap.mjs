/*
  sitemap.xml and robots.txt, written at build time (vite.config.js). Only the pages people can
  land on from Google; cart, checkout, pay, order pages, the admin and the 404 are left out.
*/
export const STATIC_PATHS = ['/', '/menu', '/customize', '/classes', '/our-story', '/contact', '/faq', '/track', '/terms', '/refund', '/shipping', '/privacy']

export const sitemapPaths = () => STATIC_PATHS

export function sitemapXml({ url }) {
  const base = url.replace(/\/$/, '')
  const rows = sitemapPaths().map((path) => `  <url><loc>${base}${path}</loc></url>`)
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${rows.join('\n')}\n</urlset>\n`
}

export const robotsTxt = ({ url }) => `User-agent: *\nAllow: /\nDisallow: /admin\n\nSitemap: ${url.replace(/\/$/, '')}/sitemap.xml\n`
