-- Dream Kitchen: offers with products and special prices, wide banner photos, the site settings
-- the developer options edit, and admin roles (26 Oct 2026). Run AFTER the earlier migrations.
-- Only adds; safe to run again. Same rules as d1/migrations/0003_offer_items_site_config.sql.
--
-- Adds:
--   * offers.items / deal / badge / photo_phone_url (see the D1 file for the shapes)
--   * public.site_config: one row per setting the developer options change; the website reads
--     them through /api/menu (service role), never directly
--   * admin_users.role: 'owner' (every existing account), 'developer', and helper roles

alter table public.offers add column if not exists items jsonb check (items is null or (jsonb_typeof(items) = 'object' and char_length(items::text) <= 4000));
alter table public.offers add column if not exists deal jsonb check (deal is null or (jsonb_typeof(deal) = 'object' and char_length(deal::text) <= 4000));
alter table public.offers add column if not exists badge jsonb check (badge is null or (jsonb_typeof(badge) = 'object' and char_length(badge::text) <= 200));
alter table public.offers add column if not exists photo_phone_url text check (photo_phone_url is null or char_length(photo_phone_url) <= 500);

create table if not exists public.site_config (
  key text primary key check (key ~ '^[a-zA-Z0-9-]{2,40}$'),
  value jsonb not null check (char_length(value::text) <= 200000),
  updated_at timestamptz not null default now(),
  updated_by text
);
drop trigger if exists site_config_touch on public.site_config;
create trigger site_config_touch before update on public.site_config for each row execute function public.touch_updated_at();
alter table public.site_config enable row level security;
revoke all on public.site_config from anon;
grant select, insert, update, delete on public.site_config to authenticated;
drop policy if exists "admin changes site config" on public.site_config;
create policy "admin changes site config" on public.site_config for all to authenticated using (public.is_admin()) with check (public.is_admin());

alter table public.admin_users add column if not exists role text not null default 'owner';
do $$ begin
  alter table public.admin_users add constraint admin_users_role check (role in ('owner', 'developer', 'full', 'orders_menu', 'orders', 'disabled'));
exception when duplicate_object then null;
end $$;
