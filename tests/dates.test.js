import { afterEach, describe, expect, it } from 'vitest'
import { site } from '../src/config/site.js'
import en from '../src/i18n/en.json'
import kn from '../src/i18n/kn.json'
import {
  addDaysISO,
  dateChoices,
  earliestDate,
  formatDay,
  isBusinessDay,
  isISODate,
  latestDate,
  orderDay,
  preferredDateError,
  weekdayOf,
  zonedNow,
} from '../src/lib/dates.js'

// Noon in India on a given date. October 2026: Mon 5, Tue 6, Wed 7, Thu 8, Fri 9, Sat 10, Sun 11.
const ist = (date, time = '12:00') => new Date(`${date}T${time}:00+05:30`)
const rules = (over = {}) => ({ ...site.ordering, ...over })

describe('config', () => {
  it('matches the brief: Mon–Sat, 2 business days, no cut-off yet', () => {
    expect(site.ordering.businessDays).toEqual([1, 2, 3, 4, 5, 6])
    expect(site.ordering.closedDates).toEqual([])
    expect(site.ordering.dispatchAfterBusinessDays).toBe(2)
    expect(site.ordering.orderCutoffHour).toBeNull()
    expect(site.ordering.timeZone).toBe('Asia/Kolkata')
  })
})

describe('earliestDate: 2 business days after today, Sunday is not a business day', () => {
  it.each([
    ['Monday', '2026-10-05', '2026-10-07', 'Wednesday'],
    ['Tuesday', '2026-10-06', '2026-10-08', 'Thursday'],
    ['Wednesday', '2026-10-07', '2026-10-09', 'Friday'],
    ['Thursday', '2026-10-08', '2026-10-10', 'Saturday'],
    ['Friday', '2026-10-09', '2026-10-12', 'Monday'],
    ['Saturday', '2026-10-10', '2026-10-13', 'Tuesday'],
    ['Sunday', '2026-10-11', '2026-10-13', 'Tuesday'],
  ])('%s %s → %s (%s)', (_day, today, expected) => {
    expect(earliestDate(ist(today))).toBe(expected)
  })

  it('is the same at any hour of the Indian day (no cut-off yet)', () => {
    expect(earliestDate(ist('2026-10-09', '00:00'))).toBe('2026-10-12')
    expect(earliestDate(ist('2026-10-09', '23:59'))).toBe('2026-10-12')
  })

  it('skips a closed date while counting', () => {
    // Thursday, Hema closed on Friday 9 Oct: Sat (1), Sun no, Mon (2)
    expect(earliestDate(ist('2026-10-08'), rules({ closedDates: ['2026-10-09'] }))).toBe('2026-10-12')
  })

  it('never lands on a closed date', () => {
    // Monday, closed Wednesday 7 Oct: Tue (1), Wed closed, Thu (2)
    expect(earliestDate(ist('2026-10-05'), rules({ closedDates: ['2026-10-07'] }))).toBe('2026-10-08')
  })

  it('crosses month and year ends', () => {
    expect(earliestDate(ist('2026-10-30'))).toBe('2026-11-02') // Fri → Mon
    expect(earliestDate(ist('2026-12-31'))).toBe('2027-01-02') // Thu → Sat
  })

  it('cut-off hook: once set, orders after that hour count from tomorrow', () => {
    const r = rules({ orderCutoffHour: 18 })
    expect(earliestDate(ist('2026-10-05', '17:59'), r)).toBe('2026-10-07')
    expect(earliestDate(ist('2026-10-05', '18:00'), r)).toBe('2026-10-08')
    expect(orderDay(ist('2026-10-05', '18:00'), r)).toBe('2026-10-06')
  })
})

