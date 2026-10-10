-- Dream Kitchen: the complete admin (10 Oct 2026). Run AFTER 20261005000001_init.sql, once.
-- Safe to run again. Documented in docs/DATA-MODEL.md.
--
-- Adds: class bookings (with their history and blocked weekends/slots), product photos, a refund
-- note and "paid at" on orders, general enquiries, the order-alert email and class settings,
-- and the admin's last activity (Hema logs in again after 30 days without using the admin).
-- Security is the same as before: Row Level Security on every table, nothing private readable
-- by the public, every write through a Netlify Function with the service role.

-- ---------------------------------------------------------------------------
-- Admin accounts: last activity (the 30-day rule is checked by the admin function)
-- ---------------------------------------------------------------------------
alter table public.admin_users add column if not exists last_seen_at timestamptz;

-- ---------------------------------------------------------------------------
-- Orders: when it was paid (for "payments received today"), and Hema's refund note
-- ---------------------------------------------------------------------------
alter table public.orders add column if not exists paid_at timestamptz;
alter table public.orders add column if not exists refund_note text check (refund_note is null or char_length(refund_note) <= 300);
create index if not exists orders_paid_at on public.orders (paid_at desc);

-- Courier: a third tier, "xl" (750 g tubs)
alter table public.orders drop constraint if exists orders_courier_tier_check;
alter table public.orders add constraint orders_courier_tier_check check (courier_tier in ('small', 'large', 'xl'));
alter table public.products drop constraint if exists products_courier_tier_check;
alter table public.products add constraint products_courier_tier_check check (courier_tier in ('small', 'large', 'xl'));

