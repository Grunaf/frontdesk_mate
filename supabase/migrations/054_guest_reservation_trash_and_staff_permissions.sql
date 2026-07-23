-- Soft-delete (trash) for guest_reservations + reception_users permissions (v1 trash only).
-- Trashed rows keep status as-is (usually planned); exclude/indexes ignore is_deleted.

alter table public.guest_reservations
  add column if not exists is_deleted boolean not null default false,
  add column if not exists deleted_at timestamptz,
  add column if not exists deleted_by_reception_user_id uuid references public.reception_users (id) on delete set null;

-- Existing cancelled rows stay out of trash.
update public.guest_reservations
set is_deleted = false
where is_deleted is distinct from false;

create index if not exists guest_reservations_tenant_trash_idx
  on public.guest_reservations (tenant_id, deleted_at desc)
  where is_deleted;

-- Overlap: archived (cancelled) and trashed must not block bed nights.
alter table public.guest_reservations
  drop constraint if exists guest_reservations_no_bed_night_overlap;

alter table public.guest_reservations
  add constraint guest_reservations_no_bed_night_overlap
  exclude using gist (
    tenant_id with =,
    bed_id with =,
    daterange(check_in_date, check_out_date, '[)') with &&
  )
  where (status = 'planned' and is_deleted = false);

drop index if exists guest_reservations_tenant_active_idx;
create index guest_reservations_tenant_active_idx
  on public.guest_reservations (tenant_id, check_out_at)
  where status = 'planned' and is_deleted = false;

drop index if exists guest_reservations_tenant_bed_dates_idx;
drop index if exists guest_reservations_tenant_bed_stay_dates_idx;
create index guest_reservations_tenant_bed_stay_dates_idx
  on public.guest_reservations (tenant_id, bed_id, check_in_date, check_out_date)
  where status = 'planned' and is_deleted = false;

-- Reception staff permissions (whitelist; empty = line staff).
alter table public.reception_users
  add column if not exists permissions text[] not null default '{}';

alter table public.reception_users
  drop constraint if exists reception_users_permissions_whitelist;

alter table public.reception_users
  add constraint reception_users_permissions_whitelist check (
    permissions <@ array[
      'reservation.trash.read',
      'reservation.trash.restore',
      'reservation.trash.purge'
    ]::text[]
  );
