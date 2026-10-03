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

/** The same for an item of a saved order (src/lib/order.js), for the success page. */
export function orderItemChoices(item, { t, pick }) {
  if (item.kind === 'combo') return [{ key: 'bars', label: t('cart.bars'), value: item.bars.map((n) => pick(n)).join(', ') }]
  const out = []
  if (item.size) out.push({ key: 'size', label: t('cart.size'), value: pick(item.size) })
  if (item.flavour) out.push({ key: 'flavour', label: t('customise.flavour'), value: pick(item.flavour) })
  if (item.nameOnBox) out.push({ key: 'name', label: t('cart.nameOnBox'), value: `“${item.nameOnBox}”` })
  if (item.occasion) out.push({ key: 'occasion', label: t('customise.occasion'), value: pick(item.occasion) })
  if (item.note) out.push({ key: 'note', label: t('cart.note'), value: item.note })
  return out
}
