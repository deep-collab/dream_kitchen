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

  // Pre-booking: dispatch after N business days (Mon–Sat)
  ordering: {
    dispatchBusinessDays: 2,
    businessDays: [1, 2, 3, 4, 5, 6], // 0 = Sunday
  },

  delivery: {
    charge: 50, // PLACEHOLDER
    pincodePattern: /^5[6-9]\d{4}$/, // Karnataka pincodes start with 56, 57, 58 or 59
  },

  fssai: '', // PLACEHOLDER: 14-digit licence, shown in the footer once filled
  shelfLife: '', // PLACEHOLDER

  // LEGACY (old sample checkout, replaced in Step 3). Do not build on these.
  order: {
    minPieces: 1,
    bulkThreshold: 6,
    bulkMinDaysAhead: 2,
    standardMinDaysAhead: 1,
    maxDaysAhead: 60,
    idPrefix: 'DK-',
  },
}

export const telLink = `tel:${site.phone.tel}`

export const waLink = (text) => `https://wa.me/${site.whatsapp}${text ? `?text=${encodeURIComponent(text)}` : ''}`
