// POST /api/create-booking { idempotencyKey, classId, weekend, slot, name, phone, email, expectedFee, lang }
// A class booking: checks the weekend and slot are still open (and a seat is free, if Hema set the
// seats), takes the fee from the class settings (never the browser), saves it once (a double tap
// gives the same booking) with an ID like DK-CL-261010-AB2C. Payment comes next on the booking page:
// Razorpay (main) or the UPI fallback. Hema's email is sent once it is paid (or a UPI reference given).
import { checkOrigin, clientIp, handle, HttpError, json, readJson } from '../lib/http.mjs'
import { getStore } from '../lib/store/index.mjs'
import { checkHoneypot, limit } from '../lib/limits.mjs'
import { checkBooking, classConfig, publicBooking, saveBooking } from '../lib/bookings.mjs'
import { customerBooking, sendAll } from '../lib/email.mjs'
import { applySettings } from '../../src/lib/pricing.js'
import { rowToSettings, settingsBase } from '../lib/catalog.mjs'
import { config as env } from '../lib/env.mjs'

export default handle(async (req, context) => {
  checkOrigin(req)
  const body = await readJson(req, 8_000)
  checkHoneypot(body)
  const store = getStore()
  await limit(store, 'bookingIp', clientIp(req, context))
  const settingsRow = await store.getSettings()
  const upi = applySettings(rowToSettings(settingsRow || {}), settingsBase()).payment.upiId
  if (!env.razorpay.enabled && !upi) throw new HttpError(503, 'paymentsClosed')
  const method = env.razorpay.enabled ? 'razorpay' : 'upi'

  const cfg = classConfig(settingsRow)
  const record = await checkBooking(store, body, cfg)
  await limit(store, 'bookingPhone', record.phone)
  const { row, created } = await saveBooking(store, { ...record, payment_method: method }, cfg.seats)
  if (created && method === 'upi') await sendAll([customerBooking(row, cfg)])
  return json(created ? 201 : 200, { booking: publicBooking(row), created })
})

export const config = { path: '/api/create-booking' }
