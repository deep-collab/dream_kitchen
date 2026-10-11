/*
  Sample data for the demo admin. Made-up customers (example.com emails, numbers that aren't real
  customers'), priced by the real pricing module so every total adds up. Orders are spread over the
  last week across every status, plus class bookings for the coming weekends and a few messages.
*/
import { products } from '../../config/shop.js'
import { quote, normaliseSelection, zoneForPincode } from '../../lib/pricing.js'
import { addDaysISO, dateChoices, dispatchRules, zonedNow } from '../../lib/dates.js'
import { makeOrderId } from '../../lib/orderId.js'
import { bookableSaturdays, currentOrNextSaturday, makeBookingId } from '../../lib/classes.js'
import { snapshotItem } from '../../../netlify/lib/orders.mjs'

const P = Object.fromEntries(products.map((p) => [p.id, p]))
// Fixed "random" letters, so a sample order keeps its ID when the demo page is reloaded
const fixed = (n) => (k) => Uint8Array.from({ length: k }, (_, i) => (n * 37 + i * 11 + 5) % 256)
const HOUR = 3_600_000
const DAY = 24 * HOUR

const PEOPLE = [
  { name: 'Asha Rao', phone: '9845012345', email: 'asha@example.com', line1: '12, 3rd Cross', line2: 'Jayanagar 4th Block', city: 'Bengaluru', pincode: '560011', state: 'karnataka' },
  { name: 'Kavya Nair', phone: '9886512345', email: '', line1: '22, Green Park Apartments', line2: '2nd Main, Indiranagar', city: 'Bengaluru', pincode: '560038', state: 'karnataka', landmark: 'Near the temple' },
  { name: 'Rohan Mehta', phone: '9820012345', email: 'rohan@example.com', line1: 'Flat 4B, Sea Breeze', line2: 'Bandra West', city: 'Mumbai', pincode: '400050', state: 'maharashtra' },
  { name: 'Lakshmi Gowda', phone: '9900112233', email: 'lakshmi@example.com', line1: '45, Temple Road', line2: 'Saraswathipuram', city: 'Mysuru', pincode: '570009', state: 'karnataka' },
  { name: 'Priya Sharma', phone: '9811122334', email: 'priya@example.com', line1: 'B-17, Lajpat Nagar II', line2: 'Near Central Market', city: 'New Delhi', pincode: '110024', state: 'delhi' },
  { name: 'Suresh Hegde', phone: '9448012345', email: '', line1: '8, Lighthouse Hill Road', line2: 'Hampankatta', city: 'Mangaluru', pincode: '575001', state: 'karnataka' },
  { name: 'Ananya Iyer', phone: '9884012345', email: 'ananya@example.com', line1: '3, Kasturi Ranga Road', line2: 'Alwarpet', city: 'Chennai', pincode: '600018', state: 'tamil-nadu' },
  { name: 'Deepa Kulkarni', phone: '9845098450', email: 'deepa@example.com', line1: '19, Vidyanagar', line2: 'Near KLE College', city: 'Hubballi', pincode: '580021', state: 'karnataka' },
]

/** A little "reference photo" drawn on the spot (a gold teddy outline), so the order page shows one */
async function samplePhoto() {
  try {
    const c = document.createElement('canvas')
    c.width = 320
    c.height = 240
    const g = c.getContext('2d')
    g.fillStyle = '#f3e7cf'
    g.fillRect(0, 0, 320, 240)
    g.strokeStyle = '#b8901e'
    g.lineWidth = 6
    for (const [x, y, r] of [
      [160, 130, 60],
      [110, 70, 25],
      [210, 70, 25],
    ]) {
      g.beginPath()
      g.arc(x, y, r, 0, Math.PI * 2)
      g.stroke()
    }
    g.fillStyle = '#2a1d16'
    g.font = 'bold 18px sans-serif'
    g.fillText('Sample reference photo', 62, 225)
    const blob = await new Promise((r) => c.toBlob(r, 'image/png'))
    return new Uint8Array(await blob.arrayBuffer())
  } catch {
    return null
  }
}

