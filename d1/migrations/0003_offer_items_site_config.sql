-- Dream Kitchen on Cloudflare D1 (26 Oct 2026): offers with products and special prices, wide
-- banner photos, the site settings the developer options edit, and admin roles.
-- Only ADDS (new columns, a new table): nothing is removed or rewritten, every existing row keeps
-- working as it is. Applied once by `npm run d1:migrate -- --remote`.
-- Same rules as supabase/migrations/20261026000001_offer_items_site_config.sql.
--
-- Adds:
--   * offers.items: the products in the offer, { "categories": [...], "products": [...] } (JSON).
--     NULL = an offer without products (the banner only, as before).
--   * offers.deal: an optional special price for those products during the offer's dates:
--     { "kind": "percent", "value": 10 } | { "kind": "amount", "value": 50 } |
--     { "kind": "prices", "prices": { "<product>": 499 | { "<size>": 599 } } }. NULL = no special price.
--   * offers.badge: the small label on the offer's products, { "en", "kn" }. NULL = "Offer".
--   * offers.photo_phone_url: the banner photo cut for phones (16:9); photo_url is the wide one (3:1).
--   * site_config: one row per setting the developer options change (e.g. "background"), the value
--     as JSON. No row = the built-in default.
--   * admin_users.role: 'owner' (Hema, every existing account), 'developer' (also sees the
--     developer options), and the helper roles used later ('full', 'orders_menu', 'orders',
--     'disabled'). Checked on the server for every admin action.

ALTER TABLE offers ADD COLUMN items TEXT CHECK (items IS NULL OR (json_valid(items) AND json_type(items) = 'object' AND length(items) <= 4000));
ALTER TABLE offers ADD COLUMN deal TEXT CHECK (deal IS NULL OR (json_valid(deal) AND json_type(deal) = 'object' AND length(deal) <= 4000));
ALTER TABLE offers ADD COLUMN badge TEXT CHECK (badge IS NULL OR (json_valid(badge) AND json_type(badge) = 'object' AND length(badge) <= 200));
ALTER TABLE offers ADD COLUMN photo_phone_url TEXT CHECK (photo_phone_url IS NULL OR (length(photo_phone_url) <= 500 AND (photo_phone_url LIKE 'https://%' OR photo_phone_url LIKE '/api/photo/%')));

CREATE TABLE IF NOT EXISTS site_config (
  key TEXT PRIMARY KEY CHECK (length(key) BETWEEN 2 AND 40 AND key NOT GLOB '*[^a-zA-Z0-9-]*'),
  value TEXT NOT NULL CHECK (json_valid(value) AND length(value) <= 200000),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_by TEXT
);

ALTER TABLE admin_users ADD COLUMN role TEXT NOT NULL DEFAULT 'owner' CHECK (role IN ('owner', 'developer', 'full', 'orders_menu', 'orders', 'disabled'));
