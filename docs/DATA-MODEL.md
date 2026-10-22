# Data model (Supabase)

Created by `supabase/migrations/20261005000001_init.sql`, `20261010000001_admin_complete.sql` and
`20261015000001_launch.sql` (all three, plus the menu seed, in one file: `supabase/setup-all.sql`, written by
`node scripts/setup-sql.mjs`). Tested in real Postgres (PGlite) by `tests/db.test.js` and
`tests/config.test.js` with a small stand-in for what Supabase provides
(`tests/helpers/supabaseShim.js`).

## Where things live

| What | Where | Who changes it |
|---|---|---|
| Menu, prices, options, courier rates and tiers, lead times, limits | `src/config/shop.js` (one file, shared by website and server) | Developer |
| Classes, fees, slot times, seats default | `src/data/classInfo.js` | Developer |
| Hema's changes to prices, sold out, hidden, tub sizes, photos, names, descriptions | `products` table (override columns) + `product-photos` bucket | Hema, admin → Menu |
| Products Hema adds herself | `products` rows with `custom = true` (the row is the whole product) | Hema, admin → Menu → Add a new product |
| The daily keep-alive's last run | `heartbeat` (one row) | `netlify/functions/keep-alive.mjs` |
| UPI, QR, lead times, courier rates, banner, shop open, alert email | `settings` table (override columns) | Hema, admin → Settings |
| Class fees, slot times, seats per slot | `settings.class_settings` | Hema, admin → Classes → Fees & times |
| Closed weekends / slots | `class_blocks` | Hema, admin → Classes → Weekends |
| Orders and their history | `orders`, `order_events` | Customers (through the functions), Razorpay, Hema |
| Class bookings and their history | `class_bookings`, `booking_events` | Customers, Razorpay, Hema |
| Messages (class questions, Contact page) | `class_enquiries` | Customers, Hema |

Both the website and the server compute "what customers see now" the same way:
`applyOverrides(config products, products rows)` and `applySettings(settings row)` in
`src/lib/pricing.js`, `applyClassSettings(settings.class_settings)` in `src/lib/classTimes.js`.
A NULL override means "use the config value".

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
| courier_tier | text | reference: `small` / `large` / `xl` (the config decides; sizes can be heavier) |
| price_status | text, null | `live` / `coming-soon` (tubs) |
| active, sold_out | bool, null | hidden / sold out |
| photo_url | text, null | Hema's photo, the 1200px file (public `product-photos` bucket, https only); the 600px file is the same address with `-600` (src/lib/productPhoto.js) |
| custom | bool | true = Hema added it in the admin: category, names, description, sizes or price and courier_tier all come from the row. Never deleted (Hide = active false), so old orders keep their product. Categories: the four menu ones only |
| display_name, description | jsonb, null | `{ en, kn? }`: Hema's name / description (Kannada falls back to the English). NULL = the config's |
| sort, image, updated_at | | |

Seeded by `supabase/seed.sql` (= `node scripts/seed-menu.mjs --sql`), which fills only the
reference columns.

### `settings` (one row, id = 1)
`upi_id`, `upi_name`, `upi_qr` (data URL, ≤ 400 KB), `lead_standard`, `lead_drawing_extra`,
`courier_rates` (`{ small: { karnataka, outside }, large: {...}, xl: {...} }`), `store_open`,
`closed_message`, `announcement`, `alert_email`, `class_settings`
(`{ fees: { basic: 2500, … }, slots: { morning: { start: '09:00', end: '11:00' }, … }, seats: 8 | null }`),
`updated_at`. NULL = config default. `UPI_ID` / `HEMA_EMAIL` environment variables are the
defaults when the row has none. **The public can read every column except `alert_email` and
`class_settings`.**

### `orders`
| Column | Notes |
|---|---|
| id (uuid), order_code | `DK-YYMMDD-XXXX` (IST date + 4 characters from 23456789ABCDEFGHJKLMNPQRSTUVWXYZ), unique |
| idempotency_key | unique: the same submit twice returns the same order |
| created_at, updated_at, paid_at | paid_at: the first time the payment was confirmed (Razorpay or Hema) |
| customer_name, customer_phone (10 digits), customer_email | |
| address_line1, address_line2, city, landmark, pincode (6 digits), state (id), zone (`karnataka`/`outside`) | the zone comes from the pincode |
| items (jsonb) | snapshot: `[{ productId, category, name {en,kn}, size {id,label}, ragi, nameOnBox, drawing, drawingText, drawingRef, qty, unitPrice, lineTotal, tier }]` |
| subtotal, courier, total | `total = subtotal + courier` is a database check |
| courier_tier (`small`/`large`/`xl`), has_drawing, dispatch_date, notes, lang | |
| payment_method | `razorpay` (when its keys are set) / `upi` (the fallback) |
| payment_status | `pending` → (`submitted`: UPI reference given) → `confirmed` |
| utr (12 digits), payment_screenshot (`payments/...`), payment_submitted_at | UPI fallback |
| razorpay_order_id (unique), razorpay_payment_id | one Razorpay order per order, reused on retries |
| status | `placed` → `payment_confirmed` → `preparing` → `shipped` → `delivered`, or `cancelled` |
| courier_name, tracking_no, tracking_url (https only), cancel_reason, admin_notes, refund_note | |