export async function seedDemo(store, setClock) {
  const now = Date.now()
  const at = (ms) => setClock(new Date(ms))
  const today = zonedNow(new Date()).date

  await store.updateSettings({ upi_id: 'dreamkitchen@okaxis', upi_name: 'Dream Kitchen', alert_email: 'hema@example.com', class_settings: { seats: 8 } })
  await store.upsertProducts([{ id: 'pista-bar', slug: 'pista-bar', category: 'chocolates', name_en: 'Pista Bar', sold_out: true }])

  const ref = await samplePhoto()
  // Same shape as a real upload (DRAWING_REF_PATTERN), or the order would drop it
  const refPath = 'refs/20261001/0b0c8f5e-6a43-4f43-9a0e-2d6f2f1b7c11.png'
  if (ref) await store.putObject(refPath, ref, 'image/png')

  /** One order: items [[productId, selection, qty]], placed `ago` ms before now, then moved along */
  async function order(n, person, items, ago, steps = [], extra = {}) {
    const placed = now - ago
    at(placed)
    const zone = zoneForPincode(person.pincode)
    const lines = items.map(([id, sel, qty]) => ({ product: P[id], selection: normaliseSelection(P[id], sel), qty }))
    const q = quote(lines, zone)
    const dispatch = dateChoices(new Date(placed), 1, dispatchRules({ drawing: q.hasDrawing }))[0]
    const { row } = await store.createOrder({
      order_code: makeOrderId(new Date(placed), fixed(n)),
      idempotency_key: `demo-order-${n}-0000000000`,
      customer_name: person.name,
      customer_phone: person.phone,
      customer_email: person.email || null,
      address_line1: person.line1,
      address_line2: person.line2,
      city: person.city,
      landmark: person.landmark || null,
      pincode: person.pincode,
      state: person.state,
      zone,
      items: lines.map((l, i) => snapshotItem(l, q.lines[i])),
      subtotal: q.subtotal,
      courier: q.courier,
      total: q.total,
      courier_tier: q.courierTier,
      has_drawing: q.hasDrawing,
      dispatch_date: dispatch,
      notes: extra.note || null,
      lang: extra.lang || 'en',
      payment_method: extra.upi ? 'upi' : 'razorpay',
    })
    let t = placed
    for (const [step, patch, event, after = 20 * 60_000] of steps) {
      t += after
      at(Math.min(t, now - 60_000))
      if (step === 'utr') await store.submitPayment(row.order_code, person.phone, patch, null)
      else await store.adminUpdateOrder(row.order_code, patch, { kind: 'status', by: event.by || 'hema@example.com', ...event })
    }
    return row.order_code
  }
  const paidRzp = (id) => ['pay', { status: 'payment_confirmed', payment_status: 'confirmed', razorpay_payment_id: id }, { to_status: 'payment_confirmed', by: 'razorpay', note: `Razorpay ${id}` }, 3 * 60_000]
  const preparing = (after) => ['prep', { status: 'preparing' }, { to_status: 'preparing' }, after]
  const shipped = (courier, no, after) => ['ship', { status: 'shipped', courier_name: courier, tracking_no: no }, { to_status: 'shipped', note: `${courier} ${no}` }, after]
  const delivered = (after) => ['done', { status: 'delivered' }, { to_status: 'delivered' }, after]

  // Today
  await order(1, PEOPLE[0], [['red-velvet-delight-box', { size: '500g', name: 'Happy Birthday Amma', drawing: true, drawingText: 'A small pink teddy bear holding a balloon', drawingRef: ref ? refPath : null }, 1], ['almond-bar', {}, 2]], 2 * HOUR, [paidRzp('pay_NkD3mQ8x2LbT7a')], { note: 'Please deliver before Friday' })
  await order(2, PEOPLE[1], [['walnut-brownies', { ragi: true }, 2]], 3 * HOUR, [['utr', '612398745601', null, 10 * 60_000]], { upi: true })
  await order(3, PEOPLE[2], [['lotus-biscoff-tub', { size: '500g' }, 1]], 40 * 60_000, [])
  await order(4, PEOPLE[3], [['mango-delight-box', { size: '250g' }, 2], ['plain-brownies', {}, 1]], 5 * HOUR, [paidRzp('pay_NkC9pW2s4RyU1b')], { lang: 'kn' })
  // Yesterday and earlier
  await order(5, PEOPLE[4], [['pista-delight-box', { size: '700g', name: 'Priya & Arjun' }, 1]], DAY + 4 * HOUR, [paidRzp('pay_Nk7aBc4dEf6G8h'), preparing(18 * HOUR)])
  await order(6, PEOPLE[5], [['assorted-brownies', { ragi: true }, 1], ['almond-bar', {}, 3]], 2 * DAY, [paidRzp('pay_Nk5hJk7LmN9pQr'), preparing(20 * HOUR), shipped('DTDC', 'D41285573', 6 * HOUR)])
  await order(7, PEOPLE[6], [['ferrero-rocher-nutella-tub', { size: '750g' }, 1]], 5 * DAY, [paidRzp('pay_Nk1sTu3VwX5yZa'), preparing(DAY), shipped('Blue Dart', '78812345670', DAY), delivered(2 * DAY)])
  await order(8, PEOPLE[7], [['chocolate-delight-box', { size: '250g' }, 1]], 3 * DAY, [paidRzp('pay_Nk3bCd5eFg7hIj'), ['cancel', { status: 'cancelled', cancel_reason: 'Customer asked to cancel', refund_note: `Refunded ₹740 in Razorpay on ${addDaysISO(today, -2)}` }, { to_status: 'cancelled', note: 'Customer asked to cancel' }, 2 * HOUR]])

  // Class bookings: this weekend and the next ones
  const sats = [...new Set([currentOrNextSaturday(new Date()), ...bookableSaturdays(new Date(), 3)])]
  const booking = async (n, person, classId, fee, weekend, slot, ago, how) => {
    at(now - ago)
    const { row } = await store.createBooking({
      booking_code: makeBookingId(new Date(now - ago), fixed(n + 50)),
      idempotency_key: `demo-booking-${n}-0000000000`,
      class_id: classId,
      weekend,
      slot,
      name: person.name,
      phone: person.phone,
      email: person.email || null,
      fee,
      lang: 'en',
      payment_method: how === 'utr' ? 'upi' : 'razorpay',
    })
    at(now - ago + 5 * 60_000)
    if (how === 'paid') await store.adminUpdateBooking(row.booking_code, { status: 'confirmed', payment_status: 'confirmed', razorpay_payment_id: `pay_DemoClass${n}` }, { kind: 'status', to_status: 'confirmed', by: 'razorpay', note: `Razorpay pay_DemoClass${n}` })
    if (how === 'utr') await store.submitBookingPayment(row.booking_code, person.phone, '512345678901')
  }
  const extra = [
    { name: 'Meera Krishnan', phone: '9000012345', email: 'meera@example.com' },
    { name: 'Farah Khan', phone: '9000023456', email: '' },
    { name: 'Nisha Patil', phone: '9000034567', email: 'nisha@example.com' },
  ]
  await booking(1, extra[0], 'basic', 2500, sats[0], 'morning', 6 * DAY, 'paid')
  await booking(2, PEOPLE[3], 'brownie', 3500, sats[0], 'morning', 4 * DAY, 'paid')
  await booking(3, extra[1], 'advanced', 3500, sats[0], 'midday', 3 * DAY, 'paid')
  await booking(4, extra[2], 'basic', 2500, sats[0], 'midday', 2 * HOUR, 'utr')
  await booking(5, PEOPLE[6], 'brownie', 3500, sats[1], 'morning', DAY, 'paid')
  await booking(6, PEOPLE[4], 'basic', 2500, sats[1], 'midday', 4 * HOUR, 'paid')
  if (sats[2]) await store.setBlock(sats[2], '*', 'Family function')

  // Messages from the website
  at(now - 5 * HOUR)
  await store.insertEnquiry({ kind: 'class', name: 'Ravi Kumar', phone: '9000099999', interest: 'Brownie class for my daughter (12 years)', preferred_dates: 'A weekend in November', message: 'Is it OK for children?', lang: 'en' })
  at(now - 26 * HOUR)
  await store.insertEnquiry({ kind: 'general', name: 'Sunitha', phone: '9000088888', interest: 'General message', message: 'Do you take bulk orders for a wedding (80 boxes)?', lang: 'kn' })
  at(now - 4 * DAY)
  const done = await store.insertEnquiry({ kind: 'general', name: 'Vikram', phone: '9000077777', interest: 'General message', message: 'Can you deliver to Hyderabad?', lang: 'en' })
  await store.updateEnquiry(done.id, { status: 'handled' })
}
