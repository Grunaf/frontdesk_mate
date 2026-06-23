-- Guest-reported maintenance issues (shower, door, etc.) for reception desk queue.

create table if not exists guest_issues (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants (id) on delete cascade,
  stay_id uuid not null references guest_stays (id) on delete cascade,
  bed_id text not null,
  category text not null,
  note text,
  status text not null default 'open' check (status in ('open', 'done')),
  guest_name text,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index if not exists guest_issues_tenant_status_created_idx
  on guest_issues (tenant_id, status, created_at desc);

create index if not exists guest_issues_stay_open_idx
  on guest_issues (stay_id)
  where status = 'open';

grant all on table public.guest_issues to postgres, service_role;
