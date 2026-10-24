-- Dream Kitchen: final launch (15 Oct 2026). Run AFTER the two earlier migrations. Safe to run again.
-- Documented in docs/DATA-MODEL.md.
--
-- Adds: products Hema creates herself in the admin (custom = true; everything about them lives in
-- the row), her own names and descriptions for any product, and the daily keep-alive's last run
-- (so the free Supabase project never pauses; shown on /admin/setup).

-- ---------------------------------------------------------------------------
-- Products: Hema's own products, and her names / descriptions for any product
-- ---------------------------------------------------------------------------
alter table public.products add column if not exists custom boolean not null default false;
-- { "en": "...", "kn": "..." }; NULL = the config's name / description
alter table public.products add column if not exists display_name jsonb check (display_name is null or (jsonb_typeof(display_name) = 'object' and char_length(display_name::text) <= 400));
alter table public.products add column if not exists description jsonb check (description is null or (jsonb_typeof(description) = 'object' and char_length(description::text) <= 2000));
-- A product Hema adds is complete on its own: a name and a price (or sizes with prices)
alter table public.products drop constraint if exists products_custom_complete;
alter table public.products add constraint products_custom_complete check (
  not custom or (display_name is not null and (price is not null or (sizes is not null and jsonb_array_length(sizes) > 0)))
);
alter table public.products drop constraint if exists products_custom_category;
alter table public.products add constraint products_custom_category check (
  not custom or category in ('brownie-tubs', 'delight-boxes', 'brownies', 'chocolates')
);

-- ---------------------------------------------------------------------------
-- Keep-alive: the scheduled function (netlify/functions/keep-alive.mjs) writes here once a day
-- ---------------------------------------------------------------------------
create table if not exists public.heartbeat (
  id integer primary key default 1 check (id = 1),
  last_run_at timestamptz,
  runs integer not null default 0
);
insert into public.heartbeat (id) values (1) on conflict (id) do nothing;
alter table public.heartbeat enable row level security;
-- No policies: only the server (service role) reads or writes it
revoke all on public.heartbeat from anon, authenticated;
