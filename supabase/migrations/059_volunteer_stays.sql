-- Volunteer stays: occupancy via guest_reservations (Plan) + volunteer metadata row.
-- stay_kind marks reservations that must not use booking price/source or reception cancel.

alter table guest_reservations
  add column if not exists stay_kind text not null default 'guest';

alter table guest_reservations
  drop constraint if exists guest_reservations_stay_kind_check;

alter table guest_reservations
  add constraint guest_reservations_stay_kind_check
  check (stay_kind in ('guest', 'volunteer'));

comment on column guest_reservations.stay_kind is
  'guest = paid/walk-in booking; volunteer = owner-portal volunteer stay (no price/source)';

create table if not exists volunteers (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants (id) on delete cascade,
  reservation_id uuid not null references guest_reservations (id) on delete cascade,
  display_name text not null,
  source text not null,
  is_archived boolean not null default false,
  archived_at timestamptz,
  archived_by_owner_user_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint volunteers_source_check check (source in ('direct', 'worldpacker')),
  constraint volunteers_reservation_unique unique (reservation_id)
);

create index if not exists volunteers_tenant_active_idx
  on volunteers (tenant_id, created_at desc)
  where is_archived = false;

create index if not exists volunteers_tenant_id_idx on volunteers (tenant_id);

comment on table volunteers is
  'Owner-portal volunteer records; bed nights live on linked guest_reservations';
comment on column volunteers.source is 'direct | worldpacker';
