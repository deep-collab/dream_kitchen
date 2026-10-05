// Rate limits per IP and per phone, counted in the database (a serverless function has no
// memory between requests). Over the limit = 429 "tooMany"; the website asks people to wait or call.
import { HttpError } from './http.mjs'
import { backendMode } from './env.mjs'

export const LIMITS = {
  createOrderIp: [3600, 12], // [window seconds, max requests]
  createOrderPhone: [3600, 6],
  lookupIp: [600, 40], // order lookups (confirmation page, Track Order): stops guessing codes
  paymentIp: [3600, 15],
  uploadIp: [3600, 30],
  enquiryIp: [3600, 6],
  enquiryPhone: [86400, 3],
  loginIp: [900, 10],
  razorpayIp: [3600, 20],
}

// Local QA runs (scripts/qa-step6.mjs) place many orders from one address. DK_RELAX_LIMITS=1
// raises the limits 100× on the mock store only; it has no effect with the real database.
const factor = () => (backendMode() === 'mock' && process.env.DK_RELAX_LIMITS === '1' ? 100 : 1)

export async function limit(store, name, value) {
  const [windowSeconds, max] = LIMITS[name]
  const ok = await store.hitRateLimit(`${name}:${value}`, windowSeconds, max * factor())
  if (!ok) throw new HttpError(429, 'tooMany')
}

/** The honeypot: a field people never see. Bots fill it; the request is refused. */
export function checkHoneypot(body) {
  if (body && typeof body.website === 'string' && body.website.trim()) throw new HttpError(400, 'rejected')
}
