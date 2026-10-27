/*
  Kannada Rajyotsava: the offer's stored words, in English and Kannada. Used by the server (order
  lines, the admin), the practice store and the demo, never by the website's own code, so English
  visitors download no Kannada (scripts/bundle-report.mjs checks it). The website writes its
  popup, banner and button from its text files (src/i18n, banner.raj*).
*/
import { RAJYOTSAVA } from './offers.js'

/** "Rajyotsava 50% off": the words on an order line, the packing slip and the emails */
export const rajyotsavaLabel = (percent) => ({ en: `Rajyotsava ${percent}% off`, kn: `ರಾಜ್ಯೋತ್ಸವ ${percent}% ರಿಯಾಯಿತಿ` })

/**
 * The Rajyotsava offer's stored words for a percent (the website writes its popup, banner and
 * button from its own text files; these show in the admin and wherever an offer's title is used)
 */
export const rajyotsavaTexts = (percent) => ({
  title: { en: 'Happy Kannada Rajyotsava', kn: 'ಕನ್ನಡ ರಾಜ್ಯೋತ್ಸವದ ಹಾರ್ದಿಕ ಶುಭಾಶಯಗಳು' },
  message: { en: `${percent}% off on everything · Online orders only`, kn: `ಎಲ್ಲಾ ಉತ್ಪನ್ನಗಳ ಮೇಲೆ ${percent}% ರಿಯಾಯಿತಿ · ಆನ್‌ಲೈನ್ ಆರ್ಡರ್‌ಗಳಿಗೆ ಮಾತ್ರ` },
  button: { en: 'Go to Offer Zone', kn: 'ಆಫರ್ ವಲಯಕ್ಕೆ ಹೋಗಿ' },
  badge: { en: `${percent}% OFF`, kn: `${percent}% ರಿಯಾಯಿತಿ` },
})

/**
 * The Rajyotsava offer as an offers row (snake_case columns), as the migration makes it: every
 * product, a percent off, the drawing at full price unless `drawing`. Used by the practice store,
 * the demo and the admin (which puts it back if it is ever missing).
 */
export function rajyotsavaRow({ percent = RAJYOTSAVA.percent, startsOn = RAJYOTSAVA.startsOn, endsOn = RAJYOTSAVA.endsOn, active = true, drawing = false } = {}) {
  const words = rajyotsavaTexts(percent)
  return {
    id: RAJYOTSAVA.id,
    title: words.title,
    message: words.message,
    button: words.button,
    link: '',
    photo_url: null,
    photo_phone_url: null,
    starts_on: startsOn,
    ends_on: endsOn,
    active,
    items: { all: true, categories: [], products: [] },
    deal: { kind: 'percent', value: percent, ...(drawing ? { drawing: true } : {}) },
    badge: words.badge,
  }
}

/**
 * The words for an offer on an order line, the packing slip and the emails ("Rajyotsava 50% off"):
 * the Rajyotsava offer's own name, else the offer's badge, else its title. { en, kn }
 */
export function offerLabel(offer) {
  if (offer?.id === RAJYOTSAVA.id && offer.deal?.kind === 'percent') return rajyotsavaLabel(offer.deal.value)
  return offer?.badge || offer?.title || { en: 'Offer', kn: 'ಆಫರ್' }
}
