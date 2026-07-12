-- Retire legacy guest_stays: canon is guests + guest_reservations + guest_access_grants.
-- 1) Final backfill from guest_stays if any rows were never copied.
-- 2) Point hub-transfer FK at guest_reservations (042 still referenced guest_stays).
-- 3) Drop guest_stays.

-- ---------------------------------------------------------------------------
-- Final reservation backfill (same id as legacy stay for stable stay_id refs).
-- ---------------------------------------------------------------------------
insert into guest_reservations (
  id,
  tenant_id,
  guest_id,
  guest_name,
  bed_id,
  check_in_at,
  check_out_at,
  check_in_date,
  check_out_date,
  status,
  desk_checked_in_at,
  key_issued_at,
  passport_checked_at,
  tax_collected_at,
  tourism_contact_whatsapp,
  tourism_registration_completed_at,
  tourism_exported_at,
  stay_contact_whatsapp,
  created_at,
  updated_at
)
select
  gs.id,
  gs.tenant_id,
  null,
  gs.guest_name,
  gs.bed_id,
  gs.check_in_at,
  gs.check_out_at,
  (gs.check_in_at at time zone 'UTC')::date,
  (gs.check_out_at at time zone 'UTC')::date,
  case when gs.revoked_at is not null then 'cancelled' else 'planned' end,
  gs.desk_checked_in_at,
  gs.key_issued_at,
  gs.passport_checked_at,
  gs.tax_collected_at,
  gs.tourism_contact_whatsapp,
  gs.tourism_registration_completed_at,
  gs.tourism_exported_at,
  gs.stay_contact_whatsapp,
  gs.created_at,
  gs.updated_at
from guest_stays gs
where not exists (
  select 1
  from guest_reservations r
  where r.id = gs.id
)
on conflict (id) do nothing;

-- Final grant backfill for rows that still only lived on guest_stays.
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

-- Orphan hub transfers that cannot resolve to a reservation (should be empty).
delete from guest_hub_transfer_requests h
where not exists (
  select 1
  from guest_reservations r
  where r.id = h.stay_id
);

-- ---------------------------------------------------------------------------
-- Hub transfer FK → guest_reservations
-- ---------------------------------------------------------------------------
alter table guest_hub_transfer_requests
  drop constraint if exists guest_hub_transfer_requests_stay_id_fkey;

alter table guest_hub_transfer_requests
  add constraint guest_hub_transfer_requests_stay_id_fkey
  foreign key (stay_id) references guest_reservations (id) on delete cascade;

-- ---------------------------------------------------------------------------
-- Drop legacy table
-- ---------------------------------------------------------------------------
drop table if exists guest_stays;
