// Class bookings on the server: check a booking request against the live schedule (blocked
// weekends and slots, seats left, Hema's fees), save it, show it to the customer, and Hema's
// actions. The fee comes only from the class settings; the number the browser sends is compared,
// never trusted. Pure (no Node-only code): the demo admin uses it too.
import { applyClassSettings, availability, bookableSaturdays, bookingDetailsErrors, cleanBookingDetails, makeBookingId } from '../../src/lib/classes.js'
import { HttpError } from './http.mjs'

const IDEMPOTENCY = /^[A-Za-z0-9-]{16,64}$/

/** The class settings as they are now (Hema's changes on top of src/data/classInfo.js) */
export const classConfig = (settingsRow) => applyClassSettings(settingsRow?.class_settings || {})

/** Availability for these Saturdays, from the store */
export async function classAvailability(store, saturdays, cfg, now = new Date()) {
  const [blocks, bookings] = await Promise.all([store.listBlocks({ from: saturdays[0] }), store.listBookings({ weekends: saturdays })])
  return availability(saturdays, { blocks, bookings, cfg, now })
}

/**
 * Checks a booking request. body: { idempotencyKey, classId, weekend, slot, name, phone, email,
 * expectedFee, lang }. Returns the record to save; throws HttpError with a code the page explains.
 */
export async function checkBooking(store, body, cfg, now = new Date()) {
  if (!IDEMPOTENCY.test(String(body.idempotencyKey || ''))) throw new HttpError(400, 'badRequest')
  const fields = bookingDetailsErrors(body)
  if (Object.keys(fields).length) throw new HttpError(400, 'details', { fields })
  const cls = cfg.classes.find((c) => c.id === body.classId)
  if (!cls) throw new HttpError(400, 'badRequest')
  if (!bookableSaturdays(now).includes(body.weekend)) throw new HttpError(409, 'slotGone')
  const [week] = await classAvailability(store, [body.weekend], cfg, now)
  const slot = week.slots.find((s) => s.id === body.slot)
  if (!slot) throw new HttpError(400, 'badRequest')
  if (!slot.open) throw new HttpError(409, slot.blocked ? 'slotGone' : 'slotFull')
  if (Number(body.expectedFee) !== cls.price) throw new HttpError(409, 'feeChanged', { fee: cls.price })
  const d = cleanBookingDetails(body)
  return {
    idempotency_key: body.idempotencyKey,
    class_id: cls.id,
    weekend: body.weekend,
    slot: slot.id,
    name: d.name,
    phone: d.phone,
    email: d.email || null,
    fee: cls.price,
    lang: body.lang === 'kn' ? 'kn' : 'en',
  }
}

/** Saves with a fresh DK-CL- code (a clash just tries another); a full slot is 409 slotFull */
export async function saveBooking(store, record, maxSeats, now = new Date()) {
  for (let attempt = 0; attempt < 6; attempt++) {
    try {
      return await store.createBooking({ ...record, booking_code: makeBookingId(now) }, maxSeats ?? null)
    } catch (error) {
      if (error?.constraint === 'class_bookings_booking_code_key') continue
      if (error?.constraint === 'slot_full') throw new HttpError(409, 'slotFull')
      throw error
    }
  }
  throw new HttpError(500, 'server')
}

/** What the customer sees (booking page): no phone, no admin notes, the UTR's last 4 only */
export function publicBooking(row) {
  return {
    code: row.booking_code,
    createdAt: row.created_at,
    status: row.status,
    paymentStatus: row.payment_status,
    paymentMethod: row.payment_method,
    classId: row.class_id,
    weekend: row.weekend,
    slot: row.slot,
    fee: row.fee,
    name: row.name,
    utrLast4: row.utr ? row.utr.slice(-4) : null,
    cancelReason: row.status === 'cancelled' ? row.cancel_reason : null,
  }
}

/* ---------------- Hema's actions ---------------- */

export const BOOKING_NEXT = { pending: ['paymentReceived', 'cancel'], confirmed: ['cancel'], cancelled: [] }

/** One tap in the admin -> { patch, event }. input: { step, reason, notes } */
export function bookingAction(row, input, by) {
  const step = input?.step
  if (step === 'notes') return { patch: { admin_notes: String(input.notes ?? '').trim().slice(0, 1000) }, event: null }
  if (!(BOOKING_NEXT[row.status] || []).includes(step)) throw new HttpError(409, 'transition', { status: row.status })
  if (step === 'paymentReceived')
    return { patch: { status: 'confirmed', payment_status: 'confirmed' }, event: { kind: 'status', to_status: 'confirmed', by, note: row.utr ? `UTR ${row.utr}` : null } }
  const reason = String(input.reason ?? '').replace(/\s+/g, ' ').trim()
  if (reason.length < 3 || reason.length > 200) throw new HttpError(400, 'fields', { fields: { reason: 'required' } })
  return { patch: { status: 'cancelled', cancel_reason: reason }, event: { kind: 'status', to_status: 'cancelled', by, note: reason } }
}

/** The admin list card */
export function bookingSummary(row, cfg = applyClassSettings()) {
  const c = cfg.classes.find((x) => x.id === row.class_id)
  return {
    code: row.booking_code,
    createdAt: row.created_at,
    name: row.name,
    phone: row.phone,
    className: c?.name.en || row.class_id,
    weekend: row.weekend,
    slot: row.slot,
    fee: row.fee,
    status: row.status,
    paymentStatus: row.payment_status,
    paymentMethod: row.payment_method,
  }
}
