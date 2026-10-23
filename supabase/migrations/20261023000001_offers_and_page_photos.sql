-- Dream Kitchen: offers, Customize tile photos and a ragi option for Hema's own products
-- (23 Oct 2026). Run AFTER the earlier migrations. Safe to run again. Documented in docs/DATA-MODEL.md.
--
-- Adds:
--   * public.offers: Hema's offer banners (admin -> Offers). Display-only: they never change a
--     price. Dates are Indian calendar dates, both days included.
--   * public.page_photos: the photos of the Customize page's tiles and Home's customise tile
--     (admin -> Menu -> Customize page). No row = the product photo that was always there.
--   * Products Hema adds may now have a ragi version (products.ragi_price, a column that already
--     exists; nothing to change in the table).
-- Photos for both go in the existing public bucket "product-photos" (offer-<id>/... and
-- page-<slot>/...), so the admin-only storage rules of 20261022000001_product_photos.sql apply.
--
-- Security (Row Level Security):
--   * anyone (the website, anon key) may READ offers that are live right now, and the page photos;
--   * only Hema's admin account (admin_users, public.is_admin()) may add, change or delete;
--   * the Netlify Functions use the service role (they bypass RLS, after checking her login).

-- ---------------------------------------------------------------------------
-- Offers
-- ---------------------------------------------------------------------------
create table if not exists public.offers (
  id uuid primary key default gen_random_uuid(),
  -- { "en": "...", "kn": "..." }; the English is required, the Kannada may be missing
  title jsonb not null check (jsonb_typeof(title) = 'object' and coalesce(title->>'en', '') <> '' and char_length(title::text) <= 400),
  message jsonb check (message is null or (jsonb_typeof(message) = 'object' and char_length(message::text) <= 800)),
  button jsonb check (button is null or (jsonb_typeof(button) = 'object' and char_length(button::text) <= 200)),
  -- '' (no button), 'category:<id>', 'product:<id>' or 'page:customize'
  link text not null default '' check (link ~ '^(|category:[a-z0-9-]{2,40}|product:[a-z0-9][a-z0-9-]{1,59}|page:customize)$'),
  photo_url text check (photo_url is null or char_length(photo_url) <= 500),
  starts_on date not null,
  ends_on date not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint offers_dates check (ends_on >= starts_on)
);
create index if not exists offers_ends_on on public.offers (ends_on);
drop trigger if exists offers_touch on public.offers;
create trigger offers_touch before update on public.offers for each row execute function public.touch_updated_at();

alter table public.offers enable row level security;
revoke all on public.offers from anon;
grant select on public.offers to anon, authenticated;
grant insert, update, delete on public.offers to authenticated;

drop policy if exists "live offers are public" on public.offers;
create policy "live offers are public" on public.offers for select to anon, authenticated
  using (active and (now() at time zone 'Asia/Kolkata')::date between starts_on and ends_on);
drop policy if exists "admin reads every offer" on public.offers;
create policy "admin reads every offer" on public.offers for select to authenticated using (public.is_admin());
drop policy if exists "admin adds offers" on public.offers;
create policy "admin adds offers" on public.offers for insert to authenticated with check (public.is_admin());
drop policy if exists "admin changes offers" on public.offers;
create policy "admin changes offers" on public.offers for update to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "admin deletes offers" on public.offers;
create policy "admin deletes offers" on public.offers for delete to authenticated using (public.is_admin());

-- ---------------------------------------------------------------------------
-- Photos of the Customize tiles
-- ---------------------------------------------------------------------------
create table if not exists public.page_photos (
  id text primary key check (id ~ '^[a-z0-9-]{2,40}$'),
  photo_url text check (photo_url is null or char_length(photo_url) <= 500),
  updated_at timestamptz not null default now()
);
drop trigger if exists page_photos_touch on public.page_photos;
create trigger page_photos_touch before update on public.page_photos for each row execute function public.touch_updated_at();

alter table public.page_photos enable row level security;
revoke all on public.page_photos from anon;
grant select on public.page_photos to anon, authenticated;
grant insert, update, delete on public.page_photos to authenticated;

drop policy if exists "page photos are public" on public.page_photos;
create policy "page photos are public" on public.page_photos for select to anon, authenticated using (true);
drop policy if exists "admin changes page photos" on public.page_photos;
create policy "admin changes page photos" on public.page_photos for all to authenticated using (public.is_admin()) with check (public.is_admin());
