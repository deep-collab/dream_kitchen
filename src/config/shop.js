/*
  THE shop config: Hema's menu, prices, options, courier rates and tiers, lead times and order
  limits. One file, read by the website AND by the server (netlify/functions) through the shared
  pricing module (src/lib/pricing.js), so a total can never differ between the two.

  Rules for editing:
  - Prices are whole rupees. Never invent a price, weight, ingredient or claim.
  - Anything Hema hasn't given is marked TO CONFIRM (search for it). An empty value is hidden.
  - Text is a { en, kn } pair of plain strings (the build moves the Kannada into the Kannada file
    for English visitors). Brand names (Ferrero Rocher, Lotus Biscoff, Oreo, Nutella) stay English.
  - Hema can change prices, sold out, hidden, tub sizes, courier rates and lead times later in
    /admin. Those changes are stored in Supabase and applied on top of this file by the same
    applyOverrides() on both sides. This file stays the starting point (scripts/seed-menu.mjs).

  Source: docs/HEMA-REQUESTS-2026-10-05.md (her diary, 4 voice notes and later confirmations).
*/

/* ---------------- Courier (customer pays; Hema's exact rates) ---------------- */
// One charge per order: the highest rate among the cart's tiers, for the destination zone.
//   small = up to 250 g (everything by default), large = 500 g and 700 g Delight Boxes,
//   xl = 750 g tubs.
export const courier = {
  tiers: ['small', 'large', 'xl'], // lowest first
  rates: {
    small: { karnataka: 90, outside: 100 },
    large: { karnataka: 100, outside: 150 },
    // TO CONFIRM: Hema hasn't given a 750 g rate yet; until she sets one in /admin -> Settings,
    // 750 g tubs pay the 500-700 g rate.
    xl: { karnataka: 100, outside: 150 },
  },
  // Names in Hema's admin (English only)
  tierNames: { small: '250 g', large: '500–700 g', xl: '750 g' },
  // Karnataka = pincodes starting with these two digits. Everything else ships "outside".
  karnatakaPrefixes: ['56', '57', '58', '59'],
}

/* ---------------- Lead times and dispatch dates (Indian time) ---------------- */
export const ordering = {
  timeZone: 'Asia/Kolkata',
  businessDays: [1, 2, 3, 4, 5, 6], // Monday to Saturday (0 = Sunday)
  closedDates: [], // Hema's holidays as 'YYYY-MM-DD'. Skipped like Sundays.
  orderCutoffHour: null, // hook only: e.g. 18 = orders after 6 pm count from tomorrow
  dateChoices: 6, // dispatch date chips shown at checkout
  maxDaysAhead: 60, // furthest preferred dispatch date, in calendar days
}

export const leadTimes = {
  standardBusinessDays: 2, // every order: dispatched after 2 business days (Hema, first brief)
  // TO CONFIRM: extra business days for drawing orders. Hema said drawings need extra time but
  // hasn't said how much. The site's note doesn't state a number, only the earliest date moves.
  drawingExtraBusinessDays: 2,
}

/* ---------------- Order limits (abuse protection) ---------------- */
export const limits = {
  maxQtyPerItem: 10, // one cart line
  maxLines: 20, // different items in one order
  nameOnBoxMax: 20,
  drawingTextMax: 200,
  drawingTextMin: 3,
}

/* ---------------- Options ---------------- */
export const optionPrices = {
  nameOnBox: 0, // free, included in the price (Hema)
  drawing: 450, // Hema's final price: kept high so drawing orders stay few
}

/* ---------------- Payment ---------------- */
export const payment = {
  upi: {
    // TO CONFIRM: Hema's UPI ID, e.g. 'dreamkitchen@okaxis'. Empty = customers see "Payments
    // open soon" and can't pay; admin shows a red warning. Can also be set in /admin -> Settings
    // or the UPI_ID environment variable on Netlify.
    id: '',
    payeeName: 'Dream Kitchen',
    // TO CONFIRM: Hema's UPI QR image in public/, e.g. '/upi-qr.png'. Can also be uploaded in /admin.
    qrImage: '',
  },
  // Razorpay (cards, UPI, net banking with automatic confirmation) is built but OFF. It turns on
  // only when RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET exist in the Netlify environment variables.
}

