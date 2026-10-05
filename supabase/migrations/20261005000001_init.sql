-- Dream Kitchen, Step 6: orders and payment on the website.
-- Run once in Supabase (SQL editor, or `supabase db push`). Documented in docs/DATA-MODEL.md.
--
-- Security model
--   * Row Level Security is ON for every table.
--   * The public (anon) and logged-in customers can NOT read or list orders, order events,
--     class enquiries or rate limits. They can read only the menu overrides and public settings.
--   * Every write happens in a Netlify Function with the service role key (it bypasses RLS),
--     after the function has validated and re-priced everything.
--   * Hema's admin account (a row in admin_users) may also read and write through RLS.
--   * The SQL functions below can be called by the service role only.

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
create table if not exists public.admin_users (
  user_id uuid primary key references auth.users (id) on delete cascade,
  email text,
  created_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.admin_users where user_id = auth.uid())
$$;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end
$$;

-- ---------------------------------------------------------------------------
-- Menu: Hema's admin changes on top of src/config/shop.js.
-- A NULL column means "use the config". scripts/seed-menu.mjs fills the reference columns
-- (names, category, sort, tier, options) from the config and leaves the overrides empty.
-- ---------------------------------------------------------------------------
create table if not exists public.products (
  id text primary key,
  slug text not null unique,
  category text not null,
  name_en text not null,
  name_kn text not null default '',
  sizes jsonb check (sizes is null or jsonb_typeof(sizes) = 'array'),  -- [{ id, label?, grams?, price }]
  price integer check (price is null or (price > 0 and price <= 100000)),
  ragi_price integer check (ragi_price is null or (ragi_price > 0 and ragi_price <= 100000)),
  options jsonb not null default '{}'::jsonb,
  courier_tier text not null default 'small' check (courier_tier in ('small', 'large')),
  price_status text check (price_status is null or price_status in ('live', 'coming-soon')),
  active boolean,
  sold_out boolean,
  sort integer not null default 0,
  image text,
  updated_at timestamptz not null default now()
);
drop trigger if exists products_touch on public.products;
create trigger products_touch before update on public.products for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Settings: one row (id = 1). NULL = use the config default.
-- ---------------------------------------------------------------------------
create table if not exists public.settings (
  id integer primary key default 1 check (id = 1),
  upi_id text check (upi_id is null or upi_id ~ '^[a-zA-Z0-9._-]{2,64}@[a-zA-Z][a-zA-Z0-9.-]{1,32}$'),
  upi_name text check (upi_name is null or char_length(upi_name) <= 40),
  upi_qr text check (upi_qr is null or char_length(upi_qr) <= 400000), -- data:image/... (resized in the admin)
  lead_standard integer check (lead_standard is null or lead_standard between 0 and 30),
  lead_drawing_extra integer check (lead_drawing_extra is null or lead_drawing_extra between 0 and 30),
  courier_rates jsonb check (courier_rates is null or jsonb_typeof(courier_rates) = 'object'),
  store_open boolean not null default true,
  closed_message text check (closed_message is null or char_length(closed_message) <= 200),
  announcement text check (announcement is null or char_length(announcement) <= 200),
  updated_at timestamptz not null default now()
);
insert into public.settings (id) values (1) on conflict (id) do nothing;
drop trigger if exists settings_touch on public.settings;
create trigger settings_touch before update on public.settings for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Orders
-- ---------------------------------------------------------------------------
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_code text not null unique check (order_code ~ '^DK-[0-9]{6}-[2-9A-HJ-NP-Z]{4}$'),
  idempotency_key text not null unique check (char_length(idempotency_key) between 16 and 64),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  customer_name text not null check (char_length(customer_name) between 2 and 60),
  customer_phone text not null check (customer_phone ~ '^[6-9][0-9]{9}$'),
  customer_email text check (customer_email is null or char_length(customer_email) <= 120),
  address_line1 text not null check (char_length(address_line1) between 3 and 120),
  address_line2 text not null check (char_length(address_line2) between 2 and 120),
  city text not null check (char_length(city) between 2 and 60),
  landmark text check (landmark is null or char_length(landmark) <= 80),
  pincode text not null check (pincode ~ '^[1-9][0-9]{5}$'),
  state text not null check (char_length(state) <= 40),
  zone text not null check (zone in ('karnataka', 'outside')),

  items jsonb not null check (jsonb_typeof(items) = 'array' and jsonb_array_length(items) between 1 and 20),
  subtotal integer not null check (subtotal > 0),
  courier integer not null check (courier >= 0),
  total integer not null check (total = subtotal + courier),
  courier_tier text not null check (courier_tier in ('small', 'large')),
  has_drawing boolean not null default false,
  dispatch_date date not null,
  notes text check (notes is null or char_length(notes) <= 300),
  lang text not null default 'en' check (lang in ('en', 'kn')),

  payment_method text not null default 'upi' check (payment_method in ('upi', 'razorpay')),
  payment_status text not null default 'pending' check (payment_status in ('pending', 'submitted', 'confirmed')),
  utr text check (utr is null or utr ~ '^[0-9]{12}$'),
  payment_screenshot text check (payment_screenshot is null or payment_screenshot ~ '^payments/'),
  payment_submitted_at timestamptz,
  razorpay_order_id text unique,
  razorpay_payment_id text,

  status text not null default 'placed' check (status in ('placed', 'payment_confirmed', 'preparing', 'shipped', 'delivered', 'cancelled')),
  courier_name text check (courier_name is null or char_length(courier_name) <= 40),
  tracking_no text check (tracking_no is null or char_length(tracking_no) <= 40),
  tracking_url text check (tracking_url is null or (char_length(tracking_url) <= 300 and tracking_url ~ '^https://')),
  cancel_reason text check (cancel_reason is null or char_length(cancel_reason) <= 200),
  admin_notes text check (admin_notes is null or char_length(admin_notes) <= 1000)
);
create index if not exists orders_created_at on public.orders (created_at desc);
create index if not exists orders_status on public.orders (status, payment_status);
create index if not exists orders_phone on public.orders (customer_phone);
drop trigger if exists orders_touch on public.orders;
create trigger orders_touch before update on public.orders for each row execute function public.touch_updated_at();

