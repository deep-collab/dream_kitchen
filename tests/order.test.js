import { describe, expect, it } from 'vitest'
import { site, telLink, waLink } from '../src/config/site.js'
import { addLine, makeComboLine, makeProductLine } from '../src/lib/cart.js'
import { repriceCart } from '../src/lib/reprice.js'
import { buildOrder, checkoutErrors, cleanAddress, ORDER_STEPS } from '../src/lib/order.js'
import { byId, ctx, form, menu, NOW, orderFrom, SAMPLES } from './fixtures/sampleOrders.js'
import { ID_ALPHABET, isValidOrderId, makeOrderId, normaliseOrderId, ORDER_ID_PATTERN, orderIdError } from '../src/lib/orderId.js'
import { formatPhone, isValidPhone, isValidPincode, normalisePhone, phoneError, pincodeError } from '../src/lib/validation.js'
import { callbackMessage, callbackWhatsAppUrl, orderMessage, orderWhatsAppUrl, voiceMessageUrl } from '../src/lib/whatsappMessage.js'

describe('orderMessage', () => {
  it('simple order: matches the agreed format exactly', () => {
    expect(orderMessage(SAMPLES.simple())).toBe(
      [
        'New order: DK-261005-7Q4M',
        'Name: Asha Rao | Phone: +91 98450 12345',
        'Items:',
        '1) Oreo Overload (Brownie Tub) – 250g × 1 – ₹399',
        'Subtotal: ₹399 | Delivery: ₹50 | Total: ₹449',
        'Preferred date: Wed, 7 Oct 2026',
        'Address: 12, 3rd Cross, Jayanagar 4th Block, Bengaluru, Pincode 560011',
        'Please confirm my order and share UPI details.',
      ].join('\n'),
    )
  })

  it('snapshots of all three samples', () => {
    expect(orderMessage(SAMPLES.simple())).toMatchSnapshot('simple')
    expect(orderMessage(SAMPLES.personalised())).toMatchSnapshot('name-occasion-note')
    expect(orderMessage(SAMPLES.combo())).toMatchSnapshot('combo')
  })

  it('carries every field of a personalised order', () => {
    const msg = orderMessage(SAMPLES.personalised())
    const lines = msg.split('\n')
    expect(lines[0]).toBe('New order: DK-261005-7Q4M')
    expect(lines[1]).toBe('Name: Asha Rao | Phone: +91 98450 12345')
    expect(lines[2]).toBe('Items:')
    expect(msg).toContain('1) Ferrero Rocher Nutella (Brownie Tub) – 500g × 1 – ₹1,099')
    expect(msg).toContain('   Name on box: Asha (+₹100)')
    expect(msg).toContain('   Occasion: Birthday')
    expect(msg).toContain('   Note: Less sweet please')
    expect(msg).toContain('2) Dreamy Biscoff Delight (Delight Box) – 250g × 2 – ₹1,300')
    expect(msg).toContain('   Flavour: Mango')
    expect(msg).toContain('   Name on box: Ravi (+₹100 each)')
    expect(msg).toContain('Subtotal: ₹2,399 | Delivery: ₹50 | Total: ₹2,449')
    expect(msg).toContain('Preferred date: Wed, 7 Oct 2026')
    expect(msg).toContain('Address: 12, 3rd Cross, Jayanagar 4th Block, Bengaluru, Pincode 560011')
    expect(msg).toContain('Note for Hema: Please call before delivering. Gate code 4512.')
    expect(lines.at(-1)).toBe('Please confirm my order and share UPI details.')
  })

  it('lists the 3 bars of a combo and disambiguates same-named chocolates', () => {
    const msg = orderMessage(SAMPLES.combo())
    expect(msg).toContain('1) Chocolate Bars combo – 3 bars × 1 – ₹699')
    expect(msg).toContain('   Bars: Walnut White Chocolate, Coconut Bar, Coconut Bar')
    expect(msg).toContain('2) Triple Layer Chocolate (Classic Favourites) – 1kg × 1 – ₹1,300')
    expect(msg).toContain('3) Colour Blast Bar × 3 – ₹450') // label skipped: the name already says it
    expect(msg).toContain('   Flavour: Coffee')
  })

  it('is plain English text: no emoji, no WhatsApp bold markers, no Kannada from the UI', () => {
    for (const make of Object.values(SAMPLES)) {
      const msg = orderMessage(make())
      expect(msg).not.toMatch(/\p{Extended_Pictographic}/u)
      expect(msg).not.toMatch(/\*/)
      expect(msg).not.toMatch(/[ಀ-೿]/)
      expect(msg).not.toMatch(/\n\n/)
    }
  })

  it('stays English when the customer used Kannada', () => {
    const order = { ...SAMPLES.personalised(), lang: 'kn' }
    expect(orderMessage(order)).toContain('Occasion: Birthday')
  })

  it('keeps the customer’s own words on one line each', () => {
    const msg = orderMessage(orderFrom([['product', 'oreo-overload-tub', { size: '250g' }, 1]], { name: '  Asha \n Rao ', note: 'line one\n\nline two' }))
    expect(msg).toContain('Name: Asha Rao | Phone')
    expect(msg).toContain('Note for Hema: line one line two')
  })
})

