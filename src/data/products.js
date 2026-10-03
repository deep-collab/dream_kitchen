/*
  Hema's menu: 35 products, prices and words exactly as she gave them
  (BUILD_BRIEF.md, "Menu"; spelling fixed only). Shaped like the Stage B
  Supabase table `products` (optionGroups become `product_option_groups` +
  `product_option_choices`). Brand names stay English in both languages.
  Never invent items, prices, badges or claims here.
*/

/** @typedef {{ en: string, kn: string }} I18nText */

/**
 * @typedef {Object} OptionChoice
 * @property {string} id
 * @property {I18nText} label
 * @property {number} [price]      size choices: the full price for that size
 * @property {number} [grams]      size choices
 * @property {number} [priceDelta] flavour choices: extra cost (always 0 on her menu)
 */

/**
 * @typedef {Object} OptionGroup
 * @property {'size'|'flavour'} id
 * @property {'single'} type
 * @property {boolean} required
 * @property {OptionChoice[]} choices
 */

/**
 * @typedef {Object} Product
 * @property {string} id
 * @property {string} slug
 * @property {string} categoryId
 * @property {string} sectionId
 * @property {number} sort
 * @property {I18nText} name
 * @property {I18nText|null} description   her words only; null when she gave none
 * @property {I18nText[]} [includes]       what is inside (Assorted Cookie Dip Box)
 * @property {Array<'signature'|'top-selling'>} badges
 * @property {string} image                illustration key (see components/art)
 * @property {boolean} active
 * @property {boolean} soldOut
 * @property {boolean} nameCustomisation
 * @property {number} nameCustomisationPrice
 * @property {number} [price]              fixed-price items
 * @property {number} [grams]              fixed-price items with a stated weight
 * @property {number} [pricePerKg]         Classic Favourites: her per-kg rate
 * @property {OptionGroup[]} optionGroups
 */

const g = (grams) => ({ en: grams >= 1000 ? `${grams / 1000}kg` : `${grams}g`, kn: grams >= 1000 ? `${grams / 1000} ಕೆ.ಜಿ` : `${grams} ಗ್ರಾಂ` })

/** Size group from [grams, price] pairs, in the order she lists them */
const sizes = (...pairs) => ({
  id: 'size',
  type: 'single',
  required: true,
  choices: pairs.map(([grams, price]) => ({ id: grams >= 1000 ? `${grams / 1000}kg` : `${grams}g`, label: g(grams), price, grams })),
})

/** Flavour group (no extra cost on any of her flavours) */
const flavours = (...list) => ({
  id: 'flavour',
  type: 'single',
  required: true,
  choices: list.map(([id, en, kn]) => ({ id, label: { en, kn }, priceDelta: 0 })),
})

const base = { badges: [], active: true, soldOut: false, nameCustomisationPrice: 100, description: null, optionGroups: [] }

