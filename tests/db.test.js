// The Supabase migration (supabase/migrations) in real Postgres (PGlite), with a small shim for
// what Supabase provides (roles, auth.uid(), storage.buckets). Proves the security rules:
// the public can't read or list orders; only Hema's admin account can; the SQL functions are
// for the service role only; and the database itself refuses bad totals and duplicate orders.
import { beforeAll, describe, expect, it } from 'vitest'
import { asRole, freshDatabase } from './helpers/supabaseShim.js'

let db
const HEMA = '11111111-1111-4111-8111-111111111111'
const STRANGER = '22222222-2222-4222-8222-222222222222'

const order = (over = {}) => ({
  order_code: 'DK-261005-7Q4M',
  idempotency_key: 'key-0000000000000001',
  customer_name: 'Asha Rao',
  customer_phone: '9845012345',
  customer_email: 'asha@example.com',
  address_line1: '12, 3rd Cross',
  address_line2: 'Jayanagar',
  city: 'Bengaluru',
  landmark: '',
  pincode: '560011',
  state: 'karnataka',
  zone: 'karnataka',
  items: [{ productId: 'almond-bar', qty: 2, unitPrice: 150, lineTotal: 300 }],
  subtotal: 300,
  courier: 90,
  total: 390,
  courier_tier: 'small',
  has_drawing: false,
  dispatch_date: '2026-10-07',
  notes: '',
  lang: 'en',
  payment_method: 'upi',
  ...over,
})
const create = (tx, p) => tx.query('select * from public.create_order($1::jsonb)', [JSON.stringify(p)]).then((r) => r.rows[0])

beforeAll(async () => {
  db = await freshDatabase()
  await db.query(`insert into auth.users (id, email) values ($1, 'hema@example.com'), ($2, 'someone@example.com')`, [HEMA, STRANGER])
  await db.query('insert into public.admin_users (user_id, email) values ($1, $2)', [HEMA, 'hema@example.com'])
  await asRole(db, 'service_role', null, (tx) => create(tx, order()))
  await db.query(`insert into public.class_enquiries (name, phone, interest) values ('Ravi', '9000012345', 'Chocolate making')`)
  await db.query(`insert into public.products (id, slug, category, name_en, price) values ('almond-bar', 'almond-bar', 'chocolates', 'Almond Bar', 175)`)
}, 60_000)

describe('the public (anon key) can’t see private data', () => {
  it.each(['orders', 'order_events', 'class_enquiries', 'rate_limits', 'admin_users'])('anon: select from %s is refused', async (table) => {
    await expect(asRole(db, 'anon', null, (tx) => tx.query(`select * from public.${table}`))).rejects.toThrow(/permission denied/)
  })

  it('anon can’t insert or change orders either', async () => {
    await expect(asRole(db, 'anon', null, (tx) => tx.query(`update public.orders set total = 1`))).rejects.toThrow(/permission denied/)
    await expect(asRole(db, 'anon', null, (tx) => create(tx, order({ order_code: 'DK-261005-AAAA', idempotency_key: 'key-anon-000000000001' })))).rejects.toThrow(/permission denied/)
  })

  it('anon can’t call the order functions (they are for the Netlify Functions only)', async () => {
    for (const sql of [
      `select public.submit_payment('DK-261005-7Q4M', '9845012345', '123456789012', null)`,
      `select public.admin_update_order('DK-261005-7Q4M', '{"status":"shipped"}'::jsonb, null)`,
      `select public.hit_rate_limit('x', 60, 1)`,
    ])
      await expect(asRole(db, 'anon', null, (tx) => tx.query(sql))).rejects.toThrow(/permission denied/)
  })

  it('anon CAN read the menu overrides and the public settings', async () => {
    const products = await asRole(db, 'anon', null, (tx) => tx.query('select id, price from public.products'))
    expect(products.rows).toEqual([{ id: 'almond-bar', price: 175 }])
    const settings = await asRole(db, 'anon', null, (tx) => tx.query('select id, store_open from public.settings'))
    expect(settings.rows).toEqual([{ id: 1, store_open: true }])
    await expect(asRole(db, 'anon', null, (tx) => tx.query(`update public.settings set store_open = false`))).rejects.toThrow(/permission denied/)
    await expect(asRole(db, 'anon', null, (tx) => tx.query(`update public.products set price = 1`))).rejects.toThrow(/permission denied/)
  })
})

