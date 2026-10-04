/**
 * 250 -> { en: '250g' }, 1000 -> { en: '1kg' }. Labels size choices and fixed-weight items.
 * The Kannada ("250 ಗ್ರಾಂ") comes from kn.json `units` when someone reads in Kannada
 * (pick() in src/i18n/I18nProvider.jsx), so English visitors never download it.
 */
export const weightLabel = (grams) => ({ en: grams >= 1000 ? `${grams / 1000}kg` : `${grams}g` })
