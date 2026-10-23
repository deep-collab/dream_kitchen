// Picks the store for this environment (netlify/lib/env.mjs) and keeps one per function instance.
import { backendMode, config, getWorkerEnv } from '../env.mjs'
import { HttpError } from '../http.mjs'
import { createMemoryStore } from './memory.mjs'
import { createSupabaseStore } from './supabase.mjs'
import { createD1Store } from './d1.mjs'

let cached = null
let override = null
let d1Instance = null

/** Tests inject their own store */
export const setStore = (store) => {
  override = store
}

/** Injects or overrides the D1 database instance */
export const setD1Instance = (d1) => {
  d1Instance = d1
  cached = null
}

export function getStore(d1Db = null) {
  if (override) return override
  const db = d1Db || d1Instance || getWorkerEnv()?.DB
  if (db) {
    if (cached?.db === db) return cached.store
    const workerEnv = getWorkerEnv()
    const store = createD1Store(db, { siteUrl: config.siteUrl, r2Bucket: workerEnv?.BUCKET || null })
    cached = { db, store }
    return store
  }

  const mode = backendMode()
  if (cached?.mode === mode) return cached.store
  let store
  if (mode === 'supabase') store = createSupabaseStore({ url: config.supabaseUrl, serviceKey: config.serviceKey, anonKey: config.anonKey })
  else if (mode === 'mock') store = createMemoryStore({ dir: config.devDataDir, admin: config.devAdmin })
  else throw new HttpError(503, 'notReady') // deployed without database: never pretend an order was saved
  cached = { mode, store }
  return store
}