describe('logged-in users', () => {
  it('a signed-up stranger sees no orders, no enquiries, and can’t edit the menu', async () => {
    const orders = await asRole(db, 'authenticated', STRANGER, (tx) => tx.query('select * from public.orders'))
    expect(orders.rows).toEqual([])
    const enquiries = await asRole(db, 'authenticated', STRANGER, (tx) => tx.query('select * from public.class_enquiries'))
    expect(enquiries.rows).toEqual([])
    const upd = await asRole(db, 'authenticated', STRANGER, (tx) => tx.query(`update public.products set price = 1 returning id`))
    expect(upd.rows).toEqual([])
    const s = await asRole(db, 'authenticated', STRANGER, (tx) => tx.query(`update public.settings set store_open = false returning id`))
    expect(s.rows).toEqual([])
  })

  it('Hema (in admin_users) sees and updates orders and enquiries', async () => {
    const orders = await asRole(db, 'authenticated', HEMA, (tx) => tx.query('select order_code from public.orders'))
    expect(orders.rows).toEqual([{ order_code: 'DK-261005-7Q4M' }])
    const upd = await asRole(db, 'authenticated', HEMA, (tx) => tx.query(`update public.orders set admin_notes = 'Call before 5' returning admin_notes`))
    expect(upd.rows).toEqual([{ admin_notes: 'Call before 5' }])
    const e = await asRole(db, 'authenticated', HEMA, (tx) => tx.query('select name from public.class_enquiries'))
    expect(e.rows).toEqual([{ name: 'Ravi' }])
  })
})