describe('WhatsApp links', () => {
  it('every link goes to 919535706956 and every call link to tel:+919535706956', () => {
    expect(site.whatsapp).toBe('919535706956')
    expect(telLink).toBe('tel:+919535706956')
    expect(orderWhatsAppUrl(SAMPLES.simple())).toMatch(/^https:\/\/wa\.me\/919535706956\?text=/)
    expect(callbackWhatsAppUrl({ phone: '9845012345' })).toMatch(/^https:\/\/wa\.me\/919535706956\?text=/)
  })

  it('encodes the message so it survives the URL intact', () => {
    const order = SAMPLES.personalised()
    const url = orderWhatsAppUrl(order)
    const text = new URL(url).searchParams.get('text')
    expect(text).toBe(orderMessage(order))
    expect(url).not.toMatch(/[\s\n₹×–|]/) // spaces, line breaks and symbols are all percent-encoded
    expect(url).toContain('%0A') // line breaks
    expect(url).toContain('%E2%82%B9') // ₹
  })

  it('encodes &, # and + typed by customers', () => {
    const order = orderFrom([['product', 'oreo-overload-tub', { size: '250g' }, 1]], { note: 'Tom & Jerry #1 + more?' })
    const text = new URL(orderWhatsAppUrl(order)).searchParams.get('text')
    expect(text).toContain('Note for Hema: Tom & Jerry #1 + more?')
  })

  it('voice message opens the chat with exactly "Hi Dream Kitchen"', () => {
    expect(voiceMessageUrl()).toBe('https://wa.me/919535706956?text=Hi%20Dream%20Kitchen')
  })

  it('call-back message', () => {
    expect(callbackMessage({ phone: '09845012345', name: 'Asha', time: 'morning' })).toBe('Hi Dream Kitchen, please call me back on +91 98450 12345 (Asha) in the morning.')
    expect(callbackMessage({ phone: '9845012345', name: '  ', time: null })).toBe('Hi Dream Kitchen, please call me back on +91 98450 12345.')
    expect(callbackMessage({ phone: '9845012345', time: 'evening' })).toBe('Hi Dream Kitchen, please call me back on +91 98450 12345 in the evening.')
    expect(waLink('')).toBe('https://wa.me/919535706956')
  })
})

