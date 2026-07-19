-- Housekeeping (HK) operational statuses for reception Plan.
-- Intentionally NOT stored in settings.guestStay.beds[] — status changes often.
--
-- Absence of a row = unset (not dirty, not ready). Plan must not paint HK chips
-- for beds/rooms without a row. Do not backfill defaults; empty tables mean
-- "HK tracking not started yet" (banner / CTA in Plan UI), not all-clean or all-dirty.

create table if not exists housekeeping_bed_statuses (
  tenant_id uuid not null references tenants (id) on delete cascade,
  bed_id text not null,
  status text not null check (status in ('ready', 'waiting_linen', 'no_linen')),
  updated_at timestamptz not null default now(),
  primary key (tenant_id, bed_id)
);

create table if not exists housekeeping_room_statuses (
  tenant_id uuid not null references tenants (id) on delete cascade,
  room_id text not null,
  status text not null check (status in ('cleaned', 'not_cleaned')),
  updated_at timestamptz not null default now(),
  primary key (tenant_id, room_id)
);

create index if not exists housekeeping_bed_statuses_tenant_idx
  on housekeeping_bed_statuses (tenant_id);

create index if not exists housekeeping_room_statuses_tenant_idx
  on housekeeping_room_statuses (tenant_id);

grant all on table public.housekeeping_bed_statuses to postgres, service_role;
grant all on table public.housekeeping_room_statuses to postgres, service_role;
