/*
  Combos. Shaped like the Stage B Supabase table `combos`.
  Her offer: pick any 3 chocolate bars for ₹699 (repeats allowed). The price is
  hers and is never adjusted, even when 3 cheap bars would cost less.
*/

/**
 * @typedef {Object} Combo
 * @property {string} id
 * @property {string} categoryId
 * @property {string} sectionId
 * @property {{en:string,kn:string}} name
 * @property {number} pick                how many items the customer chooses
 * @property {number} price
 * @property {string[]} eligibleProductIds
 * @property {boolean} allowRepeats
 * @property {string} image
 * @property {boolean} active
 */

/** @type {Combo[]} */
export const combos = [
  {
    id: 'bars-pick-3',
    categoryId: 'chocolates',
    sectionId: 'chocolate-bars',
    name: { en: 'Pick any 3 bars for ₹699', kn: 'ಯಾವುದೇ 3 ಬಾರ್‌ಗಳು ₹699ಕ್ಕೆ' },
    pick: 3,
    price: 699,
    eligibleProductIds: [
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
    ],
    allowRepeats: true,
    image: 'bar',
    active: true,
  },
]
