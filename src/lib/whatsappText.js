// The WhatsApp messages the website types in for customers. Always English, so Hema reads every
// message the same way whichever language the customer browses in.
import { site } from '../config/site.js'
import { sizeOf } from './pricing.js'
import { sizeLabel } from './weights.js'

/** Hema's greeting, then one line per cart item: '- 1 x Red Velvet Delight Box (500 g, name on the box: "Amma")' */
export function cartOrderText(lines, productsById = {}) {
  const items = lines.map((line) => {
    const product = productsById[line.productId]
    const s = line.selection || {}
    const size = s.size && product ? sizeOf(product, s.size) : null
    const extras = [
      size && sizeLabel(size).en,
      s.ragi && 'ragi',
      s.name && `name on the box: "${s.name}"`,
      s.drawing && `drawing: ${s.drawingText || 'yes'}`,
      s.drawingRef && 'reference photo to follow',
    ].filter(Boolean)
    return `- ${line.qty} x ${product?.name?.en || line.name.en}${extras.length ? ` (${extras.join(', ')})` : ''}`
  })
  return [site.whatsappOrderText, ...items].join('\n')
}

/** "Hi, I'd like to book the Basic class" (Hema's wording) */
export const classBookingText = (cls) => `Hi, I'd like to book the ${cls.booking} class`

export const orderStatusText = "Hi Dream Kitchen, I'd like to know the status of my order."
