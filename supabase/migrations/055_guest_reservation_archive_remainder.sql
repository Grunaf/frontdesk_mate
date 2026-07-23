-- Unify Trash + Cancel into Archive; support mid-stay remainder rows.
-- Soft-archive flag: is_archived / archived_at (renamed from is_deleted / deleted_*).
-- Remainder rows link via original_reservation_id; overlap ignores archived rows.

-- 1) Rename trash columns → archive semantics
alter table public.guest_reservations
  rename column is_deleted to is_archived;

alter table public.guest_reservations
  rename column deleted_at to archived_at;

alter table public.guest_reservations
  rename column deleted_by_reception_user_id to archived_by_reception_user_id;

drop index if exists guest_reservations_tenant_trash_idx;
create index if not exists guest_reservations_tenant_archive_idx
  on public.guest_reservations (tenant_id, archived_at desc)
  where is_archived;

-- 2) Remainder link + archive kind
alter table public.guest_reservations
  add column if not exists original_reservation_id uuid
    references public.guest_reservations (id) on delete set null;

alter table public.guest_reservations
  add column if not exists archive_kind text;

alter table public.guest_reservations
  add column if not exists archive_reason text;

alter table public.guest_reservations
  drop constraint if exists guest_reservations_archive_kind_check;

alter table public.guest_reservations
  add constraint guest_reservations_archive_kind_check
  check (archive_kind is null or archive_kind in ('full', 'remainder'));

alter table public.guest_reservations
  drop constraint if exists guest_reservations_archive_reason_check;

alter table public.guest_reservations
  add constraint guest_reservations_archive_reason_check
  check (archive_reason is null or archive_reason in ('cancelled', 'checked_out'));

create index if not exists guest_reservations_original_reservation_idx
  on public.guest_reservations (original_reservation_id)
  where original_reservation_id is not null;

-- Existing soft-deleted rows → full archive (treat as cancelled)
update public.guest_reservations
set
  archive_kind = coalesce(archive_kind, 'full'),
  archive_reason = coalesce(archive_reason, 'cancelled')
where is_archived = true;

-- Existing cancelled (old "Archive" cancel) → soft-archive so they appear in Archive list
update public.guest_reservations
set
  is_archived = true,
  archived_at = coalesce(archived_at, updated_at, created_at, now()),
  archive_kind = coalesce(archive_kind, 'full'),
  archive_reason = coalesce(archive_reason, 'cancelled'),
  status = 'cancelled'
where status = 'cancelled'
  and is_archived = false;

-- 3) Overlap / active indexes (archived never blocks beds)
alter table public.guest_reservations
  drop constraint if exists guest_reservations_no_bed_night_overlap;

alter table public.guest_reservations
  add constraint guest_reservations_no_bed_night_overlap
  exclude using gist (
    tenant_id with =,
    bed_id with =,
    daterange(check_in_date, check_out_date, '[)') with &&
  )
  where (status = 'planned' and is_archived = false);

drop index if exists guest_reservations_tenant_active_idx;
create index guest_reservations_tenant_active_idx
  on public.guest_reservations (tenant_id, check_out_at)
  where status = 'planned' and is_archived = false;

drop index if exists guest_reservations_tenant_bed_stay_dates_idx;
create index guest_reservations_tenant_bed_stay_dates_idx
  on public.guest_reservations (tenant_id, bed_id, check_in_date, check_out_date)
  where status = 'planned' and is_archived = false;

-- 4) Permissions: trash.* → archive.*
-- Drop whitelist first: old CHECK only allows trash.*; UPDATE to archive.* would fail otherwise.
alter table public.reception_users
  drop constraint if exists reception_users_permissions_whitelist;

update public.reception_users
set permissions = (
  select coalesce(array_agg(distinct mapped.perm), '{}'::text[])
  from unnest(permissions) as p(perm)
  cross join lateral (
    select case p.perm
      when 'reservation.trash.read' then 'reservation.archive.read'
      when 'reservation.trash.restore' then 'reservation.archive.restore'
      when 'reservation.trash.purge' then 'reservation.archive.purge'
      else p.perm
    end as perm
  ) as mapped
);

alter table public.reception_users
  add constraint reception_users_permissions_whitelist check (
    permissions <@ array[
      'reservation.archive.read',
      'reservation.archive.restore',
      'reservation.archive.purge'
    ]::text[]
  );
