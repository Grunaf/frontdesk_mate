-- Repair: older DBs may have housekeeping_laundry_runs without machine_id
-- even though 064 is marked applied (draft table / partial apply).

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

drop index if exists public.housekeeping_laundry_runs_one_running_per_tenant_idx;

create unique index if not exists housekeeping_laundry_runs_one_running_per_machine_idx
  on public.housekeeping_laundry_runs (tenant_id, machine_id)
  where status = 'running';
