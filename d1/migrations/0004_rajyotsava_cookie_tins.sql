-- Dream Kitchen on Cloudflare D1 (27 Oct 2026): the Kannada Rajyotsava offer (50% off everything,
-- 1 to 30 November) and Cookie Tins, the new menu section Hema fills herself.
-- Only ADDS (one new column, one new row): nothing is removed or rewritten, every order, product
-- and price stays exactly as it is. Applied once by `npm run d1:migrate -- --remote`, AFTER
-- 0003_offer_items_site_config.sql (wrangler runs the files in order).
-- Same rules as supabase/migrations/20261027000001_rajyotsava_cookie_tins.sql.
--
-- Adds:
--   * products.added: a product Hema added in a menu section that came after 0002 (Cookie Tins).
--     0002's CHECK on products.custom allows only the first four sections, and SQLite can't change
--     a CHECK without rebuilding the table, so those products are stored with custom = 0, added = 1
--     (the D1 store reads both as "Hema's own product"). The same rule as custom: a name, and a
--     price or sizes.
--   * the Rajyotsava offer (fixed id, so the website knows it): 50% off every product on the
--     website, 1 to 30 November 2026 (Indian dates, both days included), switched on. Hema turns it
--     off, moves its dates or changes the percent in admin -> Offers. INSERT OR IGNORE: running
--     this on a database that already has it changes nothing.

ALTER TABLE products ADD COLUMN added INTEGER NOT NULL DEFAULT 0 CHECK (
  added IN (0, 1) AND (added = 0 OR (
    display_name IS NOT NULL
    AND (price IS NOT NULL OR (sizes IS NOT NULL AND json_valid(sizes) AND json_array_length(sizes) > 0))
  ))
);

INSERT OR IGNORE INTO offers (id, title, message, button, link, starts_on, ends_on, active, items, deal, badge)
VALUES (
  '20261101-0000-4000-8000-000000000001',
  '{"en":"Happy Kannada Rajyotsava","kn":"ಕನ್ನಡ ರಾಜ್ಯೋತ್ಸವದ ಹಾರ್ದಿಕ ಶುಭಾಶಯಗಳು"}',
  '{"en":"50% off on everything · Online orders only","kn":"ಎಲ್ಲಾ ಉತ್ಪನ್ನಗಳ ಮೇಲೆ 50% ರಿಯಾಯಿತಿ · ಆನ್‌ಲೈನ್ ಆರ್ಡರ್‌ಗಳಿಗೆ ಮಾತ್ರ"}',
  '{"en":"Go to Offer Zone","kn":"ಆಫರ್ ವಲಯಕ್ಕೆ ಹೋಗಿ"}',
  '',
  '2026-11-01',
  '2026-11-30',
  1,
  '{"all":true,"categories":[],"products":[]}',
  '{"kind":"percent","value":50}',
  '{"en":"50% OFF","kn":"50% ರಿಯಾಯಿತಿ"}'
);