/* ---------------- Categories (menu tabs, in order) ---------------- */
export const categories = [
  { id: 'brownie-tubs', sort: 1, art: 'tub', name: { en: 'Brownie Tubs', kn: 'ಬ್ರೌನಿ ಟಬ್‌ಗಳು' }, tab: { en: 'Tubs', kn: 'ಟಬ್‌ಗಳು' } },
  { id: 'delight-boxes', sort: 2, art: 'delight-box', name: { en: 'Delight Boxes', kn: 'ಡಿಲೈಟ್ ಬಾಕ್ಸ್‌ಗಳು' }, tab: { en: 'Delight Boxes', kn: 'ಡಿಲೈಟ್ ಬಾಕ್ಸ್‌ಗಳು' } },
  {
    id: 'brownies',
    sort: 3,
    art: 'brownie-box',
    name: { en: 'Brownies', kn: 'ಬ್ರೌನಿಗಳು' },
    tab: { en: 'Brownies', kn: 'ಬ್ರೌನಿಗಳು' },
    note: { en: '5 pieces in every box', kn: 'ಪ್ರತಿ ಬಾಕ್ಸ್‌ನಲ್ಲಿ 5 ತುಂಡುಗಳು' },
  },
  { id: 'chocolates', sort: 4, art: 'bar', name: { en: 'Chocolates', kn: 'ಚಾಕೊಲೇಟ್‌ಗಳು' }, tab: { en: 'Chocolates', kn: 'ಚಾಕೊಲೇಟ್‌ಗಳು' } },
  // Customize-only items (the Drawing Chocolate Bar): never a menu tab
  { id: 'customize', sort: 9, art: 'drawing-bar', name: { en: 'Customize', kn: 'ಕಸ್ಟಮೈಸ್' }, hidden: true },
]

/* ---------------- Customize page tiles (Hema can change their photos in admin -> Menu) ---------------- */
// photoOf: the product whose photo the tile shows until Hema gives the tile its own.
export const customizeTiles = [
  { id: 'delight-box', photoOf: 'red-velvet-delight-box', art: 'delight-box', adminName: 'Delight Box with a name or a drawing' },
  { id: 'drawing-bar', photoOf: 'drawing-chocolate-bar', art: 'drawing-bar', adminName: 'Drawing Chocolate Bar' },
]

/* ---------------- Brownie ingredients (Hema confirmed; names only, never quantities) ---------------- */
const BROWNIE_BASE = [
  { en: 'Maida (refined flour)', kn: 'ಮೈದಾ (ಸಂಸ್ಕರಿಸಿದ ಹಿಟ್ಟು)' },
  { en: 'Dark chocolate', kn: 'ಡಾರ್ಕ್ ಚಾಕೊಲೇಟ್' },
  { en: 'Butter', kn: 'ಬೆಣ್ಣೆ' },
  { en: 'Cocoa powder', kn: 'ಕೋಕೋ ಪುಡಿ' },
  { en: 'Powdered sugar', kn: 'ಸಕ್ಕರೆ ಪುಡಿ' },
  { en: 'Eggs', kn: 'ಮೊಟ್ಟೆ' },
  { en: 'Essence', kn: 'ಎಸೆನ್ಸ್' },
]
export const brownieInfo = {
  base: BROWNIE_BASE,
  ragiSwap: { from: 'Maida (refined flour)', to: { en: 'Ragi flour', kn: 'ರಾಗಿ ಹಿಟ್ಟು' } }, // ragi version: ragi flour instead of maida
  contains: { en: 'Contains: egg, dairy, gluten, nuts where used.', kn: 'ಇದರಲ್ಲಿ: ಮೊಟ್ಟೆ, ಹಾಲಿನ ಉತ್ಪನ್ನ, ಗ್ಲುಟೆನ್, ಬಳಸಿದಲ್ಲಿ ಬೀಜಗಳು.' },
  // TO CONFIRM: is the ragi version gluten-free? Until Hema confirms, the ragi line says it's not confirmed.
  ragiGlutenFree: null,
}

