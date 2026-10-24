-- Dream Kitchen on Cloudflare D1: everything added after 0001_init.sql (the same rules as the
-- Supabase migrations 20261015000001_launch.sql and 20261023000001_offers_and_page_photos.sql).
-- Applied once by `npm run d1:migrate -- --remote` (wrangler remembers which files have run).
--
-- Adds:
--   * products Hema creates herself (custom = 1: the row is the whole product, incl. an optional
--     ragi_price), and her own names / descriptions for any product ({ "en", "kn" } JSON text);
--   * offers: her banners on Home and Menu. Display-only: they never change a price. Dates are
--     Indian calendar dates, both days included;
--   * page_photos: the photos of the Customize page's tiles and Home's Customize tile.
-- Photos for both go in the same public photo storage as product photos (R2 or the objects table),
-- under offer-<id>/... and page-<tile>/..., served at /api/photo/.
-- On D1 every read and write goes through the Worker, after it has checked Hema's admin login.

-- ---------------------------------------------------------------------------
-- Products: Hema's own products, and her names / descriptions for any product
-- ---------------------------------------------------------------------------
-- NULL = the config's name / description
ALTER TABLE products ADD COLUMN display_name TEXT CHECK (display_name IS NULL OR (json_valid(display_name) AND json_type(display_name) = 'object' AND length(display_name) <= 400));
ALTER TABLE products ADD COLUMN description TEXT CHECK (description IS NULL OR (json_valid(description) AND json_type(description) = 'object' AND length(description) <= 2000));
-- A product Hema adds is complete on its own: a name and a price (or sizes), in one of the four menu sections
ALTER TABLE products ADD COLUMN custom INTEGER NOT NULL DEFAULT 0 CHECK (
  custom IN (0, 1) AND (custom = 0 OR (
    display_name IS NOT NULL
    AND category IN ('brownie-tubs', 'delight-boxes', 'brownies', 'chocolates')
    AND (price IS NOT NULL OR (sizes IS NOT NULL AND json_valid(sizes) AND json_array_length(sizes) > 0))
  ))
);

-- ---------------------------------------------------------------------------
-- Offers
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS offers (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL CHECK (json_valid(title) AND coalesce(json_extract(title, '$.en'), '') <> '' AND length(title) <= 400),
  message TEXT CHECK (message IS NULL OR (json_valid(message) AND length(message) <= 800)),
  button TEXT CHECK (button IS NULL OR (json_valid(button) AND length(button) <= 200)),
  -- '' (no button), 'category:<id>', 'product:<id>' or 'page:customize' (checked against the menu by the admin)
  link TEXT NOT NULL DEFAULT '' CHECK (link = '' OR link = 'page:customize' OR ((link LIKE 'category:%' OR link LIKE 'product:%') AND length(link) <= 70 AND link NOT GLOB '*[^a-z0-9:-]*')),
  photo_url TEXT CHECK (photo_url IS NULL OR (length(photo_url) <= 500 AND (photo_url LIKE 'https://%' OR photo_url LIKE '/api/photo/%'))),
  starts_on TEXT NOT NULL CHECK (starts_on GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
  ends_on TEXT NOT NULL CHECK (ends_on GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  CHECK (ends_on >= starts_on)
);
CREATE INDEX IF NOT EXISTS offers_ends_on ON offers (ends_on);

-- ---------------------------------------------------------------------------
-- Photos of the Customize tiles
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS page_photos (
  id TEXT PRIMARY KEY CHECK (length(id) BETWEEN 2 AND 40 AND id NOT GLOB '*[^a-z0-9-]*'),
  photo_url TEXT CHECK (photo_url IS NULL OR (length(photo_url) <= 500 AND (photo_url LIKE 'https://%' OR photo_url LIKE '/api/photo/%'))),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
