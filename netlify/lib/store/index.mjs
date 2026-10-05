// Picks the store for this environment (netlify/lib/env.mjs) and keeps one per function instance.
import { backendMode, config } from '../env.mjs'
import { HttpError } from '../http.mjs'
import { createMemoryStore } from './memory.mjs'
import { createSupabaseStore } from './supabase.mjs'

let cached = null
let override = null

/** Tests inject their own store */
export const setStore = (store) => {
  override = store
}

export function getStore() {
  if (override) return override
  const mode = backendMode()
  if (cached?.mode === mode) return cached.store
  let store
  if (mode === 'supabase') store = createSupabaseStore({ url: config.supabaseUrl, serviceKey: config.serviceKey, anonKey: config.anonKey })
  else if (mode === 'mock') store = createMemoryStore({ dir: config.devDataDir, admin: config.devAdmin })
  else throw new HttpError(503, 'notReady') // deployed without Supabase: never pretend an order was saved
  cached = { mode, store }
  return store
}