/* ---------------- Products ---------------- */
// sizes: [{ id, grams, price, courierTier }]; label comes from grams (or `label`).
// price: fixed price when there are no sizes. priceStatus: 'live' | 'coming-soon'.
// options.name / options.drawing: Delight Box customisations. options.drawing === 'included':
// the drawing is the product (Drawing Chocolate Bar), so a description is required.
// ragiPrice: "Make it Ragi" extra. courierTier: 'small' unless a size says otherwise.
// showWeight: the only weights shown (Hema's choice): Delight Box sizes and the Pista Bar.
// menu: false = listed only on the Customize page.
// A tub's courier tier from its weight: 750 g and more = xl, the rest small
export const tubTier = (grams) => (grams >= 750 ? 'xl' : 'small')
const tub = (id, sort, name, description, sizes, extra = {}) => ({
  id,
  slug: id,
  category: 'brownie-tubs',
  sort,
  name,
  description,
  art: 'tub',
  courierTier: 'small',
  // TO CONFIRM: tub sizes and prices. These are from Hema's first menu (BUILD_BRIEF.md); her new
  // diary didn't give them. Set priceStatus: 'coming-soon' to hide a price and turn off its Add to cart.
  priceStatus: sizes ? 'live' : 'coming-soon',
  toConfirm: 'Tub sizes and prices',
  sizes: (sizes || []).map(([grams, price]) => ({ id: `${grams}g`, grams, price, courierTier: tubTier(grams) })),
  showWeight: true, // TO CONFIRM: the old tub sizes are weights; Hema's new rule shows weights only for Delight Boxes and the Pista Bar
  ...extra,
})

const delight = (id, sort, name, [p250, p500, p700]) => ({
  id,
  slug: id,
  category: 'delight-boxes',
  sort,
  name,
  art: 'delight-box',
  courierTier: 'small',
  priceStatus: 'live',
  showWeight: true,
  sizes: [
    { id: '250g', grams: 250, price: p250, courierTier: 'small' },
    { id: '500g', grams: 500, price: p500, courierTier: 'large' },
    { id: '700g', grams: 700, price: p700, courierTier: 'large' },
  ],
  options: { name: true, drawing: true },
})

const brownie = (id, sort, name, price, ragiPrice, topping) => ({
  id,
  slug: id,
  category: 'brownies',
  sort,
  name,
  art: 'brownie-box',
  courierTier: 'small',
  priceStatus: 'live',
  price,
  ragiPrice,
  topping,
})

