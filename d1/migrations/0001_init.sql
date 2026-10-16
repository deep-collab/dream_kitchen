-- Dream Kitchen: D1 SQLite Database Schema
-- Run via: wrangler d1 migrations apply DB (--local for local dev)

-- ---------------------------------------------------------------------------
-- 1. Admin Users & Authentication
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS admin_users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  last_seen_at TEXT
);

CREATE TABLE IF NOT EXISTS admin_sessions (
  token TEXT PRIMARY KEY,
  refresh_token TEXT NOT NULL UNIQUE,
  user_id TEXT NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX IF NOT EXISTS admin_sessions_user ON admin_sessions(user_id);
CREATE INDEX IF NOT EXISTS admin_sessions_refresh ON admin_sessions(refresh_token);

CREATE TABLE IF NOT EXISTS admin_password_resets (
  token TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- ---------------------------------------------------------------------------
-- 2. Menu: Products & Categories
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL,
  name_en TEXT NOT NULL,
  name_kn TEXT NOT NULL DEFAULT '',
  sizes TEXT, -- JSON array of [{ id, label, grams, price }]
  price INTEGER CHECK (price IS NULL OR (price > 0 AND price <= 100000)),
  ragi_price INTEGER CHECK (ragi_price IS NULL OR (ragi_price > 0 AND ragi_price <= 100000)),
  options TEXT NOT NULL DEFAULT '{}', -- JSON object
  courier_tier TEXT NOT NULL DEFAULT 'small' CHECK (courier_tier IN ('small', 'large', 'xl')),
  price_status TEXT CHECK (price_status IS NULL OR price_status IN ('live', 'coming-soon')),
  active INTEGER, -- 1/0
  sold_out INTEGER, -- 1/0
  sort INTEGER NOT NULL DEFAULT 0,
  image TEXT,
  photo_url TEXT CHECK (photo_url IS NULL OR (length(photo_url) <= 500 AND (photo_url LIKE 'https://%' OR photo_url LIKE '/api/photo/%'))),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- ---------------------------------------------------------------------------
-- 3. Settings: Singleton row (id = 1)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS settings (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  upi_id TEXT CHECK (upi_id IS NULL OR length(upi_id) <= 100),
  upi_name TEXT CHECK (upi_name IS NULL OR length(upi_name) <= 40),
  upi_qr TEXT CHECK (upi_qr IS NULL OR length(upi_qr) <= 400000), -- data:image/...
  lead_standard INTEGER CHECK (lead_standard IS NULL OR (lead_standard >= 0 AND lead_standard <= 30)),
  lead_drawing_extra INTEGER CHECK (lead_drawing_extra IS NULL OR (lead_drawing_extra >= 0 AND lead_drawing_extra <= 30)),
  courier_rates TEXT, -- JSON object
  store_open INTEGER NOT NULL DEFAULT 1 CHECK (store_open IN (0, 1)),
  closed_message TEXT CHECK (closed_message IS NULL OR length(closed_message) <= 200),
  announcement TEXT CHECK (announcement IS NULL OR length(announcement) <= 200),
  alert_email TEXT CHECK (alert_email IS NULL OR (length(alert_email) <= 120 AND alert_email LIKE '%@%.%')),
  class_settings TEXT, -- JSON object
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
INSERT OR IGNORE INTO settings (id, store_open, updated_at) VALUES (1, 1, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'));

-- ---------------------------------------------------------------------------
-- 4. Orders & Events
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  order_code TEXT NOT NULL UNIQUE,
  idempotency_key TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),

  customer_name TEXT NOT NULL CHECK (length(customer_name) BETWEEN 2 AND 60),
  customer_phone TEXT NOT NULL CHECK (length(customer_phone) = 10),
  customer_email TEXT CHECK (customer_email IS NULL OR length(customer_email) <= 120),
  address_line1 TEXT NOT NULL CHECK (length(address_line1) BETWEEN 3 AND 120),
  address_line2 TEXT NOT NULL CHECK (length(address_line2) BETWEEN 2 AND 120),
  city TEXT NOT NULL CHECK (length(city) BETWEEN 2 AND 60),
  landmark TEXT CHECK (landmark IS NULL OR length(landmark) <= 80),
  pincode TEXT NOT NULL CHECK (length(pincode) = 6),
  state TEXT NOT NULL CHECK (length(state) <= 40),
  zone TEXT NOT NULL CHECK (zone IN ('karnataka', 'outside')),

  items TEXT NOT NULL, -- JSON array of items
  subtotal INTEGER NOT NULL CHECK (subtotal > 0),
  courier INTEGER NOT NULL CHECK (courier >= 0),
  total INTEGER NOT NULL CHECK (total = subtotal + courier),
  courier_tier TEXT NOT NULL CHECK (courier_tier IN ('small', 'large', 'xl')),
  has_drawing INTEGER NOT NULL DEFAULT 0 CHECK (has_drawing IN (0, 1)),
  dispatch_date TEXT NOT NULL,
  notes TEXT CHECK (notes IS NULL OR length(notes) <= 300),
  lang TEXT NOT NULL DEFAULT 'en' CHECK (lang IN ('en', 'kn')),

  payment_method TEXT NOT NULL DEFAULT 'upi' CHECK (payment_method IN ('upi', 'razorpay')),
  payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'submitted', 'confirmed')),
  utr TEXT CHECK (utr IS NULL OR length(utr) = 12),
  payment_screenshot TEXT,
  payment_submitted_at TEXT,
  razorpay_order_id TEXT UNIQUE,
  razorpay_payment_id TEXT,
  paid_at TEXT,

  status TEXT NOT NULL DEFAULT 'placed' CHECK (status IN ('placed', 'payment_confirmed', 'preparing', 'shipped', 'delivered', 'cancelled')),
  courier_name TEXT CHECK (courier_name IS NULL OR length(courier_name) <= 40),
  tracking_no TEXT CHECK (tracking_no IS NULL OR length(tracking_no) <= 40),
  tracking_url TEXT CHECK (tracking_url IS NULL OR (length(tracking_url) <= 300 AND tracking_url LIKE 'https://%')),
  cancel_reason TEXT CHECK (cancel_reason IS NULL OR length(cancel_reason) <= 200),
  admin_notes TEXT CHECK (admin_notes IS NULL OR length(admin_notes) <= 1000),
  refund_note TEXT CHECK (refund_note IS NULL OR length(refund_note) <= 300)
);

