import { describe, expect, it } from 'vitest'
import { site } from '../src/config/site.js'
import { classes } from '../src/data/classes.js'
import { BOOKING_ID_PATTERN, makeBookingId, normaliseBookingId } from '../src/lib/bookingId.js'
import { bookingErrors, buildBooking, peopleLimit, upcomingBatches } from '../src/lib/classes.js'
import { bookingMessage, bookingWhatsAppUrl, englishDuration, englishHour } from '../src/lib/whatsappMessage.js'

const byId = Object.fromEntries(classes.map((c) => [c.id, c]))
const beginners = byId['chocolate-making-beginners'] // Saturdays, 11 am
const masterclass = byId['brownie-tub-masterclass'] // Sundays, 11 am
const kids = byId['kids-chocolate-fun']
const MONDAY = new Date('2026-10-05T10:00:00+05:30')
const dates = (list) => list.map((b) => b.date)
const bytes = (...b) => () => Uint8Array.from(b)

describe('class data', () => {
  it('has the four classes from the brief, all marked SAMPLE', () => {
    expect(classes.map((c) => [c.title.en, c.mode, c.durationMinutes / 60, c.price, c.capacity])).toEqual([
      ['Chocolate Making for Beginners', 'in-person', 3, 1499, 8],
      ['Loaded Brownie Tub Masterclass', 'in-person', 3, 1999, 8],
      ['Kids’ Chocolate Fun Class', 'in-person', 2, 799, 10],
      ['Online Chocolate Basics', 'online', 2, 999, 15],
    ])
    expect(kids.ages).toEqual({ min: 8, max: 14 })
    for (const c of classes) {
      expect(c.sample).toBe(true)
      expect(c.learn.length).toBeGreaterThanOrEqual(3)
      expect(c.learn.length).toBeLessThanOrEqual(4)
      expect([0, 6]).toContain(c.schedule.weekday) // weekends
      for (const text of [c.title, c.summary, ...c.learn]) expect(text.kn).toMatch(/[ಀ-೿]/)
    }
  })
})

describe('upcoming batches (Indian time)', () => {
  it('lists the next 4 weekends on the class day', () => {
    expect(dates(upcomingBatches(beginners, MONDAY))).toEqual(['2026-10-10', '2026-10-17', '2026-10-24', '2026-10-31'])
    expect(dates(upcomingBatches(masterclass, MONDAY))).toEqual(['2026-10-11', '2026-10-18', '2026-10-25', '2026-11-01'])
    const [first] = upcomingBatches(beginners, MONDAY)
    expect(first).toEqual({ id: 'chocolate-making-beginners-2026-10-10', classId: beginners.id, date: '2026-10-10', startHour: 11, seatsTotal: 8, seatsLeft: 8 })
  })

  it('booking closes the day before: Friday can still book Saturday, Saturday cannot', () => {
    expect(upcomingBatches(beginners, new Date('2026-10-09T23:30:00+05:30'))[0].date).toBe('2026-10-10')
    expect(upcomingBatches(beginners, new Date('2026-10-10T08:00:00+05:30'))[0].date).toBe('2026-10-17')
    expect(upcomingBatches(masterclass, new Date('2026-10-10T08:00:00+05:30'))[0].date).toBe('2026-10-11')
    expect(upcomingBatches(masterclass, new Date('2026-10-11T08:00:00+05:30'))[0].date).toBe('2026-10-18')
  })

  it('uses the Indian date, not the phone’s: 11:30 pm Saturday in India is already Sunday in Auckland', () => {
    // Same instant everywhere; only Indian time decides "today" (Saturday 10 Oct)
    const late = new Date('2026-10-10T23:30:00+05:30')
    expect(upcomingBatches(masterclass, late)[0].date).toBe('2026-10-11')
  })

  it('follows the config: batchesShown and closeDaysBefore', () => {
    const rules = { ...site.classes, batchesShown: 2, closeDaysBefore: 7 }
    expect(dates(upcomingBatches(beginners, MONDAY, rules))).toEqual(['2026-10-17', '2026-10-24'])
  })
})

