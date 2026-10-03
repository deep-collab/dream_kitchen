// All business details live here. Replace every PLACEHOLDER before going live.
export const site = {
  name: 'Dream Kitchen',
  founder: 'Hema',
  url: 'https://dreamkitchen.netlify.app', // PLACEHOLDER: final domain

  // WhatsApp number WITHOUT +91 and without spaces, e.g. '9876543210'
  whatsapp: '9XXXXXXXXX', // PLACEHOLDER
  email: 'hello@dreamkitchen.example', // PLACEHOLDER
  fssai: 'XXXXXXXXXXXXXX', // PLACEHOLDER: 14-digit FSSAI licence
  shelfLife: 'XX days', // PLACEHOLDER
  region: 'Karnataka',

  social: {
    instagram: 'https://www.instagram.com/dreamkitchen_01_homemade/',
    instagramHandle: '@dreamkitchen_01_homemade',
    facebook: '', // PLACEHOLDER (leave empty to hide)
    youtube: '', // PLACEHOLDER (leave empty to hide)
  },

  delivery: {
    charge: 50, // SAMPLE flat delivery charge in Rs, all over Karnataka
    pincodePattern: /^5[6-9]\d{4}$/, // Karnataka pincodes start with 56, 57, 58 or 59
  },

  // Advance-notice rule
  order: {
    minPieces: 1,
    bulkThreshold: 6, // more than this many pieces in total...
    bulkMinDaysAhead: 2, // ...needs the delivery date at least this many days ahead
    standardMinDaysAhead: 1, // normal orders: earliest delivery is tomorrow (SAMPLE)
    maxDaysAhead: 60,
    idPrefix: 'DK-',
  },
}

export const waLink = (text) =>
  `https://wa.me/91${site.whatsapp}${text ? `?text=${encodeURIComponent(text)}` : ''}`
