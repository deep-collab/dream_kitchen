import 'virtual:dk-strings/cart'
import { sizeOf } from './pricing.js'
import { sizeLabel } from './weights.js'

/**
 * The customer's choices on a cart line, in the current language: [{ key, label, value }].
 * product: from the menu (for the size name); may be null while the menu loads.
 */
export function lineChoices(line, product, { t, pick }) {
  const s = line.selection
  const out = []
  const size = s.size && product ? sizeOf(product, s.size) : null
  if (size) out.push({ key: 'size', label: t('cart.size'), value: pick(sizeLabel(size)) })
  if (s.ragi) out.push({ key: 'ragi', label: t('cart.ragi'), value: '✓' })
  if (s.name) out.push({ key: 'name', label: t('cart.nameOnBox'), value: `“${s.name}”` })
  if (s.drawing) out.push({ key: 'drawing', label: t('cart.drawing'), value: s.drawingText || '' })
  if (s.drawingRef) out.push({ key: 'photo', label: '', value: t('cart.photoAttached') })
  return out
}

/** The same for an item of a placed order (as the server returns it) */
export function orderItemChoices(item, { t, pick }) {
  const out = []
  if (item.size) out.push({ key: 'size', label: t('cart.size'), value: pick({ en: item.size }) })
  if (item.ragi) out.push({ key: 'ragi', label: t('cart.ragi'), value: '✓' })
  if (item.nameOnBox) out.push({ key: 'name', label: t('cart.nameOnBox'), value: `“${item.nameOnBox}”` })
  if (item.drawing) out.push({ key: 'drawing', label: t('cart.drawing'), value: item.drawingText || '' })
  if (item.hasDrawingRef) out.push({ key: 'photo', label: '', value: t('cart.photoAttached') })
  return out
}
