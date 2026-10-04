// Every business setting lives here. Text shown to customers lives in src/i18n.
// UNCONFIRMED = waiting for Hema. Leave those empty (null or '') until she confirms:
// an empty value is hidden everywhere on the site, and every page still reads naturally.

// Hema's mobile number: Call, WhatsApp, the page text and index.html all come from
// this one line. 10 digits, no spaces, no +91. (tests/config.test.js checks that no
// other file spells the number out.)
const PHONE = '9535706956'

export const site = {
  name: 'Dream Kitchen',
  founder: 'Hema',
  url: 'https://dreamkitchen.netlify.app', // PLACEHOLDER: final domain (Step 5)

  phone: {
    display: `+91 ${PHONE.slice(0, 5)} ${PHONE.slice(5)}`, // "+91 98765 43210" style
    short: `${PHONE.slice(0, 5)} ${PHONE.slice(5)}`, // "98765 43210" style (the customise sheet)
    tel: `+91${PHONE}`, // tel: links
  },
  whatsapp: `91${PHONE}`, // wa.me format: country code + number, no "+"
  instagram: {
    handle: '@dreamkitchen_01_homemade',
    url: 'https://instagram.com/dreamkitchen_01_homemade',
  },
  email: '', // UNCONFIRMED: e.g. 'hello@example.com'. Empty = hidden.

  // UNCONFIRMED: call hours, 24-hour clock, e.g. { opens: 10, closes: 20, days: 'monSat' }
  // (10 am – 8 pm, Monday to Saturday). null = no hours are shown anywhere.
  hours: null,

  // Pre-booking rules (src/lib/dates.js). Dates are always worked out in Indian time,
  // whatever time zone the customer's phone is set to.
  ordering: {
    timeZone: 'Asia/Kolkata',
    businessDays: [1, 2, 3, 4, 5, 6], // Monday to Saturday (0 = Sunday)
    closedDates: [], // Hema's holidays as 'YYYY-MM-DD', e.g. '2026-11-01'. Skipped like Sundays.
    dispatchAfterBusinessDays: 2, // earliest date = this many business days after today
    orderCutoffHour: null, // hook only, unused for now: e.g. 18 = orders after 6 pm count from tomorrow
    dateChoices: 10, // date chips shown at checkout

    // Checkout form settings. Change them here; no other file needs editing.
    maxDaysAhead: 90, // furthest preferred date a customer can pick, in calendar days
    areaField: 'required', // the "Area or city" field: 'required' | 'optional' | 'off' (hidden)
  },

  // Chocolate classes (src/lib/classes.js). Stage A lists upcoming batches from each
  // class's weekly slot in src/data/classes.js; Stage B reads class_batches instead.
  classes: {
    // The whole Classes part of the site: page, home section, menu and footer links, FAQ
    // answer, sitemap. false until Hema's real classes replace the SAMPLE ones in
    // src/data/classes.js. true = everything works exactly as before.
    enabled: false,
    batchesShown: 4, // upcoming batches listed per class (one per weekend)
    closeDaysBefore: 1, // booking closes this many days before the class day
    peopleMax: 6, // most seats one booking can take (also capped by seats left)
    // UNCONFIRMED: Hema's certificate photo, replacing the "coming soon" note. Put the files in
    // public/ and give the real pixel size, e.g. { src: '/certificate-1200.jpg', width: 1200,
    // height: 900, srcSet: [{ src: '/certificate-600.jpg', width: 600 }, { src: '/certificate-1200.jpg', width: 1200 }] }
    certificateImage: null,
  },

  delivery: {
    // UNCONFIRMED: flat delivery charge across Karnataka in rupees, e.g. 50. null = no charge
    // is shown or added; cart, checkout and the WhatsApp order say Hema confirms it.
    charge: null,
    pincodePattern: /^5[6-9]\d{4}$/, // Karnataka pincodes start with 56, 57, 58 or 59
  },

  fssai: '', // UNCONFIRMED: 14-digit licence, shown in the footer and on Contact once filled
  shelfLife: '', // UNCONFIRMED (not shown anywhere yet)
}

// QA only, development builds only (production drops this): scripts/qa-*.mjs set
// window.__dkTestSite before the app loads, e.g. { classes: { enabled: true } }, to check
// both ways without editing this file.
if (import.meta.env?.DEV && typeof window !== 'undefined' && window.__dkTestSite) {
  for (const [key, value] of Object.entries(window.__dkTestSite)) {
    site[key] = value && typeof value === 'object' && !Array.isArray(value) && site[key] ? { ...site[key], ...value } : value
  }
}

/** Shown only once Hema confirms them (see UNCONFIRMED above) */
export const hasCallHours = () => Boolean(site.hours)
export const hasDeliveryCharge = () => Number.isFinite(site.delivery.charge)
export const classesEnabled = () => site.classes.enabled === true

export const telLink = `tel:${site.phone.tel}`

export const waLink = (text) => `https://wa.me/${site.whatsapp}${text ? `?text=${encodeURIComponent(text)}` : ''}`
