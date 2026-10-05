/*
  Old addresses (Steps 2–5) and where they go now. One list for both:
  - the website (App.jsx sends /product/<old> to the right place), and
  - Netlify's _redirects file, written at build time (vite.config.js), with real 301s so Google
    and old shared links follow them.
  Kept products open their card on the menu (/menu?item=<slug>); removed ones go to their category.
*/

// Old product -> new product (renamed or merged)
export const RENAMED = {
  'ferrero-rocher-nutella-tub': 'ferrero-rocher-nutella-tub',
  'lotus-biscoff-bliss-tub': 'lotus-biscoff-tub',
  'red-velvet-white-chocolate-tub': 'red-velvet-white-chocolate-tub',
  'oreo-overload-tub': 'oreo-overload-tub',
  'red-velvet-delight': 'red-velvet-delight-box',
  'red-velvet-premium-delight': 'red-velvet-delight-box',
  'pista-delight': 'pista-delight-box',
  'pista-premium-delight': 'pista-delight-box',
  'chocolate-delight': 'chocolate-delight-box',
  'mango-delight': 'mango-delight-box',
}

// Old product (removed from the menu) -> the category it belonged to ('' = the menu itself)
export const REMOVED = {
  'nutty-caramel-crunch-tub': 'brownie-tubs',
  'dreamy-biscoff-delight': 'delight-boxes',
  'strawberry-red-velvet-delight': 'delight-boxes',
  'butterscotch-delight': 'delight-boxes',
  'assorted-cookie-dip-box': '',
  'cookie-pie-tin': '',
  'cookie-pie-box': '',
  ...Object.fromEntries(
    [
      'colour-blast-bar',
      'dark-chocolate-bar',
      'milk-chocolate-bar',
      'white-chocolate-bar',
      'strawberry-dark-chocolate-bar',
      'orange-milk-chocolate-bar',
      'cranberry-white-chocolate-bar',
      'hazelnut-dark-chocolate-bar',
      'almond-milk-chocolate-bar',
      'walnut-white-chocolate-bar',
      'coconut-bar',
      'classic-dark-chocolate',
      'classic-milk-chocolate',
      'classic-white-chocolate',
      'classic-caramel-delight',
      'classic-favourite-assortment',
      'classic-dry-fruits',
      'classic-triple-layer-chocolate',
    ].map((slug) => [slug, 'chocolates']),
  ),
}

// Whole pages that moved
export const PAGES = [
  ['/shop', '/menu'],
  ['/about', '/our-story'],
  ['/gallery', '/our-story'],
  ['/classes/booked/*', '/classes'],
]

/** Where an old /product/<slug> address goes now */
export function legacyProductPath(slug) {
  if (RENAMED[slug]) return `/menu?item=${RENAMED[slug]}`
  if (slug in REMOVED) return REMOVED[slug] ? `/menu?c=${REMOVED[slug]}` : '/menu'
  return '/menu'
}

/** The _redirects file: moved pages and every old product address (301), then the app for everything else */
export function redirectsFile() {
  const lines = [
    '# Written at build time from src/config/redirects.js. Do not edit dist/_redirects by hand.',
    ...PAGES.map(([from, to]) => `${from}  ${to}  301`),
    ...[...Object.keys(RENAMED), ...Object.keys(REMOVED)].map((slug) => `/product/${slug}  ${legacyProductPath(slug)}  301`),
    '/product/*  /menu  301',
    '# Hema’s admin is its own page',
    '/admin  /admin/index.html  200',
    '/admin/*  /admin/index.html  200',
    '# Every other address opens the site (it shows its own 404 page)',
    '/*  /index.html  200',
  ]
  return `${lines.join('\n')}\n`
}
