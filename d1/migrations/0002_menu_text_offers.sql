-- Dream Kitchen: Hema's names and descriptions, products she adds herself, Customize page tile
-- photos, and offers (24 Oct 2026).
-- Only ADDS new tables: no existing table, column or row is changed or deleted, so it is safe to
-- run on the live database (orders, prices, products and settings stay exactly as they are).
-- Run via: wrangler d1 migrations apply DB (--local for local dev, --remote for the live one)

-- ---------------------------------------------------------------------------
-- 1. Product names, descriptions and added products
-- ---------------------------------------------------------------------------
-- One row per product Hema renamed, described or added. The product id never changes, so photos,
-- prices and old orders (which keep their own copy of the name) stay correct.
-- NULL = the name / description from src/config/shop.js. description_en = '' = no description.
-- added = 1: a product Hema added in admin -> Menu (it lives only in the products table).
CREATE TABLE IF NOT EXISTS product_extras (
  product_id TEXT PRIMARY KEY,
  name_en TEXT CHECK (name_en IS NULL OR length(name_en) BETWEEN 2 AND 80),
  name_kn TEXT CHECK (name_kn IS NULL OR length(name_kn) <= 80),
  description_en TEXT CHECK (description_en IS NULL OR length(description_en) <= 200),
  description_kn TEXT CHECK (description_kn IS NULL OR length(description_kn) <= 200),
  added INTEGER NOT NULL DEFAULT 0 CHECK (added IN (0, 1)),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- ---------------------------------------------------------------------------
-- 2. Customize page tile photos
-- ---------------------------------------------------------------------------
-- tile: 'delight-box' (Delight Box with a name or a drawing) or 'drawing-bar' (Drawing Chocolate
-- Bar). No row = the built-in photo.
CREATE TABLE IF NOT EXISTS tile_photos (
  tile TEXT PRIMARY KEY CHECK (length(tile) <= 40),
  photo_url TEXT NOT NULL CHECK (length(photo_url) <= 500 AND (photo_url LIKE 'https://%' OR photo_url LIKE '/api/photo/%')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- ---------------------------------------------------------------------------
-- 3. Offers (display only: they never change a price)
-- ---------------------------------------------------------------------------
-- Live while active = 1 and today (Indian date) is between starts_on and ends_on, both included.
-- link_type / link_id: where the button goes ('category' + category id, 'product' + product id).
CREATE TABLE IF NOT EXISTS offers (
  id TEXT PRIMARY KEY,
  title_en TEXT NOT NULL CHECK (length(title_en) BETWEEN 2 AND 60),
  title_kn TEXT CHECK (title_kn IS NULL OR length(title_kn) <= 60),
  message_en TEXT CHECK (message_en IS NULL OR length(message_en) <= 160),
  message_kn TEXT CHECK (message_kn IS NULL OR length(message_kn) <= 160),
  photo_url TEXT CHECK (photo_url IS NULL OR (length(photo_url) <= 500 AND (photo_url LIKE 'https://%' OR photo_url LIKE '/api/photo/%'))),
  button_en TEXT CHECK (button_en IS NULL OR length(button_en) <= 30),
  button_kn TEXT CHECK (button_kn IS NULL OR length(button_kn) <= 30),
  link_type TEXT CHECK (link_type IS NULL OR link_type IN ('category', 'product')),
  link_id TEXT CHECK (link_id IS NULL OR length(link_id) <= 80),
  starts_on TEXT NOT NULL CHECK (length(starts_on) = 10),
  ends_on TEXT NOT NULL CHECK (length(ends_on) = 10 AND ends_on >= starts_on),
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX IF NOT EXISTS offers_dates ON offers (active, starts_on, ends_on);
