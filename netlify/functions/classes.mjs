// GET /api/classes: the class booking page's data. The three classes with today's fees, the slot
// times, and the next 8 weekends with what is open (blocked weekends and slots, and seats left
// once Hema has set the seats per slot). No names or phone numbers: only counts.
// Cached at Netlify's edge for 30 seconds; create-booking checks again before saving.
import { handle, json } from '../lib/http.mjs'
import { getStore } from '../lib/store/index.mjs'
import { classAvailability, classConfig } from '../lib/bookings.mjs'
import { bookableSaturdays } from '../../src/lib/classes.js'
import { applySettings } from '../../src/lib/pricing.js'
import { rowToSettings, settingsBase } from '../lib/catalog.mjs'
import { backendMode, config as env } from '../lib/env.mjs'

export default handle(
  async () => {
    if (backendMode() === 'missing') return json(200, { ready: false })
    const store = getStore()
    const settingsRow = await store.getSettings()
    const cfg = classConfig(settingsRow)
    const weekends = await classAvailability(store, bookableSaturdays(new Date()), cfg)
    const upi = applySettings(rowToSettings(settingsRow || {}), settingsBase()).payment.upiId
    return json(
      200,
      {
        ready: true,
        // Bookings are paid online: Razorpay (main) or the UPI fallback. Neither = WhatsApp only.
        open: env.razorpay.enabled || Boolean(upi),
        classes: cfg.classes.map((c) => ({ id: c.id, price: c.price })),
        slots: cfg.slots,
        showSeats: cfg.seats != null,
        weekends: weekends.map((w) => ({ weekend: w.weekend, open: w.open, slots: w.slots.map((s) => ({ id: s.id, open: s.open, seatsLeft: cfg.seats != null ? s.seatsLeft : null })) })),
      },
      { 'cache-control': 'public, max-age=0, must-revalidate', 'netlify-cdn-cache-control': 'public, max-age=30, stale-while-revalidate=60' },
    )
  },
  { methods: ['GET'] },
)

export const config = { path: '/api/classes' }
