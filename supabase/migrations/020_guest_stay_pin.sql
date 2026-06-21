-- Short guest PIN for paper slip check-in (backup to magic link / QR).

alter table guest_stays
  add column if not exists pin_hash text;

create index if not exists guest_stays_tenant_pin_hash_idx
  on guest_stays (tenant_id, pin_hash)
  where revoked_at is null and pin_hash is not null;
