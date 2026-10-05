# Data model (Supabase)

Created by `supabase/migrations/20261005000001_init.sql`. Tested in real Postgres (PGlite) by
`tests/db.test.js` with a small stand-in for what Supabase provides (`tests/helpers/supabaseShim.js`).

## Where things live

| What | Where | Who changes it |
|---|---|---|
| Menu, prices, options, courier rates and tiers, lead times, limits | `src/config/shop.js` (one file, shared by website and server) | Developer |
| Hema's changes to prices, sold out, hidden, tub sizes | `products` table (override columns) | Hema, in /admin → Menu |
| UPI, QR, lead times, courier rates, banner, shop open | `settings` table (override columns) | Hema, in /admin → Settings |
| Orders, their history, class enquiries | `orders`, `order_events`, `class_enquiries` | Customers (through the functions) and Hema |

Both the website and the server compute "what customers see now" the same way:
`applyOverrides(config products, products rows)` and `applySettings(settings row)` in
`src/lib/pricing.js`. A NULL override column means "use the config value", so editing the config
still works unless Hema changed that same field.

## Tables

### `products` (Hema's menu changes)
| Column | Type | Notes |
|---|---|---|
| id, slug | text | product id from the config, e.g. `pista-delight-box` |
| category | text | `brownie-tubs`, `delight-boxes`, `brownies`, `chocolates`, `customize` |
| name_en, name_kn | text | reference copy of the names (the site shows the config names) |
| sizes | jsonb, null | `[{ id, label?, grams?, price }]`; null = config sizes |
| price | int, null | fixed-price items |
| ragi_price | int, null | "Make it Ragi" extra |
| options | jsonb | reference: `{ name: true, drawing: true }` or `{ drawing: 'included' }` |
| courier_tier | text | reference: `small` / `large` (the config decides; sizes can be large) |
| price_status | text, null | `live` / `coming-soon` (tubs) |
| active, sold_out | bool, null | hidden / sold out |
| sort, image, updated_at | | |

Seeded by `supabase/seed.sql` (= `node scripts/seed-menu.mjs --sql`), which fills only the
reference columns.

### `settings` (one row, id = 1)
`upi_id`, `upi_name`, `upi_qr` (data URL, ≤ 400 KB), `lead_standard`, `lead_drawing_extra`,
`courier_rates` (`{ small: { karnataka, outside }, large: {...} }`), `store_open`, `closed_message`,
`announcement`, `updated_at`. NULL = config default. The `UPI_ID` environment variable is the
default UPI ID when the row has none.

### `orders`
| Column | Notes |
|---|---|
| id (uuid), order_code | `DK-YYMMDD-XXXX` (IST date + 4 characters from 23456789ABCDEFGHJKLMNPQRSTUVWXYZ), unique |
| idempotency_key | unique: the same submit twice returns the same order |
| created_at, updated_at | |
| customer_name, customer_phone (10 digits), customer_email | |
| address_line1, address_line2, city, landmark, pincode (6 digits), state (id), zone (`karnataka`/`outside`) | the zone comes from the pincode |
| items (jsonb) | snapshot: `[{ productId, category, name {en,kn}, size {id,label}, ragi, nameOnBox, drawing, drawingText, drawingRef, qty, unitPrice, lineTotal, tier }]` |
| subtotal, courier, total | `total = subtotal + courier` is a database check |
| courier_tier, has_drawing, dispatch_date, notes, lang | |
| payment_method | `upi` / `razorpay` |
| payment_status | `pending` → `submitted` (UTR given) → `confirmed` |
| utr (12 digits), payment_screenshot (`payments/...`), payment_submitted_at | |
| razorpay_order_id, razorpay_payment_id | Phase 2 payments |
| status | `placed` → `payment_confirmed` → `preparing` → `shipped` → `delivered`, or `cancelled` |
| courier_name, tracking_no, tracking_url (https only), cancel_reason, admin_notes | |

### `order_events`
`order_id`, `at`, `kind` (`status` / `payment` / `note`), `from_status`, `to_status`, `by`
(`customer`, `razorpay` or Hema's email), `note`. One row per change; Track Order's dates come from here.

### `class_enquiries`
`id`, `created_at`, `name`, `phone`, `interest`, `preferred_dates`, `message`, `lang`, `status`
(`new` / `contacted` / `closed`).

### `admin_users`
`user_id` (→ `auth.users`), `email`. Only accounts listed here can use the admin.

### `rate_limits`
`key`, `window_start`, `hits`. Counted by `hit_rate_limit()`; old rows are cleaned up automatically.

## Security (Row Level Security is ON for every table)

| Who | Can |
|---|---|
| Public (anon key) | read `products` and `settings` only. No access at all to orders, events, enquiries, rate limits, admin users. |
| Logged-in user who is not an admin | the same as the public (RLS policies need `is_admin()`) |
| Hema (in `admin_users`) | read and update orders, enquiries, menu and settings |
| Netlify Functions (service role key, server only) | everything, after checking and re-pricing the request |

SQL functions `create_order`, `submit_payment`, `admin_update_order`, `hit_rate_limit` can be
called by the service role only.

Storage bucket `uploads` is private (no public URL, no policies): images only (JPEG, PNG, WebP),
5 MB max. Paths: `refs/YYYYMMDD/<uuid>.webp` (drawing references), `payments/<order>/<uuid>.webp`
(payment screenshots). Hema sees them through 10-minute signed links made by the admin function.

## Server functions (`netlify/functions`, each at `/api/<name>`)

| Function | Who | What |
|---|---|---|
| `menu` (GET) | everyone | Hema's overrides + public settings; cached 60 s at Netlify's edge |
| `create-order` | customers | checks details, re-prices every item and the courier with `src/lib/pricing.js`, refuses tampered prices/totals, sold-out items, bad pincodes, too-early dates; idempotent; emails Hema (and the customer) |
| `order` | customers | one order by code + phone (confirmation page, Track Order) |
| `submit-payment` | customers | the 12-digit UTR (+ optional screenshot) |
| `upload` | customers | drawing reference / payment screenshot (type checked from the bytes, ≤ 5 MB) |
| `class-enquiry` | customers | saves the enquiry, emails Hema |
| `upi-qr` (GET) | everyone | Hema's QR image |
| `admin` | Hema | login, refresh, orders, order, orderAction, menu, updateProduct, settings, updateSettings, enquiries, updateEnquiry |
| `razorpay-order`, `razorpay-verify`, `razorpay-webhook` | customers / Razorpay | Phase 2, off until the keys exist |

Abuse protection: a honeypot field, rate limits per IP and per phone (`netlify/lib/limits.mjs`),
at most 10 of one item and 20 different items per order, length limits on every field (also as
database checks).
