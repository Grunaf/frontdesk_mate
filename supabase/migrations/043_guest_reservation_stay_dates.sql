-- Stay nights as first-class calendar dates; timestamptz remains derived access window.

alter table guest_reservations
  add column if not exists check_in_date date,
  add column if not exists check_out_date date;

-- Backfill from UTC calendar prefix of existing access timestamps (matches prior overlap rule).
update guest_reservations
set
  check_in_date = coalesce(check_in_date, (check_in_at at time zone 'UTC')::date),
  check_out_date = coalesce(check_out_date, (check_out_at at time zone 'UTC')::date)
where check_in_date is null or check_out_date is null;

alter table guest_reservations
  alter column check_in_date set not null,
  alter column check_out_date set not null;

alter table guest_reservations
  drop constraint if exists guest_reservations_check_out_after_check_in;

alter table guest_reservations
  add constraint guest_reservations_check_out_after_check_in
  check (check_out_date >= check_in_date);

-- Rebuild bed-night overlap on date columns (checkout exclusive).
alter table guest_reservations
  drop constraint if exists guest_reservations_no_bed_night_overlap;

alter table guest_reservations
  add constraint guest_reservations_no_bed_night_overlap
  exclude using gist (
    tenant_id with =,
    bed_id with =,
    daterange(check_in_date, check_out_date, '[)') with &&
  )
  where (status = 'planned');

create index if not exists guest_reservations_tenant_bed_stay_dates_idx
  on guest_reservations (tenant_id, bed_id, check_in_date, check_out_date)
  where status = 'planned';