### `order_events`
`order_id`, `at`, `kind` (`status` / `payment` / `note`), `from_status`, `to_status`, `by`
(`customer`, `razorpay` or the admin's email), `note`. One row per change; Track Order's dates
come from here; the admin shows it as the History.

### `class_bookings`
| Column | Notes |
|---|---|
| id, booking_code | `DK-CL-YYMMDD-XXXX` (IST date it was booked), unique |
| idempotency_key | unique |
| class_id, weekend (a Saturday: database check), slot | |
| name, phone, email, lang | |
| fee | from the class settings at booking time (never from the browser) |
| payment_method, payment_status, utr, razorpay_order_id (unique), razorpay_payment_id, paid_at | as for orders |
| status | `pending` (not paid) → `confirmed`, or `cancelled` |
| cancel_reason, admin_notes, created_at, updated_at | |

A seat is held by a confirmed booking, by one with a UPI reference to check, or by an unpaid one
made in the last 30 minutes. `create_booking()` counts seats under a lock, so two people can't
pay for the last seat.

### `booking_events`
Like `order_events`, for bookings.

### `class_blocks`
`weekend` (Saturday), `slot` (`*` = the whole weekend, or a slot id), `reason`. Closed for booking.

### `class_enquiries` (all website messages)
`id`, `created_at`, `kind` (`class` / `general`), `name`, `phone`, `interest`, `preferred_dates`,
`message`, `lang`, `status` (`new` / `handled`; older rows may say `contacted` / `closed`).

### `admin_users`
`user_id` (→ `auth.users`), `email`, `last_seen_at`. Only accounts listed here can use the admin.
After 30 days without activity the admin function refuses the login until a fresh log in.

### `heartbeat` (one row, id = 1)
`last_run_at`, `runs`. Written once a day by the keep-alive scheduled function, so the free Supabase
project never pauses; shown on /admin/setup. RLS on with no policies: only the service role reads it.

### `rate_limits`
`key`, `window_start`, `hits`. Counted by `hit_rate_limit()`; old rows are cleaned up automatically.

## Security (Row Level Security is ON for every table)

| Who | Can |
|---|---|
| Public (anon / publishable key) | read `products` and the public columns of `settings`. Nothing else: no orders, bookings, events, blocks, messages, rate limits or admin users. |
| Logged-in user who is not an admin | the same as the public (RLS policies need `is_admin()`); sign-ups are switched off anyway |
| Admin (in `admin_users`) | read and update orders, bookings, blocks, messages, menu and settings |
| Netlify Functions (secret / service role key, server only) | everything, after checking and re-pricing the request |

SQL functions `create_order`, `submit_payment`, `admin_update_order`, `create_booking`,
`submit_booking_payment`, `admin_update_booking`, `hit_rate_limit` can be called by the service
role only.

Storage:
- `uploads`: private (no public URL, no policies), images only, 5 MB. `refs/YYYYMMDD/<uuid>.webp`
  (drawing references), `payments/<order>/<uuid>.webp` (payment screenshots). The admin sees them
  through 10-minute signed links.
- `product-photos`: public (they are on the menu), images only, 2 MB, written by the admin
  function; RLS on storage.objects lets only an admin login (`is_admin()`) add, list, replace or remove
  them. `<product>/<timestamp>-1200.webp` + `<product>/<timestamp>-600.webp` (older: `<product>/<timestamp>.webp`).

## Server functions (`netlify/functions`, each at `/api/<name>`)

| Function | Who | What |
|---|---|---|
| `menu` (GET) | everyone | Hema's overrides (incl. photos) + public settings + whether Razorpay is on; cached 60 s at Netlify's edge |
| `create-order` | customers | checks details, re-prices every item and the courier with `src/lib/pricing.js`, refuses tampered prices/totals, sold-out items, bad pincodes, too-early dates; idempotent; Razorpay order if its keys exist, else UPI |
| `order` | customers | one order by code + phone (confirmation page, Track Order) |
| `classes` (GET) | everyone | fees, slot times, the next 8 weekends and what is open (counts only); cached 30 s |
| `create-booking` | customers | checks the weekend, slot, seat and fee; idempotent |
| `booking` | customers | one booking by code + phone |
| `submit-payment` | customers | UPI fallback: the 12-digit UTR (+ screenshot for orders); emails Hema |
| `razorpay-order` | customers | starts (or restarts) a Razorpay payment for an order or booking, amount from the database |
| `razorpay-verify` | customers | checks the payment signature; marks paid; emails Hema and the customer once |
| `razorpay-webhook` | Razorpay | `payment.captured` / `order.paid`, signed, full amount only; repeats change nothing |
| `upload` | customers | drawing reference / payment screenshot (type checked from the bytes, ≤ 5 MB) |
| `class-enquiry` | customers | class questions and Contact messages; emails Hema |
| `upi-qr` (GET) | everyone | Hema's QR image |
| `setup-check` (GET) | owner | green / red per part, no keys, no data |
| `photo` (GET) | local dev only | product photos from the practice store |
| `admin` | admins | login, refresh, forgot, setPassword; then everything in `netlify/lib/adminCore.mjs` |

Abuse protection: a honeypot field, rate limits per IP and per phone (`netlify/lib/limits.mjs`),
at most 10 of one item and 20 different items per order, length limits on every field (also as
database checks).
