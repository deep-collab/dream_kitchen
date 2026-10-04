/*
  Chocolate classes. Shaped like the Stage B Supabase tables `classes` and
  `class_batches`.

  SAMPLE: every class below is sample content from the brief (titles, prices,
  lengths, group sizes). The "what you'll learn" points, the weekly day and time
  and the Kannada are drafts written for the demo. Hema replaces all of it after
  the demo (Stage B: in the admin panel). Never present these as confirmed.

  Stage A has no batches table: each class has a weekly slot (`schedule`) and
  src/lib/classes.js lists the next few dates from it. Stage B reads real rows
  from `class_batches` (date, start time, seats) instead.
*/

/** @typedef {{ en: string, kn: string }} I18nText */

/**
 * @typedef {Object} ChocolateClass
 * @property {string} id
 * @property {string} slug                 used in /classes#slug
 * @property {number} sort
 * @property {boolean} sample              true = demo content, Hema has not confirmed it
 * @property {boolean} active
 * @property {I18nText} title
 * @property {I18nText} summary            one plain sentence under the title
 * @property {I18nText[]} learn            3–4 points, "What you'll learn"
 * @property {'in-person'|'online'} mode
 * @property {number} durationMinutes
 * @property {number} price                per person, in rupees
 * @property {number} capacity             seats per batch
 * @property {{min:number,max:number}|null} ages
 * @property {{ weekday: number, startHour: number }} schedule  Stage A only: 0 = Sunday … 6 = Saturday, 24-hour clock
 * @property {string} image                illustration key (components/art)
 */

