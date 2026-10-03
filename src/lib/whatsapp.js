import { waLink } from '../config/site'
import { formatDate, formatRs } from './format'

// Order message is always English so Hema (and a future bot) get one clean format.
export function orderMessage(order) {
  const lines = [
    `*New order: ${order.id}*`,
    'Hello Dream Kitchen! I would like to place this order:',
    '',
    ...order.items.map((it, i) => `${i + 1}. ${it.name} x ${it.qty} = ${formatRs(it.lineTotal)}  (${formatRs(it.unitPrice)} each)`),
    '',
    `Items (${order.pieces} pcs): ${formatRs(order.subtotal)}`,
    `Delivery: ${formatRs(order.deliveryCharge)}`,
    `*Total: ${formatRs(order.total)}*`,
    '',
    `Name: ${order.customer.name}`,
    `Phone: ${order.customer.phone}`,
    `Address: ${order.customer.address}`,
    `Pincode: ${order.customer.pincode}`,
    `Delivery date: ${formatDate(order.deliveryDate, 'en')}`,
    `Note: ${order.note ? order.note : '-'}`,
    '',
    'Please share the UPI details. Thank you!',
  ]
  return lines.join('\n')
}
export const orderWhatsAppUrl = (order) => waLink(orderMessage(order))

export function enquiryMessage(enquiry, typeLabel) {
  return [
    `*New enquiry: ${typeLabel}*`,
    `Name: ${enquiry.name}`,
    `Phone: ${enquiry.phone}`,
    '',
    enquiry.message,
  ].join('\n')
}

