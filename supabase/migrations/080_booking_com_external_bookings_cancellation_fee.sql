-- Cancellation fee from Extranet detail (separate from list price and total due).

alter table public.booking_com_external_bookings
  add column if not exists cancellation_fee_amount numeric;

comment on column public.booking_com_external_bookings.cancellation_fee_amount is
  'Extranet applicable cancellation fee / commissionable amount when reservation is cancelled.';

comment on column public.booking_com_external_bookings.list_amount is
  'Extranet list / room booking price (pre-cancel room total when cancelled).';

comment on column public.booking_com_external_bookings.total_amount is
  'Extranet detail total amount due (0 when cancelled with no remaining due).';
