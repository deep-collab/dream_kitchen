// Every business setting lives here. Text shown to customers lives in src/i18n.
// Values marked PLACEHOLDER need Hema's confirmation; empty strings are hidden on the site.
export const site = {
  name: 'Dream Kitchen',
  founder: 'Hema',
  url: 'https://dreamkitchen.netlify.app', // PLACEHOLDER: final domain (Step 5)

  phone: {
    display: '+91 95357 06956',
    short: '95357 06956',
    tel: '+919535706956',
  },
  whatsapp: '919535706956', // country code + number, no "+" (wa.me format)
  instagram: {
    handle: '@dreamkitchen_01_homemade',
    url: 'https://instagram.com/dreamkitchen_01_homemade',
  },
  email: '', // PLACEHOLDER

  // Call hours, 24-hour clock. PLACEHOLDER until Hema confirms.
  hours: { opens: 10, closes: 20, days: 'monSat' },

  // Pre-booking rules (src/lib/dates.js). Dates are always worked out in Indian time,
  // whatever time zone the customer's phone is set to.
  ordering: {
    timeZone: 'Asia/Kolkata',
    businessDays: [1, 2, 3, 4, 5, 6], // Monday to Saturday (0 = Sunday)
    closedDates: [], // Hema's holidays as 'YYYY-MM-DD', e.g. '2026-11-01'. Skipped like Sundays.
    dispatchAfterBusinessDays: 2, // earliest date = this many business days after today
    orderCutoffHour: null, // hook only, unused for now: e.g. 18 = orders after 6 pm count from tomorrow
    dateChoices: 10, // date chips shown at checkout
    maxDaysAhead: 90, // furthest preferred date, in calendar days
  },

  delivery: {
    charge: 50, // PLACEHOLDER: flat charge across Karnataka
    pincodePattern: /^5[6-9]\d{4}$/, // Karnataka pincodes start with 56, 57, 58 or 59
  },

  fssai: '', // PLACEHOLDER: 14-digit licence, shown in the footer once filled
  shelfLife: '', // PLACEHOLDER
}

export const telLink = `tel:${site.phone.tel}`

export const waLink = (text) => `https://wa.me/${site.whatsapp}${text ? `?text=${encodeURIComponent(text)}` : ''}`
