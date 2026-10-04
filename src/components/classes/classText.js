// Words for class facts in the current language (t from useI18n).
import { formatDay } from '../../lib/dates'
import { formatHour } from '../../lib/hours'

/** 180 -> "3 hours" / "3 ಗಂಟೆ"; 90 -> "90 minutes" */
export const durationText = (minutes, t) => (minutes % 60 === 0 ? t('classes.hours', { count: minutes / 60 }) : t('classes.minutes', { count: minutes }))

/** "Sat, 10 Oct, 11 am" (with the year when asked) */
export const batchText = (batch, t, { year = false } = {}) =>
  t('classes.dateTime', { date: formatDay(batch.date, t('dates'), { year }), time: formatHour(batch.startHour, t) })

/** "8 seats left" / "1 seat left" / "Full" */
export const seatsText = (batch, t) => (batch.seatsLeft < 1 ? t('classes.full') : batch.seatsLeft === 1 ? t('classes.seatsLeftOne') : t('classes.seatsLeft', { count: batch.seatsLeft }))

export const modeText = (mode, t) => t(mode === 'online' ? 'classes.mode.online' : 'classes.mode.inPerson')

export const locationText = (mode, t) => t(mode === 'online' ? 'classes.location.online' : 'classes.location.inPerson')