create table if not exists public.order_events (
  id bigint generated always as identity primary key,
  order_id uuid not null references public.orders (id) on delete cascade,
  at timestamptz not null default now(),
  kind text not null default 'status' check (kind in ('status', 'payment', 'note')),
  from_status text,
  to_status text not null,
  by text not null check (char_length(by) <= 120), -- 'customer' | 'system' | 'razorpay' | the admin's email
  note text check (note is null or char_length(note) <= 300)
);
create index if not exists order_events_order on public.order_events (order_id, at);

-- ---------------------------------------------------------------------------
-- Class enquiries
-- ---------------------------------------------------------------------------
create table if not exists public.class_enquiries (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null check (char_length(name) between 2 and 60),
  phone text not null check (phone ~ '^[6-9][0-9]{9}$'),
  interest text not null check (char_length(interest) between 2 and 80),
  preferred_dates text check (preferred_dates is null or char_length(preferred_dates) <= 120),
  message text check (message is null or char_length(message) <= 500),
  lang text not null default 'en' check (lang in ('en', 'kn')),
  status text not null default 'new' check (status in ('new', 'contacted', 'closed'))
);
create index if not exists class_enquiries_created on public.class_enquiries (created_at desc);

-- ---------------------------------------------------------------------------
-- Rate limits (one counter per key per time window)
-- ---------------------------------------------------------------------------
create table if not exists public.rate_limits (
  key text not null,
  window_start timestamptz not null,
  hits integer not null default 0,
  primary key (key, window_start)
);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.admin_users enable row level security;
alter table public.products enable row level security;
alter table public.settings enable row level security;
alter table public.orders enable row level security;
alter table public.order_events enable row level security;
alter table public.class_enquiries enable row level security;
alter table public.rate_limits enable row level security;

