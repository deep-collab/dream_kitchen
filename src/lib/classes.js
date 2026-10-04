/*
  Class batches and bookings. Pure, covered by tests/classes.test.js.
  Dates are Indian-time 'YYYY-MM-DD' strings (src/lib/dates.js), whatever time
  zone the customer's phone is set to.
*/
import { site } from '../config/site'
import { addDaysISO, weekdayOf, zonedNow } from './dates'
import { normalisePhone, oneLine, phoneError } from './validation'
import { NAME_MAX } from './order'

/**
 * Stage A: the next `batchesShown` dates on the class's weekly day, starting
 * `closeDaysBefore` days from today (so a class today or tomorrow can't be booked).
 * Stage B: rows from `class_batches` replace this; the shape stays the same.
 * -> [{ id, classId, date, startHour, seatsTotal, seatsLeft }]
 */
export function upcomingBatches(cls, now = new Date(), rules = site.classes, timeZone = site.ordering.timeZone) {
  const out = []
  let d = addDaysISO(zonedNow(now, timeZone).date, rules.closeDaysBefore)
  for (let i = 0; i < 7 * (rules.batchesShown + 1) && out.length < rules.batchesShown; i++, d = addDaysISO(d, 1)) {
    if (weekdayOf(d) !== cls.schedule.weekday) continue
    // Stage A knows of no bookings yet, so every seat is free
    out.push({ id: `${cls.id}-${d}`, classId: cls.id, date: d, startHour: cls.schedule.startHour, seatsTotal: cls.capacity, seatsLeft: cls.capacity })
  }
  return out
}

/** Most people one booking may bring to this batch */
export const peopleLimit = (batch, rules = site.classes) => Math.max(0, Math.min(batch?.seatsLeft ?? 0, rules.peopleMax))

// In the order the sheet shows them, so focus and "First: …" go to the topmost problem
export const BOOKING_FIELDS = ['batch', 'people', 'name', 'phone']

/**
 * Booking form -> { field: reasonCode } for each field that needs fixing (empty = fine).
 * form: { name, phone, batchId, people }
 */
export function bookingErrors(form, batches, rules = site.classes) {
  const batch = batches.find((b) => b.id === form.batchId)
  const people = Number(form.people)
  const errors = {
    name: oneLine(form.name).length < 2 ? 'required' : null,
    phone: phoneError(form.phone),
    batch: !form.batchId ? 'required' : !batch ? 'gone' : batch.seatsLeft < 1 ? 'full' : null,
    people: !Number.isInteger(people) || people < 1 ? 'invalid' : batch && people > peopleLimit(batch, rules) ? 'tooMany' : null,
  }
  return Object.fromEntries(Object.entries(errors).filter(([, v]) => v))
}

/**
 * The booking record: shown on the success page, saved on the phone
 * (services.createClassBooking) and sent to Hema on WhatsApp.
 * Shaped like the Stage B table `class_bookings`.
 */
export function buildBooking({ id, now = new Date(), cls, batch, form, lang = 'en' }) {
  const people = Number(form.people)
  return {
    id,
    createdAt: now.toISOString(),
    status: 'requested',
    lang,
    classId: cls.id,
    className: cls.title,
    mode: cls.mode,
    durationMinutes: cls.durationMinutes,
    ages: cls.ages,
    batchId: batch.id,
    date: batch.date,
    startHour: batch.startHour,
    people,
    pricePerPerson: cls.price,
    total: cls.price * people,
    customer: { name: oneLine(form.name).slice(0, NAME_MAX), phone: normalisePhone(form.phone) },
  }
}
