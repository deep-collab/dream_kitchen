import { site } from '../config/site'

// 20 -> "8 pm" (en) / "ರಾತ್ರಿ 8" (kn). Kannada names the part of the day instead of am/pm.
export function formatHour(hour, t) {
  if (hour === 12) return t('hours.time.noon')
  const h = hour % 12 || 12
  const part = hour < 12 ? 'morning' : hour < 16 ? 'afternoon' : hour < 19 ? 'evening' : 'night'
  return t(`hours.time.${part}`, { h })
}

// "10 am – 8 pm, Monday to Saturday", from the hours in config
export function formatCallHours(t, hours = site.hours) {
  return t('hours.range', { opens: formatHour(hours.opens, t), closes: formatHour(hours.closes, t), days: t(`hours.days.${hours.days}`) })
}