/** @type {Product[]} */
export const products = [
  /* ---------------- Brownie Tubs ---------------- */
  {
    ...base,
    id: 'ferrero-rocher-nutella-tub',
    slug: 'ferrero-rocher-nutella-tub',
    categoryId: 'brownie-tubs',
    sectionId: 'brownie-tubs',
    sort: 1,
    name: { en: 'Ferrero Rocher Nutella', kn: 'Ferrero Rocher Nutella' },
    description: {
      en: 'Our signature indulgence! Rich fudgy brownies layered with creamy Nutella & topped with luxurious Ferrero Rocher.',
      kn: 'ನಮ್ಮ ಸಿಗ್ನೇಚರ್ ಸವಿ! ಕ್ರೀಮಿ Nutella ಪದರಗಳಿರುವ ಸಮೃದ್ಧ ಫಡ್ಜಿ ಬ್ರೌನಿಗಳು, ಮೇಲೆ ಐಷಾರಾಮಿ Ferrero Rocher.',
    },
    badges: ['signature'],
    image: 'tub',
    nameCustomisation: true,
    optionGroups: [sizes([250, 549], [500, 999], [750, 1499])],
  },
  {
    ...base,
    id: 'lotus-biscoff-bliss-tub',
    slug: 'lotus-biscoff-bliss-tub',
    categoryId: 'brownie-tubs',
    sectionId: 'brownie-tubs',
    sort: 2,
    name: { en: 'Lotus Biscoff Bliss', kn: 'Lotus Biscoff ಬ್ಲಿಸ್' },
    description: {
      en: 'Fudgy chocolate brownies layered with smooth Biscoff spread & crunchy Lotus Biscoff biscuits.',
      kn: 'ಮೃದುವಾದ Biscoff ಸ್ಪ್ರೆಡ್ ಮತ್ತು ಕುರುಕಲು Lotus Biscoff ಬಿಸ್ಕತ್ತುಗಳ ಪದರಗಳಿರುವ ಫಡ್ಜಿ ಚಾಕೊಲೇಟ್ ಬ್ರೌನಿಗಳು.',
    },
    image: 'tub',
    nameCustomisation: true,
    optionGroups: [sizes([250, 449], [500, 799], [750, 1149])],
  },
  {
    ...base,
    id: 'red-velvet-white-chocolate-tub',
    slug: 'red-velvet-white-chocolate-tub',
    categoryId: 'brownie-tubs',
    sectionId: 'brownie-tubs',
    sort: 3,
    name: { en: 'Red Velvet White Chocolate', kn: 'ರೆಡ್ ವೆಲ್ವೆಟ್ ವೈಟ್ ಚಾಕೊಲೇಟ್' },
    description: {
      en: 'Soft red velvet brownies paired with silky white chocolate ganache for a rich & elegant treat.',
      kn: 'ಮೃದುವಾದ ರೆಡ್ ವೆಲ್ವೆಟ್ ಬ್ರೌನಿಗಳ ಜೊತೆ ನಯವಾದ ವೈಟ್ ಚಾಕೊಲೇಟ್ ಗನಾಶ್, ಸಮೃದ್ಧ ಮತ್ತು ಸೊಗಸಾದ ಸವಿ.',
    },
    image: 'tub',
    nameCustomisation: true,
    optionGroups: [sizes([250, 449], [500, 799], [750, 1149])],
  },
  {
    ...base,
    id: 'oreo-overload-tub',
    slug: 'oreo-overload-tub',
    categoryId: 'brownie-tubs',
    sectionId: 'brownie-tubs',
    sort: 4,
    name: { en: 'Oreo Overload', kn: 'Oreo ಓವರ್‌ಲೋಡ್' },
    description: {
      en: 'Rich fudgy brownies loaded with Oreo chunks, chocolate drizzle & creamy goodness in every spoonful.',
      kn: 'Oreo ತುಂಡುಗಳು, ಚಾಕೊಲೇಟ್ ಡ್ರಿಜಲ್ ಮತ್ತು ಪ್ರತಿ ಚಮಚದಲ್ಲೂ ಕ್ರೀಮಿ ರುಚಿ ತುಂಬಿದ ಸಮೃದ್ಧ ಫಡ್ಜಿ ಬ್ರೌನಿಗಳು.',
    },
    image: 'tub',
    nameCustomisation: true,
    optionGroups: [sizes([250, 399], [500, 699], [750, 999])],
  },
  {
    ...base,
    id: 'nutty-caramel-crunch-tub',
    slug: 'nutty-caramel-crunch-tub',
    categoryId: 'brownie-tubs',
    sectionId: 'brownie-tubs',
    sort: 5,
    name: { en: 'Nutty Caramel Crunch', kn: 'ನಟ್ಟಿ ಕ್ಯಾರಮೆಲ್ ಕ್ರಂಚ್' },
    description: {
      en: 'Decadent fudgy brownies topped with buttery caramel & crunchy roasted nuts — the perfect sweet & nutty combination!',
      kn: 'ಬೆಣ್ಣೆಯಂತಹ ಕ್ಯಾರಮೆಲ್ ಮತ್ತು ಕುರುಕಲು ಹುರಿದ ಬೀಜಗಳಿಂದ ಅಲಂಕರಿಸಿದ ಸಮೃದ್ಧ ಫಡ್ಜಿ ಬ್ರೌನಿಗಳು. ಸಿಹಿ ಮತ್ತು ಬೀಜಗಳ ಅದ್ಭುತ ಜೋಡಿ!',
    },
    image: 'tub',
    nameCustomisation: true,
    optionGroups: [sizes([250, 429], [500, 749], [750, 1049])],
  },

  /* ---------------- Delight Boxes ---------------- */
  {
    ...base,
    id: 'dreamy-biscoff-delight',
    slug: 'dreamy-biscoff-delight',
    categoryId: 'delight-boxes',
    sectionId: 'dreamy-biscoff',
    sort: 1,
    name: { en: 'Dreamy Biscoff Delight', kn: 'ಡ್ರೀಮಿ Biscoff ಡಿಲೈಟ್' },
    description: { en: 'Perfect for personal cravings & gifting!', kn: 'ನಿಮ್ಮ ಸ್ವಂತ ಬಯಕೆಗೂ ಉಡುಗೊರೆಗೂ ಸೂಕ್ತ!' },
    image: 'delight-box',
    nameCustomisation: true,
    price: 550,
    grams: 250,
    optionGroups: [
      flavours(['chocolate', 'Chocolate', 'ಚಾಕೊಲೇಟ್'], ['strawberry', 'Strawberry', 'ಸ್ಟ್ರಾಬೆರಿ'], ['mango', 'Mango', 'ಮಾವು'], ['butterscotch', 'Butterscotch', 'ಬಟರ್‌ಸ್ಕಾಚ್']),
    ],
  },
  {
    ...base,
    id: 'red-velvet-delight',
    slug: 'red-velvet-delight',
    categoryId: 'delight-boxes',
    sectionId: 'premium-delight',
    sort: 2,
    name: { en: 'Red Velvet Delight', kn: 'ರೆಡ್ ವೆಲ್ವೆಟ್ ಡಿಲೈಟ್' },
    description: { en: 'Rich, creamy & indulgent!', kn: 'ಸಮೃದ್ಧ, ಕ್ರೀಮಿ ಮತ್ತು ಮನಸೆಳೆಯುವ ಸವಿ!' },
    image: 'delight-box',
    nameCustomisation: true,
    price: 950,
    grams: 250,
  },
  {
    ...base,
    id: 'pista-delight',
    slug: 'pista-delight',
    categoryId: 'delight-boxes',
    sectionId: 'premium-delight',
    sort: 3,
    name: { en: 'Pista Delight', kn: 'ಪಿಸ್ತಾ ಡಿಲೈಟ್' },
    description: { en: 'Nutty, smooth & luxurious!', kn: 'ಪಿಸ್ತಾದ ಸವಿ, ನಯ ಮತ್ತು ಐಷಾರಾಮಿ!' },
    image: 'delight-box',
    nameCustomisation: true,
    price: 950,
    grams: 250,
  },
  {
    ...base,
    id: 'chocolate-delight',
    slug: 'chocolate-delight',
    categoryId: 'delight-boxes',
    sectionId: 'best-sellers',
    sort: 4,
    name: { en: 'Chocolate Delight', kn: 'ಚಾಕೊಲೇಟ್ ಡಿಲೈಟ್' },
    description: {
      en: 'Fudgy brownie layers with Lotus Biscoff, a rich dark chocolate layer, topped with pista & white chocolate.',
      kn: 'Lotus Biscoff ಜೊತೆ ಫಡ್ಜಿ ಬ್ರೌನಿ ಪದರಗಳು, ಸಮೃದ್ಧ ಡಾರ್ಕ್ ಚಾಕೊಲೇಟ್ ಪದರ, ಮೇಲೆ ಪಿಸ್ತಾ ಮತ್ತು ವೈಟ್ ಚಾಕೊಲೇಟ್.',
    },
    image: 'delight-box',
    nameCustomisation: true,
    optionGroups: [sizes([500, 950], [700, 1100])],
  },
  {
    ...base,
    id: 'strawberry-red-velvet-delight',
    slug: 'strawberry-red-velvet-delight',
    categoryId: 'delight-boxes',
    sectionId: 'best-sellers',
    sort: 5,
    name: { en: 'Strawberry Red Velvet Delight', kn: 'ಸ್ಟ್ರಾಬೆರಿ ರೆಡ್ ವೆಲ್ವೆಟ್ ಡಿಲೈಟ್' },
    image: 'delight-box',
    nameCustomisation: true,
    optionGroups: [sizes([500, 950], [700, 1100])],
  },
  {
    ...base,
    id: 'mango-delight',
    slug: 'mango-delight',
    categoryId: 'delight-boxes',
    sectionId: 'best-sellers',
    sort: 6,
    name: { en: 'Mango Delight', kn: 'ಮಾವಿನ ಡಿಲೈಟ್' },
    image: 'delight-box',
    nameCustomisation: true,
    optionGroups: [sizes([500, 950], [700, 1100])],
  },
  {
    ...base,
    id: 'butterscotch-delight',
    slug: 'butterscotch-delight',
    categoryId: 'delight-boxes',
    sectionId: 'best-sellers',
    sort: 7,
    name: { en: 'Butterscotch Delight', kn: 'ಬಟರ್‌ಸ್ಕಾಚ್ ಡಿಲೈಟ್' },
    image: 'delight-box',
    nameCustomisation: true,
    optionGroups: [sizes([500, 950], [700, 1100])],
  },
  {
    ...base,
    id: 'red-velvet-premium-delight',
    slug: 'red-velvet-premium-delight',
    categoryId: 'delight-boxes',
    sectionId: 'best-sellers',
    sort: 8,
    name: { en: 'Red Velvet Premium Delight', kn: 'ರೆಡ್ ವೆಲ್ವೆಟ್ ಪ್ರೀಮಿಯಂ ಡಿಲೈಟ್' },
    image: 'delight-box',
    nameCustomisation: true,
    optionGroups: [sizes([500, 1800], [700, 2100])],
  },
  {
    ...base,
    id: 'pista-premium-delight',
    slug: 'pista-premium-delight',
    categoryId: 'delight-boxes',
    sectionId: 'best-sellers',
    sort: 9,
    name: { en: 'Pista Premium Delight', kn: 'ಪಿಸ್ತಾ ಪ್ರೀಮಿಯಂ ಡಿಲೈಟ್' },
    image: 'delight-box',
    nameCustomisation: true,
    optionGroups: [sizes([500, 1800], [700, 2400])],
  },

  /* ---------------- Cookies ---------------- */
  {
    ...base,
    id: 'assorted-cookie-dip-box',
    slug: 'assorted-cookie-dip-box',
    categoryId: 'cookies',
    sectionId: 'cookies',
    sort: 1,
    name: { en: 'Assorted Cookie Dip Box', kn: 'ಅಸಾರ್ಟೆಡ್ ಕುಕೀ ಡಿಪ್ ಬಾಕ್ಸ್' },
    description: {
      en: 'A delightful mix of handcrafted cookies paired with rich chocolate and Nutella dips. Packed in a premium reusable tin box. Perfect for gifting, celebrations, tea-time treats, and chocolate lovers.',
      kn: 'ಸಮೃದ್ಧ ಚಾಕೊಲೇಟ್ ಮತ್ತು Nutella ಡಿಪ್‌ಗಳ ಜೊತೆ ಕೈಯಾರೆ ಮಾಡಿದ ಬಗೆಬಗೆಯ ಕುಕೀಸ್. ಮರುಬಳಕೆ ಮಾಡಬಹುದಾದ ಪ್ರೀಮಿಯಂ ಟಿನ್ ಬಾಕ್ಸ್‌ನಲ್ಲಿ ಪ್ಯಾಕ್ ಮಾಡಲಾಗುತ್ತದೆ. ಉಡುಗೊರೆ, ಸಂಭ್ರಮ, ಚಹಾ ಸಮಯ ಮತ್ತು ಚಾಕೊಲೇಟ್ ಪ್ರಿಯರಿಗೆ ಸೂಕ್ತ.',
    },
    includes: [
      { en: 'Chocolate cookies', kn: 'ಚಾಕೊಲೇಟ್ ಕುಕೀಸ್' },
      { en: 'Red velvet cookies', kn: 'ರೆಡ್ ವೆಲ್ವೆಟ್ ಕುಕೀಸ್' },
      { en: 'Pista cookies', kn: 'ಪಿಸ್ತಾ ಕುಕೀಸ್' },
      { en: 'Chocolate chip cookies', kn: 'ಚಾಕೊಲೇಟ್ ಚಿಪ್ ಕುಕೀಸ್' },
      { en: 'Chocolate dip', kn: 'ಚಾಕೊಲೇಟ್ ಡಿಪ್' },
      { en: 'Nutella dip', kn: 'Nutella ಡಿಪ್' },
    ],
    image: 'cookie-dip-tin',
    nameCustomisation: true,
    optionGroups: [sizes([250, 349], [500, 599], [750, 849])],
  },
  {
    ...base,
    id: 'cookie-pie-tin',
    slug: 'cookie-pie-tin',
    categoryId: 'cookies',
    sectionId: 'cookies',
    sort: 2,
    name: { en: 'Cookie Pie Tin', kn: 'ಕುಕೀ ಪೈ ಟಿನ್' },
    description: {
      en: 'A rich assortment of freshly baked, soft, gooey cookie pie.',
      kn: 'ತಾಜಾವಾಗಿ ಬೇಕ್ ಮಾಡಿದ, ಮೃದುವಾದ, ಗೂಯಿ ಕುಕೀ ಪೈಯ ಸಮೃದ್ಧ ಸಂಗ್ರಹ.',
    },
    image: 'cookie-pie-tin',
    nameCustomisation: true,
    optionGroups: [sizes([500, 950], [750, 1100])],
  },
  {
    ...base,
    id: 'cookie-pie-box',
    slug: 'cookie-pie-box',
    categoryId: 'cookies',
    sectionId: 'cookies',
    sort: 3,
    name: { en: 'Cookie Pie Box', kn: 'ಕುಕೀ ಪೈ ಬಾಕ್ಸ್' },
    description: { en: 'Single serving (1 box).', kn: 'ಒಬ್ಬರಿಗೆ ಸಾಕಾಗುವಷ್ಟು (1 ಬಾಕ್ಸ್).' },
    image: 'cookie-pie-box',
    nameCustomisation: false,
    price: 250,
  },

  /* ---------------- Chocolates: Colour Blast Bars ---------------- */
  {
    ...base,
    id: 'colour-blast-bar',
    slug: 'colour-blast-bar',
    categoryId: 'chocolates',
    sectionId: 'colour-blast',
    sort: 1,
    name: { en: 'Colour Blast Bar', kn: 'ಕಲರ್ ಬ್ಲಾಸ್ಟ್ ಬಾರ್' },
    image: 'colour-blast',
    nameCustomisation: false,
    price: 150,
    optionGroups: [
      flavours(
        ['marble-chocolate', 'Marble Chocolate', 'ಮಾರ್ಬಲ್ ಚಾಕೊಲೇಟ್'],
        ['almond', 'Almond', 'ಬಾದಾಮಿ'],
        ['dates', 'Dates', 'ಖರ್ಜೂರ'],
        ['roasted-almonds', 'Roasted Almonds', 'ಹುರಿದ ಬಾದಾಮಿ'],
        ['waffle', 'Waffle', 'ವಾಫಲ್'],
        ['raisin', 'Raisin', 'ಒಣದ್ರಾಕ್ಷಿ'],
        ['coffee', 'Coffee', 'ಕಾಫಿ'],
        ['ferrero-rocher', 'Ferrero Rocher', 'Ferrero Rocher'],
        ['coconut', 'Coconut', 'ತೆಂಗಿನಕಾಯಿ'],
      ),
    ],
  },

  /* ---------------- Chocolates: Chocolate Bars ---------------- */
  ...[
    ['dark-chocolate-bar', 'Dark Chocolate', 'ಡಾರ್ಕ್ ಚಾಕೊಲೇಟ್', 150],
    ['milk-chocolate-bar', 'Milk Chocolate', 'ಮಿಲ್ಕ್ ಚಾಕೊಲೇಟ್', 150],
    ['white-chocolate-bar', 'White Chocolate', 'ವೈಟ್ ಚಾಕೊಲೇಟ್', 200],
    ['strawberry-dark-chocolate-bar', 'Strawberry Dark Chocolate', 'ಸ್ಟ್ರಾಬೆರಿ ಡಾರ್ಕ್ ಚಾಕೊಲೇಟ್', 200],
    ['orange-milk-chocolate-bar', 'Orange Milk Chocolate', 'ಆರೆಂಜ್ ಮಿಲ್ಕ್ ಚಾಕೊಲೇಟ್', 200],
    ['cranberry-white-chocolate-bar', 'Cranberry White Chocolate', 'ಕ್ರ್ಯಾನ್‌ಬೆರಿ ವೈಟ್ ಚಾಕೊಲೇಟ್', 250],
    ['hazelnut-dark-chocolate-bar', 'Hazelnut Dark Chocolate', 'ಹ್ಯಾಜಲ್‌ನಟ್ ಡಾರ್ಕ್ ಚಾಕೊಲೇಟ್', 250],
    ['almond-milk-chocolate-bar', 'Almond Milk Chocolate', 'ಬಾದಾಮಿ ಮಿಲ್ಕ್ ಚಾಕೊಲೇಟ್', 250],
    ['walnut-white-chocolate-bar', 'Walnut White Chocolate', 'ವಾಲ್‌ನಟ್ ವೈಟ್ ಚಾಕೊಲೇಟ್', 300],
    ['coconut-bar', 'Coconut Bar', 'ತೆಂಗಿನಕಾಯಿ ಬಾರ್', 280],
  ].map(([id, en, kn, price], i) => ({
    ...base,
    id,
    slug: id,
    categoryId: 'chocolates',
    sectionId: 'chocolate-bars',
    sort: i + 1,
    name: { en, kn },
    image: 'bar',
    nameCustomisation: false,
    price,
  })),

  /* ---------------- Chocolates: Classic Favourites (sold by weight) ---------------- */
  ...[
    ['classic-dark-chocolate', 'Dark Chocolate', 'ಡಾರ್ಕ್ ಚಾಕೊಲೇಟ್', 1100, [275, 550, 1100], null, []],
    ['classic-milk-chocolate', 'Milk Chocolate', 'ಮಿಲ್ಕ್ ಚಾಕೊಲೇಟ್', 1100, [275, 550, 1100], null, []],
    ['classic-white-chocolate', 'White Chocolate', 'ವೈಟ್ ಚಾಕೊಲೇಟ್', 1400, [350, 700, 1400], null, []],
    ['classic-caramel-delight', 'Caramel Delight', 'ಕ್ಯಾರಮೆಲ್ ಡಿಲೈಟ್', 1000, [250, 500, 1000], null, []],
    [
      'classic-favourite-assortment',
      'Classic Favourite Assortment',
      'ಕ್ಲಾಸಿಕ್ ಫೇವರಿಟ್ ಅಸಾರ್ಟ್‌ಮೆಂಟ್',
      1400,
      [350, 700, 1400],
      { en: '92 pieces per kg.', kn: 'ಪ್ರತಿ ಕೆ.ಜಿಗೆ 92 ತುಂಡುಗಳು.' },
      [],
    ],
    ['classic-dry-fruits', 'Dry Fruits', 'ಡ್ರೈ ಫ್ರೂಟ್ಸ್', 1300, [325, 650, 1300], null, []],
    ['classic-triple-layer-chocolate', 'Triple Layer Chocolate', 'ಟ್ರಿಪಲ್ ಲೇಯರ್ ಚಾಕೊಲೇಟ್', 1300, [325, 650, 1300], null, ['top-selling']],
  ].map(([id, en, kn, perKg, [p250, p500, p1000], description, badges], i) => ({
    ...base,
    id,
    slug: id,
    categoryId: 'chocolates',
    sectionId: 'classic-favourites',
    sort: i + 1,
    name: { en, kn },
    description,
    badges,
    image: 'assortment',
    nameCustomisation: false,
    pricePerKg: perKg,
    optionGroups: [sizes([250, p250], [500, p500], [1000, p1000])],
  })),
]