-- Nothing private is granted to the public roles at all (RLS is the second lock).
revoke all on public.orders, public.order_events, public.class_enquiries, public.rate_limits, public.admin_users from anon;
revoke all on public.products, public.settings from anon;
grant select on public.products, public.settings to anon;
grant select, insert, update, delete on public.products, public.settings, public.orders, public.order_events, public.class_enquiries to authenticated;
grant select on public.admin_users to authenticated;
revoke all on public.rate_limits from authenticated;

drop policy if exists "menu overrides are public" on public.products;
create policy "menu overrides are public" on public.products for select to anon, authenticated using (true);
drop policy if exists "admin edits the menu" on public.products;
create policy "admin edits the menu" on public.products for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "settings are public" on public.settings;
create policy "settings are public" on public.settings for select to anon, authenticated using (true);
drop policy if exists "admin edits settings" on public.settings;
create policy "admin edits settings" on public.settings for update to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "admin reads orders" on public.orders;
create policy "admin reads orders" on public.orders for select to authenticated using (public.is_admin());
drop policy if exists "admin updates orders" on public.orders;
create policy "admin updates orders" on public.orders for update to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "admin reads order events" on public.order_events;
create policy "admin reads order events" on public.order_events for select to authenticated using (public.is_admin());
drop policy if exists "admin adds order events" on public.order_events;
create policy "admin adds order events" on public.order_events for insert to authenticated with check (public.is_admin());

drop policy if exists "admin reads enquiries" on public.class_enquiries;
create policy "admin reads enquiries" on public.class_enquiries for select to authenticated using (public.is_admin());
drop policy if exists "admin updates enquiries" on public.class_enquiries;
create policy "admin updates enquiries" on public.class_enquiries for update to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "admins see themselves" on public.admin_users;
create policy "admins see themselves" on public.admin_users for select to authenticated using (user_id = auth.uid());
-- rate_limits: no policies = no access except the service role.

-- ---------------------------------------------------------------------------
-- Functions used by the Netlify Functions (service role only)
-- ---------------------------------------------------------------------------

-- Creates an order and its "placed" event in one transaction. The same idempotency key
-- returns the order already made (a double tap or a retried request never makes two orders).
create or replace function public.create_order(p jsonb)
returns public.orders
language plpgsql
set search_path = public
as $$
declare
  r public.orders;
begin
  select * into r from public.orders where idempotency_key = p ->> 'idempotency_key';
  if found then
    return r;
  end if;
  insert into public.orders (
    order_code, idempotency_key, customer_name, customer_phone, customer_email,
    address_line1, address_line2, city, landmark, pincode, state, zone,
    items, subtotal, courier, total, courier_tier, has_drawing, dispatch_date, notes, lang, payment_method
  ) values (
    p ->> 'order_code', p ->> 'idempotency_key', p ->> 'customer_name', p ->> 'customer_phone', nullif(p ->> 'customer_email', ''),
    p ->> 'address_line1', p ->> 'address_line2', p ->> 'city', nullif(p ->> 'landmark', ''), p ->> 'pincode', p ->> 'state', p ->> 'zone',
    p -> 'items', (p ->> 'subtotal')::integer, (p ->> 'courier')::integer, (p ->> 'total')::integer, p ->> 'courier_tier',
    coalesce((p ->> 'has_drawing')::boolean, false), (p ->> 'dispatch_date')::date, nullif(p ->> 'notes', ''), coalesce(p ->> 'lang', 'en'),
    coalesce(p ->> 'payment_method', 'upi')
  )
  returning * into r;
  insert into public.order_events (order_id, kind, from_status, to_status, by) values (r.id, 'status', null, 'placed', 'customer');
  return r;
exception when unique_violation then
  -- Two identical requests at the same moment: return the one that won.
  select * into r from public.orders where idempotency_key = p ->> 'idempotency_key';
  if found then
    return r;
  end if;
  raise; -- an order_code clash: the function retries with a new code
end
$$;

