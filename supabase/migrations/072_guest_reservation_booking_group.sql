alter table public.guest_reservations
  add column if not exists booking_group_id uuid;

comment on column public.guest_reservations.booking_group_id is
  'Shared id for multi-guest party bookings; null = singleton stay. Balance lives on lead row only.';

create index if not exists guest_reservations_tenant_booking_group_idx
  on public.guest_reservations (tenant_id, booking_group_id)
  where booking_group_id is not null;