describe('phone normalisation', () => {
  it.each([
    ['9845012345', '9845012345'],
    ['98450 12345', '9845012345'],
    ['+91 98450 12345', '9845012345'],
    ['+91-98450-12345', '9845012345'],
    ['919845012345', '9845012345'],
    ['09845012345', '9845012345'],
    ['091 98450 12345', '9845012345'],
    ['0091 98450 12345', '9845012345'],
    [' (984) 501-2345 ', '9845012345'],
  ])('%s -> %s', (input, out) => {
    expect(normalisePhone(input)).toBe(out)
    expect(isValidPhone(input)).toBe(true)
  })

  it('rejects numbers that are not Indian mobiles', () => {
    expect(phoneError('')).toBe('required')
    expect(phoneError('   ')).toBe('required')
    expect(phoneError('5845012345')).toBe('invalid') // must start 6–9
    expect(phoneError('984501234')).toBe('invalid') // 9 digits
    expect(phoneError('98450123456')).toBe('invalid') // 11 digits, no leading 0
    expect(phoneError('0821 234567')).toBe('invalid') // Mysuru landline with its STD code
    expect(phoneError('+1 415 555 0100')).toBe('invalid')
    expect(phoneError('6000000000')).toBeNull()
  })

  it('formats for display', () => {
    expect(formatPhone('09845012345')).toBe('+91 98450 12345')
  })
})

describe('pincode validation (Karnataka only)', () => {
  it.each(['560001', '570001', '580001', '590001', '560 011', ' 591307 '])('accepts %s', (pin) => {
    expect(isValidPincode(pin)).toBe(true)
  })
  it('explains each kind of mistake', () => {
    expect(pincodeError('')).toBe('required')
    expect(pincodeError('56001')).toBe('format')
    expect(pincodeError('5600011')).toBe('format')
    expect(pincodeError('56000A')).toBe('format')
    expect(pincodeError('600001')).toBe('outside') // Chennai
    expect(pincodeError('550001')).toBe('outside')
    expect(pincodeError('400001')).toBe('outside') // Mumbai
  })
})

describe('order ID', () => {
  const bytes = (...b) => () => Uint8Array.from(b)

  it('is DK-YYMMDD-XXXX with the Indian date', () => {
    expect(makeOrderId(new Date('2026-10-07T12:00:00+05:30'), bytes(5, 22, 2, 19))).toBe('DK-261007-7Q4M')
    expect(makeOrderId(new Date('2026-10-07T12:00:00+05:30'), bytes(5 + 32, 22 + 64, 2 + 128, 19 + 224))).toBe('DK-261007-7Q4M') // bytes wrap evenly
    // 11:30 pm on 7 Oct in India is still 7 Oct, even though it is 18:00 UTC
    expect(makeOrderId(new Date('2026-10-07T23:30:00+05:30'), bytes(0, 1, 2, 3)).slice(0, 10)).toBe('DK-261007-')
    // 12:30 am on 8 Oct in India is 8 Oct, although UTC still says 7 Oct
    expect(makeOrderId(new Date('2026-10-08T00:30:00+05:30'), bytes(0, 1, 2, 3)).slice(0, 10)).toBe('DK-261008-')
  })

  it('never uses 0, O, 1 or I', () => {
    expect(ID_ALPHABET).toHaveLength(32)
    expect(ID_ALPHABET).not.toMatch(/[01OI]/)
    for (let i = 0; i < 500; i++) {
      const id = makeOrderId(NOW)
      expect(id).toMatch(ORDER_ID_PATTERN)
      expect(id.slice(10)).not.toMatch(/[01OI]/)
    }
  })

  it('uses every character of the alphabet (no byte is wasted or favoured)', () => {
    const seen = new Set()
    for (let b = 0; b < 256; b++) seen.add(makeOrderId(NOW, bytes(b, b, b, b)).at(-1))
    expect(seen.size).toBe(32)
  })

  it('two orders on the same day almost never share an ID', () => {
    const ids = new Set(Array.from({ length: 300 }, () => makeOrderId(NOW)))
    expect(ids.size).toBeGreaterThan(295)
  })

  it('tidies what customers type', () => {
    expect(normaliseOrderId(' dk 261007 7q4m ')).toBe('DK-261007-7Q4M')
    expect(normaliseOrderId('DK2610077Q4M')).toBe('DK-261007-7Q4M')
    expect(normaliseOrderId('261007-7Q4M')).toBe('DK-261007-7Q4M')
    expect(isValidOrderId('dk-261007-7q4m')).toBe(true)
    expect(isValidOrderId('DK-261007-7Q4O')).toBe(false) // O is never used
    expect(isValidOrderId('DK-2610-7Q4M')).toBe(false)
    expect(orderIdError('')).toBe('required')
    expect(orderIdError('hello')).toBe('invalid')
    expect(isValidOrderId('DK-0001')).toBe(true) // the old sample checkout's IDs can still be looked up
  })
})

