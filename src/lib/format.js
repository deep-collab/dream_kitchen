const inr = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 })

// "Rs 1,499" for WhatsApp text (plain characters, safe in every phone)
export const formatRs = (amount) => `Rs ${inr.format(amount)}`

// Dates are handled as local YYYY-MM-DD strings to avoid time-zone shifts.
export function toISODate(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}
export function addDays(date, days) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  d.setDate(d.getDate() + days)
  return d
}
export function parseISODate(iso) {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}
export function formatDate(iso, lang = 'en') {
  if (!iso) return ''
  return parseISODate(iso).toLocaleDateString(lang === 'kn' ? 'kn-IN' : 'en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

