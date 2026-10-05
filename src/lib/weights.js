/**
 * 250 -> { en: '250 g' }, 1000 -> { en: '1 kg' }. Labels Delight Box sizes and the Pista Bar
 * (the only weights shown, Hema's choice). The Kannada ("250 ಗ್ರಾಂ") comes from kn.json `units`
 * when someone reads in Kannada (pick() in src/i18n/I18nProvider.jsx).
 */
export const weightLabel = (grams) => ({ en: grams >= 1000 ? `${grams / 1000} kg` : `${grams} g` })

/** The label for a size choice: its own label (a tub size Hema named), else its weight, else its id */
export const sizeLabel = (size) => (size?.label ? { en: size.label } : size?.grams ? weightLabel(size.grams) : { en: String(size?.id ?? '') })
