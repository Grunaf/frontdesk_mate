-- Split guest_stays into guest (profile), reservation (bed/nights), and access grant (PIN/link).
-- Backfill preserves reservation id = legacy guest_stays.id for stable refs and tourism stay_id.

create table if not exists guests (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants (id) on delete cascade,
  display_name text not null,
  contact_whatsapp text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists guests_tenant_id_idx on guests (tenant_id);

create table if not exists guest_reservations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants (id) on delete cascade,
  guest_id uuid references guests (id) on delete set null,
  guest_name text,
  bed_id text not null,
  check_in_at timestamptz not null,
  check_out_at timestamptz not null,
  status text not null default 'planned' check (status in ('planned', 'cancelled')),
  desk_checked_in_at timestamptz,
  key_issued_at timestamptz,
  passport_checked_at timestamptz,
  tax_collected_at timestamptz,
  tourism_contact_whatsapp text,
  tourism_registration_completed_at timestamptz,
  tourism_exported_at timestamptz,
  stay_contact_whatsapp text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists guest_reservations_tenant_active_idx
  on guest_reservations (tenant_id, check_out_at)
  where status = 'planned';

create index if not exists guest_reservations_tenant_bed_dates_idx
  on guest_reservations (tenant_id, bed_id, check_in_at, check_out_at)
  where status = 'planned';

alter table guest_reservations
  add constraint guest_reservations_no_bed_night_overlap
  exclude using gist (
    tenant_id with =,
    bed_id with =,
    daterange(
      (check_in_at at time zone 'UTC')::date,
      (check_out_at at time zone 'UTC')::date,
      '[)'
    ) with &&
  )
  where (status = 'planned');

create table if not exists guest_access_grants (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants (id) on delete cascade,
  reservation_id uuid not null references guest_reservations (id) on delete cascade,
  access_token_hash text not null,
  access_token_encrypted text,
  pin_hash text not null,
  activated_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists guest_access_grants_token_hash_idx
  on guest_access_grants (access_token_hash);

create unique index if not exists guest_access_grants_one_active_per_reservation_idx
  on guest_access_grants (reservation_id)
  where revoked_at is null;

create index if not exists guest_access_grants_reservation_id_idx
  on guest_access_grants (reservation_id);

create index if not exists guest_access_grants_tenant_pin_idx
  on guest_access_grants (tenant_id, pin_hash)
  where revoked_at is null;

-- Backfill reservations from legacy guest_stays (same id).
insert into guest_reservations (
  id,
  tenant_id,
  guest_id,
  guest_name,
  bed_id,
  check_in_at,
  check_out_at,
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
on conflict (id) do nothing;

-- One access grant per legacy stay row.
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
where not exists (
  select 1
  from guest_access_grants g
  where g.reservation_id = gs.id
);

-- Tourism guests: stay_id now references guest_reservations (same uuid).
alter table guest_stay_tourism_guests
  drop constraint if exists guest_stay_tourism_guests_stay_id_fkey;

alter table guest_stay_tourism_guests
  add constraint guest_stay_tourism_guests_stay_id_fkey
  foreign key (stay_id) references guest_reservations (id) on delete cascade;

-- Issues: stay_id references reservation.
alter table guest_issues
  drop constraint if exists guest_issues_stay_id_fkey;

alter table guest_issues
  add constraint guest_issues_stay_id_fkey
  foreign key (stay_id) references guest_reservations (id) on delete cascade;

-- Stop enforcing overlap on legacy table (writes move to guest_reservations).
alter table guest_stays
  drop constraint if exists guest_stays_no_bed_night_overlap;

grant all on table public.guests to postgres, service_role;
grant all on table public.guest_reservations to postgres, service_role;
grant all on table public.guest_access_grants to postgres, service_role;