CREATE INDEX IF NOT EXISTS orders_created_at ON orders (created_at DESC);
CREATE INDEX IF NOT EXISTS orders_status ON orders (status, payment_status);
CREATE INDEX IF NOT EXISTS orders_phone ON orders (customer_phone);
CREATE INDEX IF NOT EXISTS orders_paid_at ON orders (paid_at DESC);

CREATE TABLE IF NOT EXISTS order_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id TEXT NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
  at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  kind TEXT NOT NULL DEFAULT 'status' CHECK (kind IN ('status', 'payment', 'note')),
  from_status TEXT,
  to_status TEXT NOT NULL,
  by TEXT NOT NULL CHECK (length(by) <= 120),
  note TEXT CHECK (note IS NULL OR length(note) <= 300)
);
CREATE INDEX IF NOT EXISTS order_events_order ON order_events (order_id, at ASC);

-- ---------------------------------------------------------------------------
-- 5. Class Bookings & Events
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS class_bookings (
  id TEXT PRIMARY KEY,
  booking_code TEXT NOT NULL UNIQUE,
  idempotency_key TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),

  class_id TEXT NOT NULL CHECK (length(class_id) <= 30),
  weekend TEXT NOT NULL, -- YYYY-MM-DD (Saturday)
  slot TEXT NOT NULL CHECK (length(slot) <= 20),
  name TEXT NOT NULL CHECK (length(name) BETWEEN 2 AND 60),
  phone TEXT NOT NULL CHECK (length(phone) = 10),
  email TEXT CHECK (email IS NULL OR length(email) <= 120),
  fee INTEGER NOT NULL CHECK (fee > 0 AND fee <= 100000),
  lang TEXT NOT NULL DEFAULT 'en' CHECK (lang IN ('en', 'kn')),

  payment_method TEXT NOT NULL DEFAULT 'razorpay' CHECK (payment_method IN ('upi', 'razorpay')),
  payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'submitted', 'confirmed')),
  utr TEXT CHECK (utr IS NULL OR length(utr) = 12),
  razorpay_order_id TEXT UNIQUE,
  razorpay_payment_id TEXT,
  paid_at TEXT,

  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled')),
  cancel_reason TEXT CHECK (cancel_reason IS NULL OR length(cancel_reason) <= 200),
  admin_notes TEXT CHECK (admin_notes IS NULL OR length(admin_notes) <= 1000)
);

CREATE INDEX IF NOT EXISTS class_bookings_slot ON class_bookings (weekend, slot, status);
CREATE INDEX IF NOT EXISTS class_bookings_created ON class_bookings (created_at DESC);
CREATE INDEX IF NOT EXISTS class_bookings_phone ON class_bookings (phone);

CREATE TABLE IF NOT EXISTS booking_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  booking_id TEXT NOT NULL REFERENCES class_bookings (id) ON DELETE CASCADE,
  at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  kind TEXT NOT NULL DEFAULT 'status' CHECK (kind IN ('status', 'payment', 'note')),
  from_status TEXT,
  to_status TEXT NOT NULL,
  by TEXT NOT NULL CHECK (length(by) <= 120),
  note TEXT CHECK (note IS NULL OR length(note) <= 300)
);
CREATE INDEX IF NOT EXISTS booking_events_booking ON booking_events (booking_id, at ASC);

CREATE TABLE IF NOT EXISTS class_blocks (
  weekend TEXT NOT NULL,
  slot TEXT NOT NULL DEFAULT '*',
  reason TEXT CHECK (reason IS NULL OR length(reason) <= 120),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  PRIMARY KEY (weekend, slot)
);

-- ---------------------------------------------------------------------------
-- 6. Enquiries (Class & General)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS class_enquiries (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  name TEXT NOT NULL CHECK (length(name) BETWEEN 2 AND 60),
  phone TEXT NOT NULL CHECK (length(phone) = 10),
  interest TEXT NOT NULL CHECK (length(interest) BETWEEN 2 AND 80),
  preferred_dates TEXT CHECK (preferred_dates IS NULL OR length(preferred_dates) <= 120),
  message TEXT CHECK (message IS NULL OR length(message) <= 500),
  lang TEXT NOT NULL DEFAULT 'en' CHECK (lang IN ('en', 'kn')),
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'closed', 'handled')),
  kind TEXT NOT NULL DEFAULT 'class' CHECK (kind IN ('class', 'general'))
);
CREATE INDEX IF NOT EXISTS class_enquiries_created ON class_enquiries (created_at DESC);

-- ---------------------------------------------------------------------------
-- 7. Rate Limits
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS rate_limits (
  key TEXT NOT NULL,
  window_start TEXT NOT NULL,
  hits INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (key, window_start)
);

-- ---------------------------------------------------------------------------
-- 8. Storage Objects (Fallback when R2 is not bound)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS objects (
  path TEXT PRIMARY KEY,
  content_type TEXT NOT NULL,
  data BLOB NOT NULL,
  is_public INTEGER NOT NULL DEFAULT 0 CHECK (is_public IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
