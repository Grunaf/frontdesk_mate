-- Optional guest email from Booking.com Extranet detail (mailto), when phone is hidden.

alter table public.booking_com_external_bookings
  add column if not exists guest_email text;

comment on column public.booking_com_external_bookings.guest_email is
  'Guest email from Extranet detail when phone is unavailable.';
