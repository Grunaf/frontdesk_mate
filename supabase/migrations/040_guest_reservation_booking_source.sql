alter table public.guest_reservations
  add column if not exists booking_platform_id text,
  add column if not exists booking_external_id text;

comment on column public.guest_reservations.booking_platform_id is
  'Tenant-configured reception booking platform slug (not landing booking engine).';

comment on column public.guest_reservations.booking_external_id is
  'OTA/PMS confirmation reference for staff reconciliation.';

create index if not exists guest_reservations_tenant_booking_ref_idx
  on public.guest_reservations (tenant_id, booking_platform_id, booking_external_id)
  where booking_external_id is not null;
