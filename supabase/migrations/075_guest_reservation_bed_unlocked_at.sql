-- Manual early bed unlock (audit timestamp). Auto visibility after check-in time is computed.
-- Check-in also writes bed_unlocked_at when null for explicit audit.

alter table public.guest_reservations
  add column if not exists bed_unlocked_at timestamptz;

comment on column public.guest_reservations.bed_unlocked_at is
  'Reception unlocked bed visibility early (or on check-in). Null = rely on check-in time / admit.';
