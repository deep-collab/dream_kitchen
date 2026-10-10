/*
  The demo admin (/admin/demo): the real admin pages and the real admin rules
  (netlify/lib/adminCore.mjs), running in the browser on a practice store (memoryCore.mjs) filled
  with sample orders, bookings and messages (./seed.js). There is no login and no network: nothing
  here can read or change real data, and everything is gone when the page is closed.
  Loaded only on /admin/demo, so the real admin doesn't download it.
*/
import { createMemoryCore } from '../../../netlify/lib/store/memoryCore.mjs'
import { runAdminAction } from '../../../netlify/lib/adminCore.mjs'
import { HttpError } from '../../../netlify/lib/http.mjs'
import { seedDemo } from './seed'

const copy = (v) => JSON.parse(JSON.stringify(v ?? null))
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

export async function createDemoBackend() {
  // The seed writes orders "yesterday" and "last week" by moving this clock; afterwards it is now
  let clock = null
  const store = createMemoryCore({
    now: () => clock || new Date(),
    // Photos Hema "uploads" in the demo stay in the page
    publicUrl: (path, type, obj) => `data:${type};base64,${obj.base64}`,
  })
  await seedDemo(store, (date) => {
    clock = date
  })
  clock = null
  const ctx = {
    send: async (messages) => messages.filter(Boolean).map(() => true), // pretend the emails went out
    now: () => new Date(),
    env: { hemaEmail: 'hema@example.com', razorpay: { enabled: true, keyId: 'rzp_live_demo' }, resend: true, mode: 'demo' },
  }
  const user = { id: 'demo', email: 'hema (demo)' }
  return {
    async call(action, body = {}) {
      await wait(120) // feels like a real save
      try {
        return { ok: true, data: copy(await runAdminAction(store, user, action, copy(body), ctx)) }
      } catch (e) {
        if (e instanceof HttpError) return { ok: false, status: e.status, error: e.code, ...e.extra }
        console.error('[demo]', e)
        return { ok: false, status: 500, error: 'server' }
      }
    },
  }
}
