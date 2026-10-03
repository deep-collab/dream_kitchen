/*
  Hema's menu categories. Shaped like the Stage B Supabase table `categories`
  (sections become a child table `category_sections`). Her words only: intros,
  lists and slogans are copied from BUILD_BRIEF.md (spelling fixed only).
*/

/** @typedef {{ en: string, kn: string }} I18nText */

/**
 * @typedef {Object} CategorySection
 * @property {string} id
 * @property {I18nText|null} name   null = the category has a single, untitled section
 * @property {I18nText|null} intro
 * @property {I18nText|null} itemLabel  what one item is called in the WhatsApp order, e.g.
 *                                      "Ferrero Rocher Nutella (Brownie Tub)". null = the name says it.
 */

/**
 * @typedef {Object} Category
 * @property {string} id
 * @property {string} slug            used in /shop#slug
 * @property {number} sort
 * @property {I18nText} name
 * @property {I18nText|null} intro
 * @property {CategorySection[]} sections
 * @property {I18nText[]} [highlights]  short words she uses for the category
 * @property {I18nText[]} [whatYouGet]
 * @property {I18nText} [slogan]
 * @property {I18nText} [note]
 */

/** @type {Category[]} */
export const categories = [
  {
    id: 'brownie-tubs',
    slug: 'brownie-tubs',
    sort: 1,
    name: { en: 'Brownie Tubs', kn: 'ಬ್ರೌನಿ ಟಬ್‌ಗಳು' },
    intro: {
      en: 'A tub filled with delicious fudgy brownies, creamy spreads, premium toppings & pure happiness in every bite!',
      kn: 'ರುಚಿಯಾದ ಫಡ್ಜಿ ಬ್ರೌನಿಗಳು, ಕ್ರೀಮಿ ಸ್ಪ್ರೆಡ್‌ಗಳು, ಪ್ರೀಮಿಯಂ ಟಾಪಿಂಗ್‌ಗಳು ಮತ್ತು ಪ್ರತಿ ತುತ್ತಿನಲ್ಲೂ ಶುದ್ಧ ಸಂತೋಷ ತುಂಬಿದ ಟಬ್!',
    },
    highlights: [
      { en: 'Rich', kn: 'ಸಮೃದ್ಧ' },
      { en: 'Fudgy', kn: 'ಫಡ್ಜಿ' },
      { en: 'Loaded', kn: 'ಲೋಡೆಡ್' },
      { en: 'Made Fresh', kn: 'ತಾಜಾ ತಯಾರಿ' },
    ],
    whatYouGet: [
      { en: 'Freshly baked', kn: 'ತಾಜಾವಾಗಿ ಬೇಕ್ ಮಾಡಿದ್ದು' },
      { en: 'Made to order', kn: 'ಆರ್ಡರ್‌ಗೆ ತಕ್ಕಂತೆ ತಯಾರಿ' },
      { en: 'Premium ingredients', kn: 'ಪ್ರೀಮಿಯಂ ಪದಾರ್ಥಗಳು' },
      { en: 'Rich & fudgy brownies', kn: 'ಸಮೃದ್ಧ, ಫಡ್ಜಿ ಬ್ರೌನಿಗಳು' },
      { en: 'Premium reusable tub', kn: 'ಮರುಬಳಕೆ ಮಾಡಬಹುದಾದ ಪ್ರೀಮಿಯಂ ಟಬ್' },
      { en: 'Carefully packed', kn: 'ಜಾಗರೂಕತೆಯಿಂದ ಪ್ಯಾಕ್ ಮಾಡಲಾಗಿದೆ' },
      { en: 'Perfect for gifting & celebrations', kn: 'ಉಡುಗೊರೆ ಮತ್ತು ಸಂಭ್ರಮಗಳಿಗೆ ಸೂಕ್ತ' },
      { en: 'Perfect for midnight cravings', kn: 'ಮಧ್ಯರಾತ್ರಿಯ ಬಯಕೆಗಳಿಗೆ ಸೂಕ್ತ' },
    ],
    slogan: { en: 'One Spoon. One Bite. And You’ll Want More!', kn: 'ಒಂದು ಚಮಚ. ಒಂದು ತುತ್ತು. ಮತ್ತೆ ಮತ್ತೆ ಬೇಕೆನಿಸುತ್ತದೆ!' },
    sections: [{ id: 'brownie-tubs', name: null, intro: null, itemLabel: { en: 'Brownie Tub', kn: 'ಬ್ರೌನಿ ಟಬ್' } }],
  },
  {
    id: 'delight-boxes',
    slug: 'delight-boxes',
    sort: 2,
    name: { en: 'Delight Boxes', kn: 'ಡಿಲೈಟ್ ಬಾಕ್ಸ್‌ಗಳು' },
    intro: null,
    note: { en: 'Made Fresh, Made to Order, Made With Love', kn: 'ತಾಜಾವಾಗಿ, ಆರ್ಡರ್‌ಗೆ ತಕ್ಕಂತೆ, ಪ್ರೀತಿಯಿಂದ ತಯಾರಿಸಲಾಗಿದೆ' },
    sections: [
      {
        id: 'dreamy-biscoff',
        name: { en: 'Dreamy Biscoff Delight', kn: 'ಡ್ರೀಮಿ Biscoff ಡಿಲೈಟ್' },
        intro: null, // her line "Perfect for personal cravings & gifting!" lives on the product
        itemLabel: { en: 'Delight Box', kn: 'ಡಿಲೈಟ್ ಬಾಕ್ಸ್' },
      },
      {
        id: 'premium-delight',
        name: { en: 'Premium Delight Box (250g)', kn: 'ಪ್ರೀಮಿಯಂ ಡಿಲೈಟ್ ಬಾಕ್ಸ್ (250 ಗ್ರಾಂ)' },
        intro: null,
        itemLabel: { en: 'Premium Delight Box', kn: 'ಪ್ರೀಮಿಯಂ ಡಿಲೈಟ್ ಬಾಕ್ಸ್' },
      },
      {
        id: 'best-sellers',
        name: { en: 'Our best sellers', kn: 'ನಮ್ಮ ಹೆಚ್ಚು ಮಾರಾಟವಾಗುವವು' },
        intro: null,
        itemLabel: { en: 'Delight Box', kn: 'ಡಿಲೈಟ್ ಬಾಕ್ಸ್' },
      },
    ],
  },
  {
    id: 'cookies',
    slug: 'cookies',
    sort: 3,
    name: { en: 'Cookies', kn: 'ಕುಕೀಸ್' },
    intro: null,
    sections: [{ id: 'cookies', name: null, intro: null, itemLabel: null }],
  },
  {
    id: 'chocolates',
    slug: 'chocolates',
    sort: 4,
    name: { en: 'Chocolates', kn: 'ಚಾಕೊಲೇಟ್‌ಗಳು' },
    intro: null,
    sections: [
      { id: 'colour-blast', name: { en: 'Colour Blast Bars', kn: 'ಕಲರ್ ಬ್ಲಾಸ್ಟ್ ಬಾರ್‌ಗಳು' }, intro: null, itemLabel: null },
      { id: 'chocolate-bars', name: { en: 'Chocolate Bars', kn: 'ಚಾಕೊಲೇಟ್ ಬಾರ್‌ಗಳು' }, intro: null, itemLabel: { en: 'Chocolate Bar', kn: 'ಚಾಕೊಲೇಟ್ ಬಾರ್' } },
      { id: 'classic-favourites', name: { en: 'Classic Favourites', kn: 'ಕ್ಲಾಸಿಕ್ ಫೇವರಿಟ್ಸ್' }, intro: null, itemLabel: { en: 'Classic Favourites', kn: 'ಕ್ಲಾಸಿಕ್ ಫೇವರಿಟ್ಸ್' } },
    ],
  },
]

/** Occasions offered in the customise sheet (her list) */
export const occasions = [
  { id: 'birthday', label: { en: 'Birthday', kn: 'ಹುಟ್ಟುಹಬ್ಬ' } },
  { id: 'anniversary', label: { en: 'Anniversary', kn: 'ವಾರ್ಷಿಕೋತ್ಸವ' } },
  { id: 'celebration', label: { en: 'Celebration', kn: 'ಸಂಭ್ರಮ' } },
  { id: 'gifting', label: { en: 'Gifting', kn: 'ಉಡುಗೊರೆ' } },
  { id: 'self-love', label: { en: 'Self-love', kn: 'ನಿಮಗಾಗಿ' } },
  { id: 'midnight-cravings', label: { en: 'Midnight cravings', kn: 'ಮಧ್ಯರಾತ್ರಿಯ ಬಯಕೆ' } },
]