describe('Indian time, whatever the phone is set to', () => {
  const realTZ = process.env.TZ
  afterEach(() => {
    process.env.TZ = realTZ
  })

  it('an 11:30 pm IST Friday order on a phone in Auckland (already Saturday there) still uses Friday', () => {
    process.env.TZ = 'Pacific/Auckland'
    const now = ist('2026-10-09', '23:30')
    expect(now.getDay()).toBe(6) // the phone thinks it is Saturday
    expect(zonedNow(now)).toEqual({ date: '2026-10-09', hour: 23 })
    expect(earliestDate(now)).toBe('2026-10-12') // Friday rule → Monday, not Saturday's Tuesday
  })

  it('an 11:30 pm IST Friday order on a phone in London (still Friday evening) gives the same answer', () => {
    process.env.TZ = 'Europe/London'
    const now = ist('2026-10-09', '23:30')
    expect(earliestDate(now)).toBe('2026-10-12')
  })

  it('a 12:30 am IST Saturday order on a phone in California (still Friday there) uses Saturday', () => {
    process.env.TZ = 'America/Los_Angeles'
    const now = ist('2026-10-10', '00:30')
    expect(now.getDay()).toBe(5) // the phone thinks it is Friday
    expect(zonedNow(now).date).toBe('2026-10-10')
    expect(earliestDate(now)).toBe('2026-10-13') // Saturday rule → Tuesday
  })
})

describe('dateChoices', () => {
  it('gives the next 10 allowed dates from the earliest, skipping Sundays', () => {
    const list = dateChoices(ist('2026-10-09')) // Friday
    expect(list).toEqual([
      '2026-10-12',
      '2026-10-13',
      '2026-10-14',
      '2026-10-15',
      '2026-10-16',
      '2026-10-17',
      '2026-10-19',
      '2026-10-20',
      '2026-10-21',
      '2026-10-22',
    ])
    expect(list.some((d) => weekdayOf(d) === 0)).toBe(false)
  })

  it('from a Saturday starts on Tuesday', () => {
    expect(dateChoices(ist('2026-10-10'))[0]).toBe('2026-10-13')
  })

  it('skips closed dates', () => {
    const list = dateChoices(ist('2026-10-09'), 10, rules({ closedDates: ['2026-10-13', '2026-10-20'] }))
    expect(list).not.toContain('2026-10-13')
    expect(list).not.toContain('2026-10-20')
    expect(list).toHaveLength(10)
  })
})

describe('preferredDateError', () => {
  const now = ist('2026-10-09') // Friday, earliest Monday 12th
  it('accepts the earliest and later business days', () => {
    expect(preferredDateError('2026-10-12', now)).toBeNull()
    expect(preferredDateError('2026-11-30', now)).toBeNull()
  })
  it('explains what is wrong', () => {
    expect(preferredDateError('', now)).toBe('required')
    expect(preferredDateError('2026-13-01', now)).toBe('invalid')
    expect(preferredDateError('12/10/2026', now)).toBe('invalid')
    expect(preferredDateError('2026-10-10', now)).toBe('tooSoon')
    expect(preferredDateError('2026-10-18', now)).toBe('closed') // Sunday
    expect(preferredDateError('2026-10-14', now, rules({ closedDates: ['2026-10-14'] }))).toBe('closed')
    expect(preferredDateError(addDaysISO(latestDate(now), 1), now)).toBe('tooFar')
  })
})

describe('helpers', () => {
  it('isISODate rejects impossible dates', () => {
    expect(isISODate('2026-02-28')).toBe(true)
    expect(isISODate('2026-02-30')).toBe(false)
    expect(isISODate('2026-2-3')).toBe(false)
  })
  it('isBusinessDay', () => {
    expect(isBusinessDay('2026-10-11')).toBe(false) // Sunday
    expect(isBusinessDay('2026-10-10')).toBe(true) // Saturday
  })
  it('formats "Wed, 7 Oct" in English and the Kannada equivalent', () => {
    expect(formatDay('2026-10-07', en.dates)).toBe('Wed, 7 Oct')
    expect(formatDay('2026-10-07', en.dates, { year: true })).toBe('Wed, 7 Oct 2026')
    expect(formatDay('2026-10-07', kn.dates)).toBe(`${kn.dates.weekdays[3]}, 7 ${kn.dates.months[9]}`)
  })
})