-- ---------------------------------------------------------------------------
-- Settings: where Hema's alert emails go, and the class fees / times / seats
-- ---------------------------------------------------------------------------
alter table public.settings add column if not exists alert_email text check (alert_email is null or (char_length(alert_email) <= 120 and alert_email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'));
alter table public.settings add column if not exists class_settings jsonb check (class_settings is null or jsonb_typeof(class_settings) = 'object');

-- ---------------------------------------------------------------------------
-- Products: a photo Hema uploaded from her phone (public bucket "product-photos")
-- ---------------------------------------------------------------------------
alter table public.products add column if not exists photo_url text check (photo_url is null or (char_length(photo_url) <= 500 and photo_url ~ '^(https://|/api/photo/)'));

-- ---------------------------------------------------------------------------
-- Enquiries: class questions AND general messages (Contact page); new / handled
-- ---------------------------------------------------------------------------
alter table public.class_enquiries add column if not exists kind text not null default 'class' check (kind in ('class', 'general'));
alter table public.class_enquiries drop constraint if exists class_enquiries_status_check;
alter table public.class_enquiries add constraint class_enquiries_status_check check (status in ('new', 'contacted', 'closed', 'handled'));

-- ---------------------------------------------------------------------------
-- Class bookings. One booking = one person, one class, one weekend (Saturday + Sunday), one slot.
-- status: pending (not paid yet) -> confirmed (paid) | cancelled
-- ---------------------------------------------------------------------------
create table if not exists public.class_bookings (
  id uuid primary key default gen_random_uuid(),
  booking_code text not null unique check (booking_code ~ '^DK-CL-[0-9]{6}-[2-9A-HJ-NP-Z]{4}$'),
  idempotency_key text not null unique check (char_length(idempotency_key) between 16 and 64),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  class_id text not null check (class_id ~ '^[a-z0-9-]{1,30}$'),
  weekend date not null check (extract(isodow from weekend) = 6), -- the Saturday
  slot text not null check (slot ~ '^[a-z0-9-]{1,20}$'),
  name text not null check (char_length(name) between 2 and 60),
  phone text not null check (phone ~ '^[6-9][0-9]{9}$'),
  email text check (email is null or char_length(email) <= 120),
  fee integer not null check (fee > 0 and fee <= 100000),
  lang text not null default 'en' check (lang in ('en', 'kn')),

  payment_method text not null default 'razorpay' check (payment_method in ('upi', 'razorpay')),
  payment_status text not null default 'pending' check (payment_status in ('pending', 'submitted', 'confirmed')),
  utr text check (utr is null or utr ~ '^[0-9]{12}$'),
  razorpay_order_id text unique,
  razorpay_payment_id text,
  paid_at timestamptz,

  status text not null default 'pending' check (status in ('pending', 'confirmed', 'cancelled')),
  cancel_reason text check (cancel_reason is null or char_length(cancel_reason) <= 200),
  admin_notes text check (admin_notes is null or char_length(admin_notes) <= 1000)
);
create index if not exists class_bookings_slot on public.class_bookings (weekend, slot, status);
create index if not exists class_bookings_created on public.class_bookings (created_at desc);
create index if not exists class_bookings_phone on public.class_bookings (phone);
drop trigger if exists class_bookings_touch on public.class_bookings;
create trigger class_bookings_touch before update on public.class_bookings for each row execute function public.touch_updated_at();

create table if not exists public.booking_events (
  id bigint generated always as identity primary key,
  booking_id uuid not null references public.class_bookings (id) on delete cascade,
  at timestamptz not null default now(),
  kind text not null default 'status' check (kind in ('status', 'payment', 'note')),
  from_status text,
  to_status text not null,
  by text not null check (char_length(by) <= 120),
  note text check (note is null or char_length(note) <= 300)
);
create index if not exists booking_events_booking on public.booking_events (booking_id, at);

-- Weekends or single slots Hema closes (holiday, full). slot '*' = the whole weekend.
create table if not exists public.class_blocks (
  weekend date not null check (extract(isodow from weekend) = 6),
  slot text not null default '*' check (slot = '*' or slot ~ '^[a-z0-9-]{1,20}$'),
  reason text check (reason is null or char_length(reason) <= 120),
  created_at timestamptz not null default now(),
  primary key (weekend, slot)
);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.class_bookings enable row level security;
alter table public.booking_events enable row level security;
alter table public.class_blocks enable row level security;

revoke all on public.class_bookings, public.booking_events, public.class_blocks from anon;
grant select, insert, update, delete on public.class_bookings, public.booking_events, public.class_blocks to authenticated;

drop policy if exists "admin reads bookings" on public.class_bookings;
create policy "admin reads bookings" on public.class_bookings for select to authenticated using (public.is_admin());
drop policy if exists "admin updates bookings" on public.class_bookings;
create policy "admin updates bookings" on public.class_bookings for update to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "admin reads booking events" on public.booking_events;
create policy "admin reads booking events" on public.booking_events for select to authenticated using (public.is_admin());
drop policy if exists "admin adds booking events" on public.booking_events;
create policy "admin adds booking events" on public.booking_events for insert to authenticated with check (public.is_admin());
drop policy if exists "admin manages blocks" on public.class_blocks;
create policy "admin manages blocks" on public.class_blocks for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- The settings row is public (menu, courier, UPI), but the alert email and class settings are
-- only for the admin: hide those two columns from the public roles.
revoke select on public.settings from anon;
grant select (id, upi_id, upi_name, upi_qr, lead_standard, lead_drawing_extra, courier_rates, store_open, closed_message, announcement, updated_at) on public.settings to anon;
-- Admins only see when they themselves were last active
revoke update on public.admin_users from authenticated;

-- ---------------------------------------------------------------------------
-- Functions used by the Netlify Functions (service role only)
-- ---------------------------------------------------------------------------

-- The admin update now also stamps paid_at the first time a payment is confirmed, and keeps the refund note.
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
    paid_at = case when p_patch ->> 'payment_status' = 'confirmed' and paid_at is null then now() else paid_at end,
    payment_method = coalesce(p_patch ->> 'payment_method', payment_method),
    razorpay_payment_id = coalesce(p_patch ->> 'razorpay_payment_id', razorpay_payment_id),
    courier_name = case when p_patch ? 'courier_name' then p_patch ->> 'courier_name' else courier_name end,
    tracking_no = case when p_patch ? 'tracking_no' then p_patch ->> 'tracking_no' else tracking_no end,
    tracking_url = case when p_patch ? 'tracking_url' then nullif(p_patch ->> 'tracking_url', '') else tracking_url end,
    cancel_reason = case when p_patch ? 'cancel_reason' then p_patch ->> 'cancel_reason' else cancel_reason end,
    admin_notes = case when p_patch ? 'admin_notes' then nullif(p_patch ->> 'admin_notes', '') else admin_notes end,
    refund_note = case when p_patch ? 'refund_note' then nullif(p_patch ->> 'refund_note', '') else refund_note end
  where order_code = p_code
  returning * into r;
  if p_event is not null then
    insert into public.order_events (order_id, kind, from_status, to_status, by, note)
    values (r.id, coalesce(p_event ->> 'kind', 'status'), before_status, p_event ->> 'to_status', p_event ->> 'by', p_event ->> 'note');
  end if;
  return r;
end
$$;

-- A new booking, if the slot still has a seat. Seats taken = confirmed bookings, plus unpaid ones
-- made in the last 30 minutes or with a UPI reference to check (so two people can't pay for the
-- last seat). p_max_seats NULL = no limit set yet. The same idempotency key returns the booking
-- already made. Raises 'slot_full' when there is no seat.
create or replace function public.create_booking(p jsonb, p_max_seats integer)
returns public.class_bookings
language plpgsql
set search_path = public
as $$
declare
  r public.class_bookings;
  taken integer;
begin
  select * into r from public.class_bookings where idempotency_key = p ->> 'idempotency_key';
  if found then
    return r;
  end if;
  perform pg_advisory_xact_lock(hashtext('dk-class-' || (p ->> 'weekend') || '-' || (p ->> 'slot')));
  if p_max_seats is not null then
    select count(*) into taken from public.class_bookings
     where weekend = (p ->> 'weekend')::date and slot = p ->> 'slot'
       and (status = 'confirmed' or (status = 'pending' and (payment_status = 'submitted' or created_at > now() - interval '30 minutes')));
    if taken >= p_max_seats then
      raise exception 'slot_full' using errcode = 'P0001';
    end if;
  end if;
  insert into public.class_bookings (booking_code, idempotency_key, class_id, weekend, slot, name, phone, email, fee, lang, payment_method)
  values (
    p ->> 'booking_code', p ->> 'idempotency_key', p ->> 'class_id', (p ->> 'weekend')::date, p ->> 'slot', p ->> 'name', p ->> 'phone',
    nullif(p ->> 'email', ''), (p ->> 'fee')::integer, coalesce(p ->> 'lang', 'en'), coalesce(p ->> 'payment_method', 'razorpay')
  )
  returning * into r;
  insert into public.booking_events (booking_id, kind, from_status, to_status, by) values (r.id, 'status', null, 'pending', 'customer');
  return r;
exception when unique_violation then
  select * into r from public.class_bookings where idempotency_key = p ->> 'idempotency_key';
  if found then
    return r;
  end if;
  raise;
end
$$;

-- The customer's UPI reference for a booking (UPI fallback only)
create or replace function public.submit_booking_payment(p_code text, p_phone text, p_utr text)
returns public.class_bookings
language plpgsql
set search_path = public
as $$
declare
  r public.class_bookings;
begin
  update public.class_bookings
     set utr = p_utr, payment_status = 'submitted'
   where booking_code = p_code and phone = p_phone and status = 'pending' and payment_status in ('pending', 'submitted')
  returning * into r;
  if found then
    insert into public.booking_events (booking_id, kind, from_status, to_status, by, note)
    values (r.id, 'payment', 'pending', 'submitted', 'customer', 'UTR ' || p_utr);
  end if;
  return r;
end
$$;

-- An admin (or Razorpay) change to a booking, logged in its history in the same transaction
create or replace function public.admin_update_booking(p_code text, p_patch jsonb, p_event jsonb)
returns public.class_bookings
language plpgsql
set search_path = public
as $$
declare
  r public.class_bookings;
  before_status text;
begin
  select status into before_status from public.class_bookings where booking_code = p_code for update;
  if not found then
    return null;
  end if;
  update public.class_bookings set
    status = coalesce(p_patch ->> 'status', status),
    payment_status = coalesce(p_patch ->> 'payment_status', payment_status),
    paid_at = case when p_patch ->> 'payment_status' = 'confirmed' and paid_at is null then now() else paid_at end,
    payment_method = coalesce(p_patch ->> 'payment_method', payment_method),
    razorpay_payment_id = coalesce(p_patch ->> 'razorpay_payment_id', razorpay_payment_id),
    cancel_reason = case when p_patch ? 'cancel_reason' then p_patch ->> 'cancel_reason' else cancel_reason end,
    admin_notes = case when p_patch ? 'admin_notes' then nullif(p_patch ->> 'admin_notes', '') else admin_notes end
  where booking_code = p_code
  returning * into r;
  if p_event is not null then
    insert into public.booking_events (booking_id, kind, from_status, to_status, by, note)
    values (r.id, coalesce(p_event ->> 'kind', 'status'), before_status, p_event ->> 'to_status', p_event ->> 'by', p_event ->> 'note');
  end if;
  return r;
end
$$;

revoke execute on function public.create_booking(jsonb, integer) from public, anon, authenticated;
revoke execute on function public.submit_booking_payment(text, text, text) from public, anon, authenticated;
revoke execute on function public.admin_update_booking(text, jsonb, jsonb) from public, anon, authenticated;
revoke execute on function public.admin_update_order(text, jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.create_booking(jsonb, integer) to service_role;
grant execute on function public.submit_booking_payment(text, text, text) to service_role;
grant execute on function public.admin_update_booking(text, jsonb, jsonb) to service_role;
grant execute on function public.admin_update_order(text, jsonb, jsonb) to service_role;

-- ---------------------------------------------------------------------------
-- Storage: product photos Hema uploads from her phone. PUBLIC (they are on the menu anyway),
-- images only, 2 MB at most (the admin shrinks them to about 200 KB first). Only the service
-- role (the admin function) can add or replace them: no write policies for anyone else.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-photos', 'product-photos', true, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = true, file_size_limit = 2097152, allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];
