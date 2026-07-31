-- Inbox of Booking.com Extranet bookings synced via Chrome extension.
-- One row per (tenant, hotel_id, booking_id); phone and fields patch in place.

create table if not exists booking_com_external_bookings (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants (id) on delete cascade,
  hotel_id text not null,
  booking_id text not null,
  guest_name text,
  phone_number text,
  adults integer,
  children integer,
  check_in date,
  check_out date,
  amount numeric,
  currency text,
  booking_status text not null default 'unknown'
    check (booking_status in ('ok', 'cancelled', 'no_show', 'unknown')),
  room_name text,
  inbox_status text not null default 'open'
    check (inbox_status in ('open', 'done', 'dismissed')),
  source text not null default 'list_api'
    check (source in ('list_api', 'detail_api', 'dom_fallback')),
  captured_at timestamptz,
  issued_stay_id uuid references guest_reservations (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, hotel_id, booking_id)
);

comment on table public.booking_com_external_bookings is
  'Booking.com extranet bookings synced by staff Chrome extension; reception inbox before Issue Access.';

comment on column public.booking_com_external_bookings.booking_id is
  'Booking.com reservation id (res_id).';

comment on column public.booking_com_external_bookings.hotel_id is
  'Booking.com property id; must match tenant receptionBooking.bookingComHotelId.';

comment on column public.booking_com_external_bookings.inbox_status is
  'open = awaiting desk action; done = Issue Access completed; dismissed = ignored.';

create index if not exists booking_com_external_bookings_tenant_inbox_check_in_idx
  on booking_com_external_bookings (tenant_id, inbox_status, check_in nulls last, created_at desc);

grant all on table public.booking_com_external_bookings to postgres, service_role;