export const products = [
  /* Brownie Tubs */
  tub(
    'ferrero-rocher-nutella-tub',
    1,
    { en: 'Ferrero Rocher Nutella Tub', kn: 'Ferrero Rocher Nutella ಟಬ್' },
    {
      en: 'Rich fudgy brownies layered with creamy Nutella & topped with Ferrero Rocher.',
      kn: 'ಕ್ರೀಮಿ Nutella ಪದರಗಳಿರುವ ಸಮೃದ್ಧ ಫಡ್ಜಿ ಬ್ರೌನಿಗಳು, ಮೇಲೆ Ferrero Rocher.',
    },
    [
      [250, 549],
      [500, 999],
      [750, 1499],
    ],
  ),
  tub(
    'lotus-biscoff-tub',
    2,
    { en: 'Lotus Biscoff Tub', kn: 'Lotus Biscoff ಟಬ್' },
    {
      en: 'Fudgy chocolate brownies layered with smooth Biscoff spread & crunchy Lotus Biscoff biscuits.',
      kn: 'ಮೃದುವಾದ Biscoff ಸ್ಪ್ರೆಡ್ ಮತ್ತು ಕುರುಕಲು Lotus Biscoff ಬಿಸ್ಕತ್ತುಗಳ ಪದರಗಳಿರುವ ಫಡ್ಜಿ ಚಾಕೊಲೇಟ್ ಬ್ರೌನಿಗಳು.',
    },
    [
      [250, 449],
      [500, 799],
      [750, 1149],
    ],
  ),
  tub(
    'red-velvet-white-chocolate-tub',
    3,
    { en: 'Red Velvet White Chocolate Tub', kn: 'ರೆಡ್ ವೆಲ್ವೆಟ್ ವೈಟ್ ಚಾಕೊಲೇಟ್ ಟಬ್' },
    {
      en: 'Soft red velvet brownies paired with silky white chocolate ganache.',
      kn: 'ಮೃದುವಾದ ರೆಡ್ ವೆಲ್ವೆಟ್ ಬ್ರೌನಿಗಳ ಜೊತೆ ನಯವಾದ ವೈಟ್ ಚಾಕೊಲೇಟ್ ಗನಾಶ್.',
    },
    [
      [250, 449],
      [500, 799],
      [750, 1149],
    ],
  ),
  tub(
    'oreo-overload-tub',
    4,
    { en: 'Oreo Overload Tub', kn: 'Oreo ಓವರ್‌ಲೋಡ್ ಟಬ್' },
    {
      en: 'Rich fudgy brownies loaded with Oreo chunks & chocolate drizzle.',
      kn: 'Oreo ತುಂಡುಗಳು ಮತ್ತು ಚಾಕೊಲೇಟ್ ಡ್ರಿಜಲ್ ತುಂಬಿದ ಸಮೃದ್ಧ ಫಡ್ಜಿ ಬ್ರೌನಿಗಳು.',
    },
    [
      [250, 399],
      [500, 699],
      [750, 999],
    ],
  ),
  // TO CONFIRM: Dream Cake Tub sizes, prices and description (new in her diary; none given yet)
  tub('dream-cake-tub', 5, { en: 'Dream Cake Tub', kn: 'ಡ್ರೀಮ್ ಕೇಕ್ ಟಬ್' }, null, null),

  /* Delight Boxes ("Butter" was crossed out in her diary: not on the menu) */
  delight('red-velvet-delight-box', 1, { en: 'Red Velvet Delight Box', kn: 'ರೆಡ್ ವೆಲ್ವೆಟ್ ಡಿಲೈಟ್ ಬಾಕ್ಸ್' }, [650, 1250, 1900]),
  delight('chocolate-delight-box', 2, { en: 'Chocolate Delight Box', kn: 'ಚಾಕೊಲೇಟ್ ಡಿಲೈಟ್ ಬಾಕ್ಸ್' }, [650, 1250, 1900]),
  delight('mango-delight-box', 3, { en: 'Mango Delight Box', kn: 'ಮಾವಿನ ಡಿಲೈಟ್ ಬಾಕ್ಸ್' }, [650, 1250, 1900]),
  delight('pista-delight-box', 4, { en: 'Pista Delight Box', kn: 'ಪಿಸ್ತಾ ಡಿಲೈಟ್ ಬಾಕ್ಸ್' }, [750, 1500, 2250]),

  /* Brownies: 5 pieces per box. Ragi version +₹50 (+₹80 for Assorted) */
  brownie('plain-brownies', 1, { en: 'Plain Brownies', kn: 'ಪ್ಲೇನ್ ಬ್ರೌನಿಗಳು' }, 350, 50, null),
  brownie('nutty-brownies', 2, { en: 'Nutty Brownies', kn: 'ನಟ್ಟಿ ಬ್ರೌನಿಗಳು' }, 549, 50, { en: 'Mixed nuts', kn: 'ಮಿಶ್ರ ಬೀಜಗಳು' }),
  brownie('nutella-brownies', 3, { en: 'Nutella Brownies', kn: 'Nutella ಬ್ರೌನಿಗಳು' }, 549, 50, { en: 'Nutella', kn: 'Nutella' }),
  brownie('walnut-brownies', 4, { en: 'Walnut Brownies', kn: 'ವಾಲ್‌ನಟ್ ಬ್ರೌನಿಗಳು' }, 650, 50, { en: 'Walnuts', kn: 'ವಾಲ್‌ನಟ್' }),
  brownie('assorted-brownies', 5, { en: 'Assorted Brownies', kn: 'ಅಸಾರ್ಟೆಡ್ ಬ್ರೌನಿಗಳು' }, 700, 80, { en: 'A mix of the flavours', kn: 'ಎಲ್ಲಾ ರುಚಿಗಳ ಮಿಶ್ರಣ' }),

  /* Chocolates: only these two (every other bar and the 3-bar offer were removed) */
  {
    id: 'pista-bar',
    slug: 'pista-bar',
    category: 'chocolates',
    sort: 1,
    name: { en: 'Pista Bar', kn: 'ಪಿಸ್ತಾ ಬಾರ್' },
    art: 'bar',
    courierTier: 'small',
    priceStatus: 'live',
    price: 450,
    grams: 250, // shown: Hema's choice
    showWeight: true,
  },
  {
    id: 'almond-bar',
    slug: 'almond-bar',
    category: 'chocolates',
    sort: 2,
    name: { en: 'Almond Bar', kn: 'ಬಾದಾಮಿ ಬಾರ್' },
    art: 'bar',
    courierTier: 'small',
    priceStatus: 'live',
    price: 150, // no weight shown (Hema)
  },

  /* Customize page only ("show it, but not as a priority") */
  {
    id: 'drawing-chocolate-bar',
    slug: 'drawing-chocolate-bar',
    category: 'customize',
    sort: 1,
    menu: false,
    name: { en: 'Drawing Chocolate Bar', kn: 'ಡ್ರಾಯಿಂಗ್ ಚಾಕೊಲೇಟ್ ಬಾರ್' },
    art: 'drawing-bar',
    courierTier: 'small',
    priceStatus: 'live',
    price: 950,
    options: { drawing: 'included' },
  },
].map((p) => ({ active: true, soldOut: false, options: {}, ...p }))
