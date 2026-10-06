// Every business setting lives here. Text shown to customers lives in src/i18n.
// UNCONFIRMED = waiting for Hema. Leave those empty (null or '') until she confirms:
// an empty value is hidden everywhere on the site, and every page still reads naturally.

// Hema's mobile number: WhatsApp, the page text and index.html all come from
// this one line. 10 digits, no spaces, no +91. (tests/config.test.js checks that no
// other file spells the number out.)
const PHONE = '9535706956'

export const site = {
  name: 'Dream Kitchen',
  founder: 'Hema',
  url: 'https://dreamkitchen.netlify.app', // TO CONFIRM: final domain (Netlify's own URL variable is used by the server)

  phone: {
    display: `+91 ${PHONE.slice(0, 5)} ${PHONE.slice(5)}`, // "+91 98765 43210" style
    short: `${PHONE.slice(0, 5)} ${PHONE.slice(5)}`, // "98765 43210" style (the customise sheet)
    tel: `+91${PHONE}`, // tel: links
  },
  whatsapp: `91${PHONE}`, // wa.me format: country code + number, no "+"
  // Typed in for the customer by the home page's "Order on WhatsApp" button
  whatsappOrderText: "Hi Dream Kitchen, I'd like to place an order.",
  instagram: {
    handle: '@dreamkitchen_01_homemade',
    url: 'https://instagram.com/dreamkitchen_01_homemade',
  },
  email: '', // UNCONFIRMED: e.g. 'hello@example.com'. Empty = hidden.

  // UNCONFIRMED: call hours, 24-hour clock, e.g. { opens: 10, closes: 20, days: 'monSat' }
  // (10 am – 8 pm, Monday to Saturday). null = no hours are shown anywhere.
  hours: null,

  // Menu, prices, courier, lead times and ordering rules: src/config/shop.js (one file, shared
  // with the server).

  fssai: '', // UNCONFIRMED: 14-digit licence, shown in the footer and on Contact once filled
  shelfLife: '', // UNCONFIRMED (not shown anywhere yet)
}

// QA only, development builds only (production drops this): scripts/qa-*.mjs may set
// window.__dkTestSite before the app loads, e.g. { hours: { opens: 10, closes: 20, days: 'monSat' } },
// to check both ways without editing this file.
if (import.meta.env?.DEV && typeof window !== 'undefined' && window.__dkTestSite) {
  for (const [key, value] of Object.entries(window.__dkTestSite)) {
    site[key] = value && typeof value === 'object' && !Array.isArray(value) && site[key] ? { ...site[key], ...value } : value
  }
}

/** Shown only once Hema confirms them (see UNCONFIRMED above) */
export const hasCallHours = () => Boolean(site.hours)

export const telLink = `tel:${site.phone.tel}`

export const waLink = (text) => `https://wa.me/${site.whatsapp}${text ? `?text=${encodeURIComponent(text)}` : ''}`
