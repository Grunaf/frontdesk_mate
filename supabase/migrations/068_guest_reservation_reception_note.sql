alter table public.guest_reservations
  add column if not exists reception_note text;

comment on column public.guest_reservations.reception_note is
  'Desk-only booking comment for reception; not shown in guest app.';