describe('the database’s own rules', () => {
  it('create_order: the same idempotency key returns the same order; one "placed" event', async () => {
    const again = await asRole(db, 'service_role', null, (tx) => create(tx, order({ order_code: 'DK-261005-BBBB' })))
    expect(again.order_code).toBe('DK-261005-7Q4M')
    const n = await db.query(`select count(*)::int as n from public.orders`)
    expect(n.rows[0].n).toBe(1)
    const ev = await db.query(`select to_status, by from public.order_events`)
    expect(ev.rows).toEqual([{ to_status: 'placed', by: 'customer' }])
  })

  it('refuses a duplicate order code (the function retries with a new one)', async () => {
    await expect(asRole(db, 'service_role', null, (tx) => create(tx, order({ idempotency_key: 'key-0000000000000002' })))).rejects.toThrow(/orders_order_code_key/)
  })

  it('refuses a total that isn’t items + courier, bad phones, pincodes, codes and statuses', async () => {
    const bad = (over, n) => asRole(db, 'service_role', null, (tx) => create(tx, order({ order_code: `DK-261005-C${n}CC`, idempotency_key: `key-bad-0000000000${n}`, ...over })))
    await expect(bad({ total: 1 }, 2)).rejects.toThrow(/orders_check|check constraint/)
    await expect(bad({ customer_phone: '12345' }, 3)).rejects.toThrow(/check constraint/)
    await expect(bad({ pincode: '056001' }, 4)).rejects.toThrow(/check constraint/)
    await expect(bad({ order_code: 'DK-0001' }, 5)).rejects.toThrow(/check constraint/)
    await expect(bad({ zone: 'mars' }, 6)).rejects.toThrow(/check constraint/)
    await expect(db.query(`update public.orders set status = 'lost'`)).rejects.toThrow(/check constraint/)
    await expect(db.query(`update public.orders set tracking_url = 'javascript:alert(1)'`)).rejects.toThrow(/check constraint/)
  })

  it('submit_payment needs the right phone, and logs a payment event', async () => {
    const wrong = await asRole(db, 'service_role', null, (tx) => tx.query(`select (public.submit_payment('DK-261005-7Q4M', '9000000000', '123456789012', null)).id`))
    expect(wrong.rows[0].id).toBeNull()
    const ok = await asRole(db, 'service_role', null, (tx) => tx.query(`select * from public.submit_payment('DK-261005-7Q4M', '9845012345', '123456789012', null)`))
    expect(ok.rows[0]).toMatchObject({ payment_status: 'submitted', utr: '123456789012' })
    await expect(db.query(`update public.orders set utr = '12'`)).rejects.toThrow(/check constraint/)
  })

  it('admin_update_order changes the order and logs who did it, in one go', async () => {
    const r = await asRole(db, 'service_role', null, (tx) =>
      tx.query(`select * from public.admin_update_order('DK-261005-7Q4M', '{"status":"payment_confirmed","payment_status":"confirmed"}'::jsonb, '{"to_status":"payment_confirmed","by":"hema@example.com"}'::jsonb)`),
    )
    expect(r.rows[0]).toMatchObject({ status: 'payment_confirmed', payment_status: 'confirmed' })
    const ev = await db.query(`select from_status, to_status, by from public.order_events order by id desc limit 1`)
    expect(ev.rows[0]).toEqual({ from_status: 'placed', to_status: 'payment_confirmed', by: 'hema@example.com' })
    const none = await asRole(db, 'service_role', null, (tx) => tx.query(`select (public.admin_update_order('DK-261005-ZZZZ', '{}'::jsonb, null)).id`))
    expect(none.rows[0].id).toBeNull()
  })

  it('hit_rate_limit counts per key and window', async () => {
    const hit = () => asRole(db, 'service_role', null, (tx) => tx.query(`select public.hit_rate_limit('ip:1.2.3.4', 3600, 2) as ok`)).then((r) => r.rows[0].ok)
    expect([await hit(), await hit(), await hit()]).toEqual([true, true, false])
  })

  it('the uploads bucket is private, images only, 5 MB', async () => {
    const b = await db.query(`select public, file_size_limit, allowed_mime_types from storage.buckets where id = 'uploads'`)
    expect(b.rows[0]).toEqual({ public: false, file_size_limit: 5242880, allowed_mime_types: ['image/jpeg', 'image/png', 'image/webp'] })
  })

  it('RLS is on for every table', async () => {
    const r = await db.query(`select relname, relrowsecurity from pg_class where relnamespace = 'public'::regnamespace and relkind = 'r' order by relname`)
    expect(r.rows.every((x) => x.relrowsecurity)).toBe(true)
    expect(r.rows.map((x) => x.relname)).toEqual(['admin_users', 'class_enquiries', 'order_events', 'orders', 'products', 'rate_limits', 'settings'])
  })
})

describe('supabase/seed.sql (the menu from the config)', () => {
  it('loads all 17 products with no price overrides, and is safe to run twice', async () => {
    const { readFileSync } = await import('node:fs')
    const fresh = await freshDatabase()
    const sql = readFileSync('supabase/seed.sql', 'utf8')
    await fresh.exec(sql)
    await fresh.query(`update public.products set price = 175 where id = 'almond-bar'`) // Hema's change
    await fresh.exec(sql)
    const r = await fresh.query(`select count(*)::int as n, count(price)::int as priced, count(sizes)::int as sized from public.products`)
    expect(r.rows[0]).toEqual({ n: 17, priced: 1, sized: 0 })
    const bar = await fresh.query(`select price from public.products where id = 'almond-bar'`)
    expect(bar.rows[0].price).toBe(175)
  })
})
