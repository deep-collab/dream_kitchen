-- Dream Kitchen: the Kannada Rajyotsava offer (50% off everything, 1 to 30 November) and Cookie
-- Tins, the new menu section Hema fills herself (27 Oct 2026). Run AFTER the earlier migrations.
-- Only adds; safe to run again: no order, product or price is removed or changed.
-- Same rules as d1/migrations/0004_rajyotsava_cookie_tins.sql.
--
-- Adds:
--   * 'cookie-tins' to the sections Hema can add her own products to (the check is replaced by the
--     same check with one more section: every existing row already passes it)
--   * the Rajyotsava offer (fixed id, so the website knows it): 50% off every product on the
--     website, 1 to 30 November 2026, switched on. Already there = left as it is.

alter table public.products drop constraint if exists products_custom_category;
alter table public.products add constraint products_custom_category check (
  not custom or category in ('brownie-tubs', 'delight-boxes', 'brownies', 'chocolates', 'cookie-tins')
);

insert into public.offers (id, title, message, button, link, starts_on, ends_on, active, items, deal, badge)
values (
  '20261101-0000-4000-8000-000000000001',
  '{"en":"Happy Kannada Rajyotsava","kn":"ಕನ್ನಡ ರಾಜ್ಯೋತ್ಸವದ ಹಾರ್ದಿಕ ಶುಭಾಶಯಗಳು"}',
  '{"en":"50% off on everything · Online orders only","kn":"ಎಲ್ಲಾ ಉತ್ಪನ್ನಗಳ ಮೇಲೆ 50% ರಿಯಾಯಿತಿ · ಆನ್‌ಲೈನ್ ಆರ್ಡರ್‌ಗಳಿಗೆ ಮಾತ್ರ"}',
  '{"en":"Go to Offer Zone","kn":"ಆಫರ್ ವಲಯಕ್ಕೆ ಹೋಗಿ"}',
  '',
  '2026-11-01',
  '2026-11-30',
  true,
  '{"all":true,"categories":[],"products":[]}',
  '{"kind":"percent","value":50}',
  '{"en":"50% OFF","kn":"50% ರಿಯಾಯಿತಿ"}'
)
on conflict (id) do nothing;