-- The customer gives the UPI reference (UTR) after paying. Needs the order code AND the phone.
create or replace function public.submit_payment(p_code text, p_phone text, p_utr text, p_screenshot text)
returns public.orders
language plpgsql
set search_path = public
as $$
declare
  r public.orders;
begin
  update public.orders
     set utr = p_utr,
         payment_screenshot = coalesce(p_screenshot, payment_screenshot),
         payment_status = 'submitted',
         payment_submitted_at = now()
   where order_code = p_code
     and customer_phone = p_phone
     and status = 'placed'
     and payment_status in ('pending', 'submitted')
  returning * into r;
  if found then
    insert into public.order_events (order_id, kind, from_status, to_status, by, note)
    values (r.id, 'payment', 'pending', 'submitted', 'customer', 'UTR ' || p_utr);
  end if;
  return r;
end
$$;

-- An admin action: change the order (only the columns listed) and log the event, together.
create or replace function public.admin_update_order(p_code text, p_patch jsonb, p_event jsonb)
returns public.orders
language plpgsql
set search_path = public
as $$
declare
  r public.orders;
  before_status text;
begin
  select status into before_status from public.orders where order_code = p_code for update;
  if not found then
    return null;
  end if;
  update public.orders set
    status = coalesce(p_patch ->> 'status', status),
    payment_status = coalesce(p_patch ->> 'payment_status', payment_status),
    payment_method = coalesce(p_patch ->> 'payment_method', payment_method),
    razorpay_payment_id = coalesce(p_patch ->> 'razorpay_payment_id', razorpay_payment_id),
    courier_name = case when p_patch ? 'courier_name' then p_patch ->> 'courier_name' else courier_name end,
    tracking_no = case when p_patch ? 'tracking_no' then p_patch ->> 'tracking_no' else tracking_no end,
    tracking_url = case when p_patch ? 'tracking_url' then nullif(p_patch ->> 'tracking_url', '') else tracking_url end,
    cancel_reason = case when p_patch ? 'cancel_reason' then p_patch ->> 'cancel_reason' else cancel_reason end,
    admin_notes = case when p_patch ? 'admin_notes' then nullif(p_patch ->> 'admin_notes', '') else admin_notes end
  where order_code = p_code
  returning * into r;
  if p_event is not null then
    insert into public.order_events (order_id, kind, from_status, to_status, by, note)
    values (r.id, coalesce(p_event ->> 'kind', 'status'), before_status, p_event ->> 'to_status', p_event ->> 'by', p_event ->> 'note');
  end if;
  return r;
end
$$;

-- Counts one request for `p_key` in the current window; true while it is within `p_max`.
create or replace function public.hit_rate_limit(p_key text, p_window_seconds integer, p_max integer)
returns boolean
language plpgsql
set search_path = public
as $$
declare
  w timestamptz := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
  h integer;
begin
  insert into public.rate_limits (key, window_start, hits) values (p_key, w, 1)
  on conflict (key, window_start) do update set hits = public.rate_limits.hits + 1
  returning hits into h;
  if random() < 0.02 then
    delete from public.rate_limits where window_start < now() - interval '2 days';
  end if;
  return h <= p_max;
end
$$;

revoke execute on function public.create_order(jsonb) from public, anon, authenticated;
revoke execute on function public.submit_payment(text, text, text, text) from public, anon, authenticated;
revoke execute on function public.admin_update_order(text, jsonb, jsonb) from public, anon, authenticated;
revoke execute on function public.hit_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.create_order(jsonb) to service_role;
grant execute on function public.submit_payment(text, text, text, text) to service_role;
grant execute on function public.admin_update_order(text, jsonb, jsonb) to service_role;
grant execute on function public.hit_rate_limit(text, integer, integer) to service_role;

-- ---------------------------------------------------------------------------
-- Storage: drawing references and payment screenshots. Private: no public URL, no policies
-- for anon or authenticated, so only the service role (Netlify Functions) can read or write.
-- Hema sees them through short-lived signed URLs made by the admin function.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('uploads', 'uploads', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = false, file_size_limit = 5242880, allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];
