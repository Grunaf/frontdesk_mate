-- Public tenant assets (admin-uploaded images). Anonymous read; writes only via service_role (no insert policies for anon/authenticated).

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'tenant-assets',
  'tenant-assets',
  true,
  5242880,
  array['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/svg+xml']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists tenant_assets_public_read on storage.objects;

create policy tenant_assets_public_read
on storage.objects
for select
to public
using (bucket_id = 'tenant-assets');
