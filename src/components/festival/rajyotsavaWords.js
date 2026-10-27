import { dateParts } from '../../lib/dates'

/**
 * "All of November" when the Rajyotsava offer runs the whole month (1 to 30 November), else
 * "Till 15 Nov" (Hema can move its dates in the admin), in the visitor's language.
 */
export function rajyotsavaWhen(offer, t) {
  const [y, m, d] = offer.startsOn.split('-').map(Number)
  if (m === 11 && d === 1 && offer.endsOn === `${y}-11-30`) return t('banner.rajAllNovember')
  const p = dateParts(offer.endsOn)
  return t('banner.rajTill', { date: `${p.day} ${t('dates.months')[p.month - 1]}` })
}

/** "50% off on everything · All of November · Online orders only" */
export const rajyotsavaLine = (offer, t) => [t('banner.rajLine', { percent: offer.percent }), rajyotsavaWhen(offer, t), t('banner.rajOnline')]
