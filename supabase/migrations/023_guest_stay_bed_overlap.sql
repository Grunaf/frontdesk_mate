-- Prevent overlapping guest access on the same bed (calendar nights, checkout day exclusive).

create extension if not exists btree_gist;

create index if not exists guest_stays_tenant_bed_dates_idx
  on guest_stays (tenant_id, bed_id, check_in_at, check_out_at)
  where revoked_at is null;

alter table guest_stays
  add constraint guest_stays_no_bed_night_overlap
  exclude using gist (
    tenant_id with =,
    bed_id with =,
    daterange(
      (check_in_at at time zone 'UTC')::date,
      (check_out_at at time zone 'UTC')::date,
      '[)'
    ) with &&
  )
  where (revoked_at is null);
