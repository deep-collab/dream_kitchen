-- Dream Kitchen: product photos in two sizes (22 Oct 2026). Safe to run again.
--
-- Hema's "Change photo" (admin -> Menu) now stores each photo twice, 1200px and 600px WebP, in the
-- public bucket "product-photos" (<product>/<time>-1200.webp + <product>/<time>-600.webp), and
-- saves the 1200px address in products.photo_url; the website works out the 600px one. No table
-- changes: photo_url stays as it was.
--
-- Who may change photos, as Row Level Security on storage.objects: Hema's admin account (a row in
-- admin_users) and the admin function (service role, after her login check; it bypasses RLS).
-- Nobody else: not the public, not any other logged-in account. Anyone may LOOK at the photos
-- through their public address (they are on the menu); listing the bucket is admin-only.
-- products is already admin-only for writing ("admin edits the menu", 20261005000001_init.sql).

drop policy if exists "admin lists product photos" on storage.objects;
create policy "admin lists product photos" on storage.objects for select to authenticated
  using (bucket_id = 'product-photos' and public.is_admin());

drop policy if exists "admin adds product photos" on storage.objects;
create policy "admin adds product photos" on storage.objects for insert to authenticated
  with check (bucket_id = 'product-photos' and public.is_admin());

drop policy if exists "admin replaces product photos" on storage.objects;
create policy "admin replaces product photos" on storage.objects for update to authenticated
  using (bucket_id = 'product-photos' and public.is_admin())
  with check (bucket_id = 'product-photos' and public.is_admin());

drop policy if exists "admin removes product photos" on storage.objects;
create policy "admin removes product photos" on storage.objects for delete to authenticated
  using (bucket_id = 'product-photos' and public.is_admin());
