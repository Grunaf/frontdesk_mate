-- Laundry runs for Cleaning hub: one running cycle per (tenant, machine).
-- Duration is snapshotted into ends_at at Start from settings.laundry.

create table if not exists public.housekeeping_laundry_runs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  machine_id text not null,
  program text not null check (program in ('wash', 'spin_drain')),
  status text not null check (status in ('running', 'done', 'cancelled')),
  started_at timestamptz not null,
  ends_at timestamptz not null,
  completed_at timestamptz null,
  started_by_reception_user_id uuid null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Upgrade path from earlier draft (tenant-only unique / bed_ids / no machine columns).
alter table public.housekeeping_laundry_runs
  add column if not exists machine_id text;

alter table public.housekeeping_laundry_runs
  add column if not exists program text;

update public.housekeeping_laundry_runs
set machine_id = 'legacy'
where machine_id is null or btrim(machine_id) = '';

update public.housekeeping_laundry_runs
set program = 'wash'
where program is null
   or program not in ('wash', 'spin_drain');

do $$
begin
  alter table public.housekeeping_laundry_runs
    alter column machine_id set not null;
exception
  when others then null;
end $$;

do $$
begin
  alter table public.housekeeping_laundry_runs
    alter column program set not null;
exception
  when others then null;
end $$;

alter table public.housekeeping_laundry_runs
  drop column if exists bed_ids;

drop index if exists public.housekeeping_laundry_runs_one_running_per_tenant_idx;

create unique index if not exists housekeeping_laundry_runs_one_running_per_machine_idx
  on public.housekeeping_laundry_runs (tenant_id, machine_id)
  where status = 'running';

create index if not exists housekeeping_laundry_runs_tenant_idx
  on public.housekeeping_laundry_runs (tenant_id);

grant all on table public.housekeeping_laundry_runs to postgres, service_role;
