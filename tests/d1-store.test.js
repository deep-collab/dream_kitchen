import { describe, it, expect, beforeEach } from 'vitest'
import Database from 'better-sqlite3'
import { readFileSync } from 'node:fs'
import { createD1SqliteAdapter } from '../netlify/lib/store/d1SqliteAdapter.mjs'
import { createD1Store, hashPassword, verifyPassword } from '../netlify/lib/store/d1.mjs'

describe('Cloudflare D1 Store', () => {
  let sqlite
  let store

  beforeEach(() => {
    sqlite = new Database(':memory:')
    const sql = readFileSync('d1/setup-all.sql', 'utf8')
    sqlite.exec(sql)
    const d1 = createD1SqliteAdapter(sqlite)
    store = createD1Store(d1)
  })

  describe('Password Hashing & Web Crypto', () => {
    it('generates consistent verification with salt and hash', async () => {
      const { salt, hash } = await hashPassword('MySecret123')
      expect(salt).toHaveLength(32) // 16 bytes = 32 hex chars
      expect(hash).toHaveLength(64) // 32 bytes = 64 hex chars

      const match = await verifyPassword('MySecret123', salt, hash)
      expect(match).toBe(true)

      const wrong = await verifyPassword('WrongSecret', salt, hash)
      expect(wrong).toBe(false)
    })
  })

  describe('Menu & Products', () => {
    it('loads all 17 seeded products with proper json fields and boolean types', async () => {
      const items = await store.listProducts()
      expect(items).toHaveLength(17)
      const almond = items.find((p) => p.slug === 'almond-bar')
      expect(almond).toBeDefined()
      expect(almond.name_en).toBe('Almond Bar')
      expect(almond.courier_tier).toBe('small')
      expect(typeof almond.options).toBe('object')
    })

    it('updates product pricing and flags', async () => {
      const updated = await store.updateProduct('almond-bar', { price: 350, sold_out: true })
      expect(updated.price).toBe(350)
      expect(updated.sold_out).toBe(true)

      const reloaded = await store.listProducts()
      const found = reloaded.find((p) => p.id === 'almond-bar')
      expect(found.price).toBe(350)
      expect(found.sold_out).toBe(true)
    })
  })

  describe('Settings', () => {
    it('retrieves default settings and supports partial updates', async () => {
      const initial = await store.getSettings()
      expect(initial.store_open).toBe(true)

      await store.updateSettings({
        upi_id: 'dreamkitchen@okaxis',
        store_open: false,
        closed_message: 'Closed for festive break',
      })

      const updated = await store.getSettings()
      expect(updated.upi_id).toBe('dreamkitchen@okaxis')
      expect(updated.store_open).toBe(false)
      expect(updated.closed_message).toBe('Closed for festive break')
    })
  })

  describe('Orders Flow', () => {
    const sampleOrder = {
      order_code: 'DK-261016-D101',
      idempotency_key: 'idem-d1-01',
      customer_name: 'Priya Sharma',
      customer_phone: '9845011111',
      customer_email: 'priya@example.com',
      address_line1: '42 MG Road',
      address_line2: 'Flat 302',
      city: 'Bengaluru',
      pincode: '560001',
      state: 'Karnataka',
      zone: 'karnataka',
      items: [{ id: 'almond-bar', name: 'Almond Bar', qty: 2, price: 300, total: 600 }],
      subtotal: 600,
      courier: 80,
      total: 680,
      courier_tier: 'small',
      has_drawing: false,
      dispatch_date: '2026-10-22',
      lang: 'en',
      payment_method: 'upi',
      status: 'placed',
    }

    it('creates an order, handles idempotency, and records the initial event', async () => {
      const res = await store.createOrder(sampleOrder)
      expect(res.created).toBe(true)
      expect(res.row.order_code).toBe('DK-261016-D101')
      expect(res.row.total).toBe(680)

      // Event recorded
      const events = await store.getOrderEvents(res.row.id)
      expect(events).toHaveLength(1)
      expect(events[0].to_status).toBe('placed')

      // Idempotency: exact duplicate returns created: false without error
      const dup = await store.createOrder(sampleOrder)
      expect(dup.created).toBe(false)
      expect(dup.row.id).toBe(res.row.id)
    })

    it('enforces total = subtotal + courier constraint', async () => {
      const badOrder = { ...sampleOrder, idempotency_key: 'idem-bad', order_code: 'DK-261016-BAD1', total: 999 }
      await expect(store.createOrder(badOrder)).rejects.toThrow()
    })

    it('submits payment with UTR and logs payment event', async () => {
      await store.createOrder(sampleOrder)
      const updated = await store.submitPayment('DK-261016-D101', '9845011111', '123456789012')
      expect(updated.payment_status).toBe('submitted')
      expect(updated.utr).toBe('123456789012')

      const events = await store.getOrderEvents(updated.id)
      expect(events).toHaveLength(2)
      expect(events[1].kind).toBe('payment')
      expect(events[1].to_status).toBe('submitted')
    })

    it('admin updates order status and notes', async () => {
      await store.createOrder(sampleOrder)
      const updated = await store.adminUpdateOrder(
        'DK-261016-D101',
        { payment_status: 'confirmed', status: 'preparing' },
        { kind: 'status', to_status: 'preparing', by: 'Hema', note: 'Payment verified' },
      )
      expect(updated.payment_status).toBe('confirmed')
      expect(updated.status).toBe('preparing')
      expect(updated.paid_at).toBeDefined()
    })
  })

  describe('Class Bookings & Seat Limit Concurrency', () => {
    const sampleBooking = {
      booking_code: 'DK-CL-261024-D101',
      idempotency_key: 'idem-bk-01',
      class_id: 'chocolate-making',
      weekend: '2026-10-24',
      slot: 'sat-morning',
      name: 'Sunita Rao',
      phone: '9845022222',
      email: 'sunita@example.com',
      fee: 2500,
      lang: 'en',
    }

    it('creates booking and enforces maxSeats limit', async () => {
      const b1 = await store.createBooking(sampleBooking, 2)
      expect(b1.created).toBe(true)

      const b2 = await store.createBooking({
        ...sampleBooking,
        booking_code: 'DK-CL-261024-D102',
        idempotency_key: 'idem-bk-02',
        phone: '9845033333',
        name: 'Anita Roy',
      }, 2)
      expect(b2.created).toBe(true)

      // 3rd booking exceeds capacity of 2
      await expect(
        store.createBooking({
          ...sampleBooking,
          booking_code: 'DK-CL-261024-D103',
          idempotency_key: 'idem-bk-03',
          phone: '9845044444',
          name: 'Kavita Das',
        }, 2),
      ).rejects.toMatchObject({ code: 'P0001', message: 'slot_full' })
    })

    it('allows blocking and unblocking slots', async () => {
      await store.setBlock('2026-11-07', 'sat-morning', 'Holiday')
      const blocks = await store.listBlocks()
      expect(blocks).toHaveLength(1)
      expect(blocks[0].weekend).toBe('2026-11-07')
      expect(blocks[0].reason).toBe('Holiday')

      await store.removeBlock('2026-11-07', 'sat-morning')
      const after = await store.listBlocks()
      expect(after).toHaveLength(0)
    })
  })

  describe('Admin Auth & Session Lifecycle', () => {
    it('creates admin, verifies sign in, user session, and password update', async () => {
      await store.auth.createAdmin('hema@dreamkitchen.in', 'StrongPassword123')
      const count = await store.auth.countAdmins()
      expect(count).toBe(1)

      // Sign in
      const session = await store.auth.signIn('hema@dreamkitchen.in', 'StrongPassword123')
      expect(session).toBeDefined()
      expect(session.access_token).toBeDefined()
      expect(session.refresh_token).toBeDefined()

      // Get user from token
      const user = await store.auth.getUser(session.access_token)
      expect(user.email).toBe('hema@dreamkitchen.in')

      // Refresh token
      const refreshed = await store.auth.refresh(session.refresh_token)
      expect(refreshed.access_token).toBeDefined()

      // Password update
      const updated = await store.auth.updatePassword(refreshed.access_token, 'NewSecurePass456')
      expect(updated).toBe(true)

      // Old password fails
      const oldLogin = await store.auth.signIn('hema@dreamkitchen.in', 'StrongPassword123')
      expect(oldLogin).toBeNull()

      // New password succeeds
      const newLogin = await store.auth.signIn('hema@dreamkitchen.in', 'NewSecurePass456')
      expect(newLogin).toBeDefined()
    })
  })

  describe('Rate Limiter', () => {
    it('allows hits up to max and rejects when exceeded', async () => {
      const key = 'test-ip:127.0.0.1'
      expect(await store.hitRateLimit(key, 60, 2)).toBe(true)
      expect(await store.hitRateLimit(key, 60, 2)).toBe(true)
      expect(await store.hitRateLimit(key, 60, 2)).toBe(false)
    })
  })

  describe('Health check', () => {
    it('reports reachable, tables, and admin count', async () => {
      const h1 = await store.health()
      expect(h1.reachable).toBe(true)
      expect(h1.tables).toBe(true)
      expect(h1.adminCount).toBe(0)

      await store.auth.createAdmin('admin@dreamkitchen.in', 'Password123')
      const h2 = await store.health()
      expect(h2.adminCount).toBe(1)
    })
  })
})
