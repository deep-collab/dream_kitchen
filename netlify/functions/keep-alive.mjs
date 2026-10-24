// Once a day (Netlify scheduled function): a small read and write in the database, so the free
// Supabase project never pauses (free projects pause after a week without activity). The last run
// shows on /admin/setup. To run it by hand: Netlify -> Logs -> Functions -> keep-alive -> Run now.
import { getStore } from '../lib/store/index.mjs'
import { backendMode } from '../lib/env.mjs'

export default async () => {
  if (backendMode() === 'missing') {
    console.log('keep-alive: the database is not set up yet')
    return new Response('not set up')
  }
  const store = getStore()
  // The same read a visitor's menu makes, then the stamp the setup check shows
  await store.listProducts()
  const beat = await store.beat(new Date().toISOString())
  console.log(`keep-alive: ok, run ${beat?.runs ?? '?'}`)
  return new Response('ok')
}

// Every day at 03:30 UTC (9:00 in the morning in India)
export const config = { schedule: '30 3 * * *' }
