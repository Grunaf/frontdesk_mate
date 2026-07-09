alter table public.guest_reservations
  add column if not exists booking_amount_due_minor bigint,
  add column if not exists booking_amount_currency text,
  add column if not exists booking_paid_at timestamptz;

comment on column public.guest_reservations.booking_amount_due_minor is
  'Remaining stay balance in minor currency units (not city tax).';

comment on column public.guest_reservations.booking_amount_currency is
  'ISO currency for booking_amount_due_minor (tenant primary currency at time of entry).';

comment on column public.guest_reservations.booking_paid_at is
  'Desk mark when stay balance was paid; null means unpaid.';

create index if not exists guest_reservations_tenant_booking_unpaid_idx
  on public.guest_reservations (tenant_id, booking_paid_at)
  where booking_amount_due_minor is not null;
