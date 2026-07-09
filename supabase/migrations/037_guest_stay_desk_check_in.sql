-- Reception desk check-in timestamps (see docs/tz/guest-desk-check-in-v1.md)

alter table guest_stays
  add column if not exists desk_checked_in_at timestamptz,
  add column if not exists key_issued_at timestamptz,
  add column if not exists passport_checked_at timestamptz,
  add column if not exists tax_collected_at timestamptz;
