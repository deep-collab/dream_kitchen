/*
  Customer reviews. Shaped like the Stage B Supabase table `reviews`.
  Only real reviews, added with the customer's permission. Never invent one:
  the home page section stays hidden while this list is empty.
*/

/**
 * @typedef {Object} Review
 * @property {string} id
 * @property {string} name        as the customer wants it shown, e.g. "Asha, Mysuru"
 * @property {string} text        their words, unedited apart from spelling
 * @property {'en'|'kn'} lang     the language they wrote in
 * @property {string} [product]   product id, if the review is about one item
 * @property {boolean} approved   Hema has approved it for the site
 */

/** @type {Review[]} */
export const reviews = []