/** @type {ChocolateClass[]} */
export const classes = [
  {
    id: 'chocolate-making-beginners',
    slug: 'chocolate-making-beginners',
    sort: 1,
    sample: true,
    active: true,
    title: { en: 'Chocolate Making for Beginners', kn: 'ಆರಂಭಿಕರಿಗಾಗಿ ಚಾಕೊಲೇಟ್ ತಯಾರಿಕೆ' },
    summary: {
      en: 'Your first chocolates, start to finish, with Hema beside you.',
      kn: 'ಹೇಮಾ ಅವರ ಜೊತೆಯಲ್ಲೇ, ನಿಮ್ಮ ಮೊದಲ ಚಾಕೊಲೇಟ್‌ಗಳನ್ನು ಆರಂಭದಿಂದ ಕೊನೆಯವರೆಗೆ ಮಾಡಿ.',
    },
    learn: [
      { en: 'Melting and tempering chocolate at home', kn: 'ಮನೆಯಲ್ಲೇ ಚಾಕೊಲೇಟ್ ಕರಗಿಸುವುದು ಮತ್ತು ಟೆಂಪರ್ ಮಾಡುವುದು' },
      { en: 'Filling and setting moulds', kn: 'ಮೋಲ್ಡ್‌ಗಳನ್ನು ತುಂಬಿಸಿ ಗಟ್ಟಿಯಾಗಿಸುವುದು' },
      { en: 'Adding nuts, raisins and other fillings', kn: 'ಬೀಜಗಳು, ಒಣದ್ರಾಕ್ಷಿ ಮತ್ತು ಇತರ ಫಿಲ್ಲಿಂಗ್ ಸೇರಿಸುವುದು' },
      { en: 'Packing chocolates neatly for gifting', kn: 'ಉಡುಗೊರೆಗಾಗಿ ಚಾಕೊಲೇಟ್‌ಗಳನ್ನು ಅಚ್ಚುಕಟ್ಟಾಗಿ ಪ್ಯಾಕ್ ಮಾಡುವುದು' },
    ],
    mode: 'in-person',
    durationMinutes: 180,
    price: 1499,
    capacity: 8,
    ages: null,
    schedule: { weekday: 6, startHour: 11 },
    image: 'class',
  },
  {
    id: 'brownie-tub-masterclass',
    slug: 'brownie-tub-masterclass',
    sort: 2,
    sample: true,
    active: true,
    title: { en: 'Loaded Brownie Tub Masterclass', kn: 'ಲೋಡೆಡ್ ಬ್ರೌನಿ ಟಬ್ ಮಾಸ್ಟರ್‌ಕ್ಲಾಸ್' },
    summary: {
      en: 'Make a loaded brownie tub the way Hema makes hers.',
      kn: 'ಹೇಮಾ ಅವರು ಮಾಡುವ ರೀತಿಯಲ್ಲೇ ಲೋಡೆಡ್ ಬ್ರೌನಿ ಟಬ್ ಮಾಡಿ.',
    },
    learn: [
      { en: 'Baking a rich, fudgy brownie base', kn: 'ಸಮೃದ್ಧ, ಫಡ್ಜಿ ಬ್ರೌನಿ ಬೇಸ್ ಬೇಕ್ ಮಾಡುವುದು' },
      { en: 'Layering spreads like Nutella and Biscoff', kn: 'Nutella, Biscoff ನಂತಹ ಸ್ಪ್ರೆಡ್‌ಗಳ ಪದರಗಳನ್ನು ಹಾಕುವುದು' },
      { en: 'Toppings and a neat finish', kn: 'ಟಾಪಿಂಗ್‌ಗಳು ಮತ್ತು ಅಚ್ಚುಕಟ್ಟಾದ ಅಂತಿಮ ರೂಪ' },
      { en: 'Packing a tub to gift', kn: 'ಉಡುಗೊರೆಗಾಗಿ ಟಬ್ ಪ್ಯಾಕ್ ಮಾಡುವುದು' },
    ],
    mode: 'in-person',
    durationMinutes: 180,
    price: 1999,
    capacity: 8,
    ages: null,
    schedule: { weekday: 0, startHour: 11 },
    image: 'class',
  },
  {
    id: 'kids-chocolate-fun',
    slug: 'kids-chocolate-fun',
    sort: 3,
    sample: true,
    active: true,
    title: { en: 'Kids’ Chocolate Fun Class', kn: 'ಮಕ್ಕಳ ಚಾಕೊಲೇಟ್ ಮೋಜಿನ ತರಗತಿ' },
    summary: {
      en: 'A happy, hands-on class where children make chocolates to take home.',
      kn: 'ಮಕ್ಕಳು ತಾವೇ ಚಾಕೊಲೇಟ್ ಮಾಡಿ ಮನೆಗೆ ಕೊಂಡೊಯ್ಯುವ ಖುಷಿಯ ತರಗತಿ.',
    },
    learn: [
      { en: 'Melting and moulding chocolate safely', kn: 'ಸುರಕ್ಷಿತವಾಗಿ ಚಾಕೊಲೇಟ್ ಕರಗಿಸಿ ಮೋಲ್ಡ್ ಮಾಡುವುದು' },
      { en: 'Decorating with sprinkles and colours', kn: 'ಸ್ಪ್ರಿಂಕಲ್ಸ್ ಮತ್ತು ಬಣ್ಣಗಳಿಂದ ಅಲಂಕರಿಸುವುದು' },
      { en: 'Making their own chocolate bar to take home', kn: 'ಮನೆಗೆ ಕೊಂಡೊಯ್ಯಲು ತಮ್ಮದೇ ಚಾಕೊಲೇಟ್ ಬಾರ್ ಮಾಡುವುದು' },
    ],
    mode: 'in-person',
    durationMinutes: 120,
    price: 799,
    capacity: 10,
    ages: { min: 8, max: 14 },
    schedule: { weekday: 6, startHour: 16 },
    image: 'class',
  },
  {
    id: 'online-chocolate-basics',
    slug: 'online-chocolate-basics',
    sort: 4,
    sample: true,
    active: true,
    title: { en: 'Online Chocolate Basics', kn: 'ಆನ್‌ಲೈನ್ ಚಾಕೊಲೇಟ್ ಮೂಲಪಾಠ' },
    summary: {
      en: 'Learn the basics live from your own kitchen, wherever you are.',
      kn: 'ನೀವು ಎಲ್ಲೇ ಇದ್ದರೂ, ನಿಮ್ಮ ಅಡುಗೆಮನೆಯಿಂದಲೇ ಲೈವ್ ಆಗಿ ಮೂಲಪಾಠ ಕಲಿಯಿರಿ.',
    },
    learn: [
      { en: 'Choosing chocolate and simple tools', kn: 'ಚಾಕೊಲೇಟ್ ಮತ್ತು ಸರಳ ಸಾಧನಗಳನ್ನು ಆರಿಸುವುದು' },
      { en: 'Melting and setting chocolate at home', kn: 'ಮನೆಯಲ್ಲೇ ಚಾಕೊಲೇಟ್ ಕರಗಿಸಿ ಗಟ್ಟಿಯಾಗಿಸುವುದು' },
      { en: 'Easy bars and treats to make again', kn: 'ಮತ್ತೆ ಮತ್ತೆ ಮಾಡಬಹುದಾದ ಸುಲಭ ಬಾರ್‌ಗಳು ಮತ್ತು ತಿನಿಸುಗಳು' },
    ],
    mode: 'online',
    durationMinutes: 120,
    price: 999,
    capacity: 15,
    ages: null,
    schedule: { weekday: 0, startHour: 17 },
    image: 'class',
  },
]