describe('booking form', () => {
  const batches = upcomingBatches(beginners, MONDAY)
  const ok = { name: 'Asha Rao', phone: '98450 12345', batchId: batches[0].id, people: 2 }

  it('a complete form has no errors', () => {
    expect(bookingErrors(ok, batches)).toEqual({})
  })

  it('says what is missing', () => {
    expect(bookingErrors({ name: '', phone: '', batchId: '', people: 1 }, batches)).toEqual({ name: 'required', phone: 'required', batch: 'required' })
    expect(bookingErrors({ ...ok, phone: '12345' }, batches)).toEqual({ phone: 'invalid' })
    expect(bookingErrors({ ...ok, batchId: 'chocolate-making-beginners-2026-09-26' }, batches)).toEqual({ batch: 'gone' })
    expect(bookingErrors({ ...ok, people: 0 }, batches)).toEqual({ people: 'invalid' })
  })

  it('never takes more seats than are left, or more than peopleMax', () => {
    const full = batches.map((b, i) => (i === 0 ? { ...b, seatsLeft: 0 } : i === 1 ? { ...b, seatsLeft: 2 } : b))
    expect(bookingErrors(ok, full)).toEqual({ batch: 'full', people: 'tooMany' })
    expect(bookingErrors({ ...ok, batchId: full[1].id, people: 3 }, full)).toEqual({ people: 'tooMany' })
    expect(bookingErrors({ ...ok, batchId: full[1].id, people: 2 }, full)).toEqual({})
    expect(peopleLimit(batches[0])).toBe(Math.min(8, site.classes.peopleMax))
    expect(peopleLimit({ seatsLeft: 2 })).toBe(2)
    expect(bookingErrors({ ...ok, people: site.classes.peopleMax + 1 }, batches)).toEqual({ people: 'tooMany' })
  })
})

describe('booking ID', () => {
  it('is CL-YYMMDD-XXXX with the day the booking is made, in Indian time', () => {
    expect(makeBookingId(MONDAY, bytes(5, 22, 2, 19))).toBe('CL-261005-7Q4M')
    expect(makeBookingId(new Date('2026-10-05T18:45:00Z')).slice(0, 10)).toBe('CL-261006-') // 00:15 on 6 Oct in India
    for (let i = 0; i < 200; i++) expect(makeBookingId(MONDAY)).toMatch(BOOKING_ID_PATTERN)
  })

  it('tidies what people type', () => {
    expect(normaliseBookingId(' cl 261005 7q4m ')).toBe('CL-261005-7Q4M')
    expect(normaliseBookingId('CL2610057Q4M')).toBe('CL-261005-7Q4M')
  })
})

describe('booking message', () => {
  const [batch] = upcomingBatches(kids, MONDAY)
  const booking = buildBooking({
    id: makeBookingId(MONDAY, bytes(5, 22, 2, 19)),
    now: MONDAY,
    cls: kids,
    batch,
    form: { name: '  Asha   Rao ', phone: '+91 98450 12345', batchId: batch.id, people: 3 },
  })

  it('builds the booking record', () => {
    expect(booking).toMatchObject({ id: 'CL-261005-7Q4M', status: 'requested', classId: kids.id, date: '2026-10-10', startHour: 16, people: 3, pricePerPerson: 799, total: 2397 })
    expect(booking.customer).toEqual({ name: 'Asha Rao', phone: '9845012345' })
  })

  it('matches the agreed format exactly (always English)', () => {
    expect(bookingMessage(booking)).toBe(
      [
        'New class booking: CL-261005-7Q4M',
        'Class: Kids’ Chocolate Fun Class, ages 8–14 (in person, 2 hours)',
        'Batch: Sat, 10 Oct 2026, 4 pm',
        'People: 3 × ₹799 = ₹2,397',
        'Name: Asha Rao | Phone: +91 98450 12345',
        'Please confirm my seats and share the payment details.',
      ].join('\n'),
    )
    expect(bookingWhatsAppUrl(booking).startsWith(`https://wa.me/${site.whatsapp}?text=`)).toBe(true)
    expect(new URL(bookingWhatsAppUrl(booking)).searchParams.get('text')).toBe(bookingMessage(booking))
  })

  it('online classes say so', () => {
    const online = byId['online-chocolate-basics']
    const [b] = upcomingBatches(online, MONDAY)
    const msg = bookingMessage(buildBooking({ id: 'CL-261005-AAAA', now: MONDAY, cls: online, batch: b, form: { name: 'Ravi', phone: '9845012345', batchId: b.id, people: 1 } }))
    expect(msg).toContain('Class: Online Chocolate Basics (live online, 2 hours)')
    expect(msg).toContain('Batch: Sun, 11 Oct 2026, 5 pm')
  })

  it('hours and durations in plain English', () => {
    expect([11, 12, 16, 0, 9].map(englishHour)).toEqual(['11 am', '12 noon', '4 pm', '12 am', '9 am'])
    expect([180, 120, 60, 90].map(englishDuration)).toEqual(['3 hours', '2 hours', '1 hour', '1 hour 30 minutes'])
  })
})
