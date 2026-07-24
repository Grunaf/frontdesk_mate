-- Idempotency ledger for daily housekeeping bed rollover (checkout → needs_strip).
-- One row per tenant + operational calendar day; concurrent cron upserts are safe.

create table if not exists housekeeping_bed_rollover_runs (
  tenant_id uuid not null references tenants (id) on delete cascade,
  operational_date date not null,
  ran_at timestamptz not null default now(),
  primary key (tenant_id, operational_date)
);

create index if not exists housekeeping_bed_rollover_runs_tenant_idx
  on housekeeping_bed_rollover_runs (tenant_id);

grant all on table public.housekeeping_bed_rollover_runs to postgres, service_role;
