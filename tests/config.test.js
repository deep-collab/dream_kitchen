import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { site, telLink, waLink } from '../src/config/site.js'
import { addDaysISO, earliestDate } from '../src/lib/dates.js'
import { areaFieldMode, buildOrder, checkoutErrors } from '../src/lib/order.js'
import { orderMessage } from '../src/lib/whatsappMessage.js'
import { form, menu, NOW, SAMPLES } from './fixtures/sampleOrders.js'

describe('phone number: one place only (src/config/site.js)', () => {
  const digits = site.phone.tel.replace(/^\+91/, '')

  it('every form of the number comes from the same 10 digits', () => {
    expect(digits).toMatch(/^[6-9]\d{9}$/)
    expect(site.phone.display.replace(/\D/g, '')).toBe(`91${digits}`)
    expect(site.phone.short.replace(/\D/g, '')).toBe(digits)
    expect(site.whatsapp).toBe(`91${digits}`)
    expect(telLink).toBe(`tel:+91${digits}`)
    expect(waLink('')).toBe(`https://wa.me/91${digits}`)
  })

  it('no other file spells the number out', () => {
    // The digits with any spaces, dashes or dots between them ("98765 43210", "9876-543210")
    const pattern = new RegExp(digits.split('').join('[\\s.-]?'))
    const roots = ['src', 'scripts', 'tests', 'public', 'index.html', 'vite.config.js']
    const files = []
    const walk = (p) => (statSync(p).isDirectory() ? readdirSync(p).forEach((f) => walk(join(p, f))) : files.push(p))
    roots.forEach(walk)
    const textFiles = files.filter((f) => /\.(js|jsx|mjs|json|html|css|txt|webmanifest|xml|svg|toml)$|_redirects$/.test(f))
    expect(textFiles.length).toBeGreaterThan(50)
    const offenders = textFiles.filter((f) => f.replaceAll('\\', '/') !== 'src/config/site.js' && pattern.test(readFileSync(f, 'utf8')))
    expect(offenders).toEqual([])
  })
})

describe('checkout settings in config (site.ordering)', () => {
  const rules = (over) => ({ ...site.ordering, ...over })

  it('"Area or city": required, optional or off', () => {
    expect(['required', 'optional', 'off']).toContain(areaFieldMode())
    expect(areaFieldMode(rules({ areaField: 'required' }))).toBe('required')
    expect(areaFieldMode(rules({ areaField: 'optional' }))).toBe('optional')
    expect(areaFieldMode(rules({ areaField: 'off' }))).toBe('off')
    expect(areaFieldMode(rules({ areaField: 'Optional ' }))).toBe('required') // a typo never drops the field

    const noArea = form({ area: '' })
    expect(checkoutErrors(noArea, NOW, rules({ areaField: 'required' })).area).toBe('required')
    expect(checkoutErrors(noArea, NOW, rules({ areaField: 'optional' }))).toEqual({})
    expect(checkoutErrors(noArea, NOW, rules({ areaField: 'off' }))).toEqual({})
  })

  it('"off" leaves the area out of the order and the WhatsApp message', () => {
    const lines = []
    const order = buildOrder({ id: 'DK-261005-7Q4M', now: NOW, lines, menu, form: form(), rules: rules({ areaField: 'off' }) })
    expect(order.customer.area).toBe('')
    const kept = SAMPLES.simple()
    expect(orderMessage(kept)).toContain('Address: 12, 3rd Cross, Jayanagar 4th Block, Bengaluru, Pincode 560011')
    expect(orderMessage({ ...kept, customer: { ...kept.customer, area: '' } })).toContain('Address: 12, 3rd Cross, Jayanagar 4th Block, Pincode 560011')
  })

  it('the furthest date follows maxDaysAhead', () => {
    expect(site.ordering.maxDaysAhead).toBeGreaterThan(0)
    const today = '2026-10-05'
    // 2026-11-04 is a Wednesday, 30 days after Monday 5 Oct
    expect(addDaysISO(today, 30)).toBe('2026-11-04')
    expect(checkoutErrors(form({ date: '2026-11-04' }), NOW, rules({ maxDaysAhead: 30 })).date).toBeUndefined()
    expect(checkoutErrors(form({ date: '2026-11-05' }), NOW, rules({ maxDaysAhead: 30 })).date).toBe('tooFar')
    expect(checkoutErrors(form({ date: '2026-11-05' }), NOW, rules({ maxDaysAhead: 90 })).date).toBeUndefined()
    expect(earliestDate(NOW)).toBe('2026-10-07')
  })
})
