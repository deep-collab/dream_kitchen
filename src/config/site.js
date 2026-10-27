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
  url: 'https://dreamkitcheno1.netlify.app', // THE site address (Netlify project dreamkitcheno1, deploys from main). When the domain is connected, change only this line

  phone: {
    display: `+91 ${PHONE.slice(0, 5)} ${PHONE.slice(5)}`, // "+91 98765 43210" style
    short: `${PHONE.slice(0, 5)} ${PHONE.slice(5)}`, // "98765 43210" style (the customise sheet)
    tel: `+91${PHONE}`, // tel: links
  },
  whatsapp: `91${PHONE}`, // wa.me format: country code + number, no "+"
  // Typed in for the customer by the home page's "Order on WhatsApp" button
  whatsappOrderText: "Hi Dream Kitchen, I'd like to place an order.",
  // Instagram: every link on the site, the prerendered pages and index.html read these two lines
  // (tests/config.test.js checks that no other file spells the address out). The exact profile
  // address, www and trailing slash included, so a phone opens the Instagram app with no redirect.
  instagramHandle: 'dreamkitchen_01_homemade', // shown as "@dreamkitchen_01_homemade" in both languages
  instagramUrl: 'https://www.instagram.com/dreamkitchen_01_homemade/',
  // Business details for Razorpay: shown on Contact, in the footer and on the policy pages
  // (/terms, /refund, /shipping, /privacy). Empty = hidden, so the site never shows a made-up value.
  email: 'dreamkitchen.web01@gmail.com', // also the default order-alert address (netlify/lib/env.mjs)
  address: 'Bengaluru, Karnataka', // city only, by choice: no street or pincode
  jurisdictionCity: 'Bengaluru', // the "governing law" clause in the Terms. Empty = "the competent courts in India"
  deliveryTime: '2–5 business days within Karnataka, 4–7 business days elsewhere in India', // courier time after dispatch (Shipping policy)
  // Courier charges are NOT here: they are Hema's rates in src/config/shop.js (courier.rates), and she
  // can change them in /admin -> Settings. Only the 750 g tub rate is still TO CONFIRM there.
  policiesUpdated: '2026-10-12', // "Last updated" on the policy pages (YYYY-MM-DD): change it whenever a policy changes

  // UNCONFIRMED: call hours, 24-hour clock, e.g. { opens: 10, closes: 20, days: 'monSat' }
  // (10 am – 8 pm, Monday to Saturday). null = no hours are shown anywhere.
  hours: null,

  // Menu, prices, courier, lead times and ordering rules: src/config/shop.js (one file, shared
  // with the server).

  fssai: '', // UNCONFIRMED: 14-digit licence, shown in the footer and on Contact once filled
  shelfLife: '', // UNCONFIRMED (not shown anywhere yet)

  // The logo's words (27 Oct 2026). The Kannada shows instead of "DREAM KITCHEN / HANDMADE
  // CHOCOLATES" when the site is in ಕನ್ನಡ (home hero, header, footer, the popup and the
  // first-visit loading screen), same symbol, gold and layout. Correct the Kannada here (TO
  // CONFIRM: Hema checks the spelling); the English stays as the printed logo. Each is shown on two
  // lines, split at the last space: "ಡ್ರೀಮ್ / ಕಿಚನ್" and "ಕೈಯಿಂದ ಮಾಡಿದ / ಚಾಕೊಲೇಟ್‌ಗಳು". Like the
  // menu, the build moves the Kannada into the Kannada file (scripts/kannada-split.mjs).
  logo: {
    name: { en: 'Dream Kitchen', kn: 'ಡ್ರೀಮ್ ಕಿಚನ್' },
    tagline: { en: 'Handmade Chocolates', kn: 'ಕೈಯಿಂದ ಮಾಡಿದ ಚಾಕೊಲೇಟ್‌ಗಳು' },
  },
}

/** "ಕೈಯಿಂದ ಮಾಡಿದ ಚಾಕೊಲೇಟ್‌ಗಳು" -> ["ಕೈಯಿಂದ ಮಾಡಿದ", "ಚಾಕೊಲೇಟ್‌ಗಳು"]: the logo's two lines (split at the last space) */
export function logoLines(text) {
  const t = String(text || '').trim()
  const i = t.lastIndexOf(' ')
  return i > 0 ? [t.slice(0, i), t.slice(i + 1)] : [t, '']
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
