import { describe, it, expect, beforeEach } from 'vitest'
import Database from 'better-sqlite3'
import { readFileSync } from 'node:fs'
import worker from '../src/worker/index.mjs'
import { createD1SqliteAdapter } from '../netlify/lib/store/d1SqliteAdapter.mjs'

describe('Cloudflare Worker Entrypoint', () => {
  let d1Db
  let mockAssets
  let env

  beforeEach(() => {
    const sqlite = new Database(':memory:')
    sqlite.exec(readFileSync('d1/setup-all.sql', 'utf8'))
    d1Db = createD1SqliteAdapter(sqlite)

    // Mock Cloudflare Assets binding
    mockAssets = {
      async fetch(request) {
        const url = new URL(request.url)
        if (url.pathname === '/admin/index.html') {
          return new Response('<html>Admin App</html>', {
            status: 200,
            headers: { 'content-type': 'text/html; charset=utf-8' },
          })
        }
        if (url.pathname === '/index.html') {
          return new Response('<html>Storefront App</html>', {
            status: 200,
            headers: { 'content-type': 'text/html; charset=utf-8' },
          })
        }
        if (url.pathname === '/assets/main-123.js') {
          return new Response('console.log("main")', {
            status: 200,
            headers: { 'content-type': 'application/javascript' },
          })
        }
        if (url.pathname === '/products/almond-bar.webp') {
          return new Response('binary-image-data', {
            status: 200,
            headers: { 'content-type': 'image/webp' },
          })
        }
        return new Response('Not Found', { status: 404 })
      },
    }

    env = {
      DB: d1Db,
      ASSETS: mockAssets,
      SITE_URL: 'https://dream-kitchen.test',
      HEMA_EMAIL: 'hema@dreamkitchen.test',
    }
  })

  describe('API Routing', () => {
    it('GET /api/menu returns 200 with menu settings and overrides', async () => {
      const req = new Request('https://dream-kitchen.test/api/menu', { method: 'GET' })
      const res = await worker.fetch(req, env, {})
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.ready).toBe(true)
      expect(data.settings).toBeDefined()
      expect(data.settings.storeOpen).toBe(true)
      expect(data.overrides).toBeDefined()
    })

    it('GET /api/classes returns 200 with schedule', async () => {
      const req = new Request('https://dream-kitchen.test/api/classes', { method: 'GET' })
      const res = await worker.fetch(req, env, {})
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.weekends).toBeDefined()
    })

    it('GET /api/setup-check returns system status', async () => {
      const req = new Request('https://dream-kitchen.test/api/setup-check', { method: 'GET' })
      const res = await worker.fetch(req, env, {})
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.database).toBeDefined()
      expect(data.database.d1).toBe(true)
    })

    it('POST /api/class-enquiry saves enquiry with 201 status', async () => {
      const payload = {
        name: 'Rohan Verma',
        phone: '9845012345',
        interest: 'baking-basics',
        message: 'Interested in weekend workshop',
      }
      const req = new Request('https://dream-kitchen.test/api/class-enquiry', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const res = await worker.fetch(req, env, {})
      expect(res.status).toBe(201)
      const data = await res.json()
      expect(data.ok).toBe(true)
    })

    it('returns 404 for unknown /api/* endpoints', async () => {
      const req = new Request('https://dream-kitchen.test/api/non-existent-route', { method: 'GET' })
      const res = await worker.fetch(req, env, {})
      expect(res.status).toBe(404)
      const data = await res.json()
      expect(data.error).toBe('notFound')
    })
  })

  describe('301 Redirects', () => {
    it('redirects /shop to /menu with 301 status', async () => {
      const req = new Request('https://dream-kitchen.test/shop', { method: 'GET' })
      const res = await worker.fetch(req, env, {})
      expect(res.status).toBe(301)
      expect(res.headers.get('location')).toBe('https://dream-kitchen.test/menu')
    })

    it('redirects /about to /our-story with 301 status', async () => {
      const req = new Request('https://dream-kitchen.test/about', { method: 'GET' })
      const res = await worker.fetch(req, env, {})
      expect(res.status).toBe(301)
      expect(res.headers.get('location')).toBe('https://dream-kitchen.test/our-story')
    })

    it('redirects /classes/booked/* to /classes', async () => {
      const req = new Request('https://dream-kitchen.test/classes/booked/some-code', { method: 'GET' })
      const res = await worker.fetch(req, env, {})
      expect(res.status).toBe(301)
      expect(res.headers.get('location')).toBe('https://dream-kitchen.test/classes')
    })
  })

  describe('Admin Dashboard Protection', () => {
    it('serves admin/index.html with noindex and no-store headers', async () => {
      const req = new Request('https://dream-kitchen.test/admin/orders', { method: 'GET' })
      const res = await worker.fetch(req, env, {})
      expect(res.status).toBe(200)
      const text = await res.text()
      expect(text).toContain('Admin App')
      expect(res.headers.get('x-robots-tag')).toBe('noindex, nofollow')
      expect(res.headers.get('x-frame-options')).toBe('DENY')
      expect(res.headers.get('cache-control')).toBe('no-store')
    })
  })

  describe('Static Assets Caching & Security', () => {
    it('serves /assets/* with 1-year immutable cache', async () => {
      const req = new Request('https://dream-kitchen.test/assets/main-123.js', { method: 'GET' })
      const res = await worker.fetch(req, env, {})
      expect(res.status).toBe(200)
      expect(res.headers.get('cache-control')).toBe('public, max-age=31536000, immutable')
      expect(res.headers.get('x-content-type-options')).toBe('nosniff')
    })

    it('serves /products/* with 7-day cache', async () => {
      const req = new Request('https://dream-kitchen.test/products/almond-bar.webp', { method: 'GET' })
      const res = await worker.fetch(req, env, {})
      expect(res.status).toBe(200)
      expect(res.headers.get('cache-control')).toBe('public, max-age=604800')
    })
  })

  describe('SPA Fallback', () => {
    it('falls back to index.html for client-side navigation routes', async () => {
      const req = new Request('https://dream-kitchen.test/checkout', { method: 'GET' })
      const res = await worker.fetch(req, env, {})
      expect(res.status).toBe(200)
      const text = await res.text()
      expect(text).toContain('Storefront App')
      expect(res.headers.get('cache-control')).toBe('no-cache')
      expect(res.headers.get('x-content-type-options')).toBe('nosniff')
    })
  })
})
