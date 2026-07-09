-- Finish 038 grant backfill when legacy guest_stays rows lack pin_hash (nullable in 020).
-- Safe to re-run: skips rows that already have a grant or missing token/pin.

insert into guest_access_grants (
  tenant_id,
  reservation_id,
  access_token_hash,
  access_token_encrypted,
  pin_hash,
  activated_at,
  revoked_at,
  created_at,
  updated_at
)
select
  gs.tenant_id,
  gs.id,
  gs.access_token_hash,
  gs.access_token_encrypted,
  gs.pin_hash,
  gs.activated_at,
  gs.revoked_at,
  gs.created_at,
  gs.updated_at
from guest_stays gs
where gs.pin_hash is not null
  and gs.access_token_hash is not null
  and exists (
    select 1
    from guest_reservations r
    where r.id = gs.id
  )
  and not exists (
    select 1
    from guest_access_grants g
    where g.reservation_id = gs.id
  );

-- Idempotent tail from 038 if a prior run failed after grants.
alter table guest_stay_tourism_guests
  drop constraint if exists guest_stay_tourism_guests_stay_id_fkey;

alter table guest_stay_tourism_guests
  add constraint guest_stay_tourism_guests_stay_id_fkey
  foreign key (stay_id) references guest_reservations (id) on delete cascade;

alter table guest_issues
  drop constraint if exists guest_issues_stay_id_fkey;

alter table guest_issues
  add constraint guest_issues_stay_id_fkey
  foreign key (stay_id) references guest_reservations (id) on delete cascade;

alter table guest_stays
  drop constraint if exists guest_stays_no_bed_night_overlap;