describe('checkout validation', () => {
  it('a complete form has no errors', () => {
    expect(checkoutErrors(form(), NOW)).toEqual({})
  })
  it('an empty form reports every required field', () => {
    expect(checkoutErrors({ name: '', phone: '', address: '', area: '', pincode: '', date: '', note: '' }, NOW)).toEqual({
      name: 'required',
      phone: 'required',
      address: 'required',
      area: 'required',
      pincode: 'required',
      date: 'required',
    })
  })
  it('catches each kind of mistake', () => {
    const e = checkoutErrors(form({ phone: '12345', address: 'Flat 2', pincode: '600001', date: '2026-10-06', note: 'x'.repeat(201) }), NOW)
    expect(e).toEqual({ phone: 'invalid', address: 'short', pincode: 'outside', date: 'tooSoon', note: 'long' })
    expect(checkoutErrors(form({ date: '2026-10-11' }), NOW).date).toBe('closed') // Sunday
  })
  it('tidies the address into one line', () => {
    expect(cleanAddress('  12, 3rd Cross,\n\n Jayanagar ,\n')).toBe('12, 3rd Cross, Jayanagar')
  })
})

describe('buildOrder', () => {
  it('builds the record that is saved and sent', () => {
    const order = SAMPLES.personalised()
    expect(order).toMatchObject({
      id: 'DK-261005-7Q4M',
      status: 'received',
      channel: 'whatsapp',
      preferredDate: '2026-10-07',
      customer: { name: 'Asha Rao', phone: '9845012345', address: '12, 3rd Cross, Jayanagar 4th Block', area: 'Bengaluru', pincode: '560011' },
      subtotal: 2399,
      deliveryCharge: site.delivery.charge,
      total: 2399 + site.delivery.charge,
    })
    expect(order.items[0]).toMatchObject({ kind: 'product', nameOnBox: 'Asha', namePrice: 100, qty: 1, unitPrice: 1099, lineTotal: 1099 })
    expect(order.createdAt).toBe(NOW.toISOString())
  })

  it('leaves out unavailable lines and uses today’s prices', () => {
    let lines = addLine([], makeProductLine(byId['oreo-overload-tub'], { size: '250g' }, 1, ctx))
    lines = addLine(lines, makeProductLine(byId['mango-delight'], { size: '500g' }, 1, ctx))
    lines = lines.map((l, i) => (i === 0 ? { ...l, unitPrice: 350 } : l)) // stale price from an old visit
    const soldOutMenu = { ...menu, productsById: { ...byId, 'mango-delight': { ...byId['mango-delight'], soldOut: true } } }
    const checked = repriceCart(lines, soldOutMenu).lines
    const order = buildOrder({ id: 'DK-261005-AAAA', now: NOW, lines: checked, menu: soldOutMenu, form: form() })
    expect(order.items).toHaveLength(1)
    expect(order.items[0].unitPrice).toBe(399)
    expect(order.total).toBe(449)
  })

  it('status steps are the brief’s sequence', () => {
    expect(ORDER_STEPS).toEqual(['received', 'confirmed', 'preparing', 'dispatched', 'delivered'])
  })
})

describe('phone field tidying', () => {
  it('shows valid numbers without the +91 the field already displays', async () => {
    const { tidyPhoneInput } = await import('../src/lib/validation.js')
    expect(tidyPhoneInput('+91 9845012345')).toBe('98450 12345')
    expect(tidyPhoneInput('09845012345')).toBe('98450 12345')
    expect(tidyPhoneInput('12345')).toBe('12345') // left alone so the customer can fix it
  })
})
