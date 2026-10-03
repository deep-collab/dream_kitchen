/**
 * Readable choices for a cart line: [{ key, label, value }], in the current language.
 * pick({en,kn}) and t(key) come from useI18n().
 */
export function lineChoices(line, { t, pick }) {
  if (line.kind === 'combo') return [{ key: 'bars', label: t('cart.bars'), value: line.pickNames.map((n) => pick(n)).join(', ') }]
  const s = line.selection
  const out = []
  if (line.labels.size) out.push({ key: 'size', label: t('cart.size'), value: pick(line.labels.size) })
  if (line.labels.flavour) out.push({ key: 'flavour', label: t('customise.flavour'), value: pick(line.labels.flavour) })
  if (s.nameOn) out.push({ key: 'name', label: t('cart.nameOnBox'), value: `“${s.name}”` })
  if (line.labels.occasion) out.push({ key: 'occasion', label: t('customise.occasion'), value: pick(line.labels.occasion) })
  if (s.note) out.push({ key: 'note', label: t('cart.note'), value: s.note })
  return out
}

/** One-line English description (order messages always go to Hema in English). */
export function lineTextEn(line) {
  if (line.kind === 'combo') return `${line.name.en}: ${line.pickNames.map((n) => n.en).join(', ')}`
  const s = line.selection
  const bits = [line.labels.size?.en, line.labels.flavour?.en, s.nameOn ? `Name on box: "${s.name}"` : null, line.labels.occasion?.en, s.note ? `Note: ${s.note}` : null].filter(Boolean)
  const section = line.sectionName?.en ? ` (${line.sectionName.en})` : ''
  return `${line.name.en}${section}${bits.length ? `, ${bits.join(', ')}` : ''}`
}
