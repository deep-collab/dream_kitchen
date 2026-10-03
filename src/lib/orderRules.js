import { site } from '../config/site'
import { addDays, toISODate } from './format'

const { bulkThreshold, bulkMinDaysAhead, standardMinDaysAhead, maxDaysAhead } = site.order

export const isBulkOrder = (pieces) => pieces > bulkThreshold

export function minDeliveryDate(pieces, today = new Date()) {
  const days = isBulkOrder(pieces) ? bulkMinDaysAhead : standardMinDaysAhead
  return toISODate(addDays(today, days))
}
export function maxDeliveryDate(today = new Date()) {
  return toISODate(addDays(today, maxDaysAhead))
}
export const deliveryCharge = (pieces) => (pieces > 0 ? site.delivery.charge : 0)
