-- Soft presence signals from Cleaning → desk (Vacant / Still here).
-- Not checkout. Cleared on desk checkout or explicit Clear.
-- Absence of a row = unset (no signal).

create table if not exists housekeeping_stay_presence (
  tenant_id uuid not null references tenants (id) on delete cascade,
  stay_id uuid not null references guest_reservations (id) on delete cascade,
  bed_id text not null,
  status text not null check (status in ('vacant', 'still_here')),
  set_by_reception_user_id uuid references reception_users (id) on delete set null,
  set_at timestamptz not null default now(),
  primary key (tenant_id, stay_id)
);

create index if not exists housekeeping_stay_presence_tenant_idx
  on housekeeping_stay_presence (tenant_id);

create index if not exists housekeeping_stay_presence_tenant_bed_idx
  on housekeeping_stay_presence (tenant_id, bed_id);

grant all on table public.housekeeping_stay_presence to postgres, service_role;
