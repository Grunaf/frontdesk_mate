-- Split Booking.com inbox amounts: list price vs detail total due (city tax etc.).
-- Migrate legacy `amount` into list_amount; detail syncs write total_amount only.

alter table public.booking_com_external_bookings
  add column if not exists list_amount numeric,
  add column if not exists total_amount numeric;

update public.booking_com_external_bookings
set list_amount = amount
where amount is not null
  and list_amount is null;

comment on column public.booking_com_external_bookings.list_amount is
  'Extranet reservation list price (booking only, without city tax extras).';

comment on column public.booking_com_external_bookings.total_amount is
  'Extranet detail total amount due (includes city tax and other charges when shown).';

comment on column public.booking_com_external_bookings.inbox_status is
  'open = awaiting Add stay; done = local stay created from inbox; dismissed = ignored.';

comment on table public.booking_com_external_bookings is
  'Booking.com extranet bookings synced by Chrome extension; reception inbox before Add stay.';
