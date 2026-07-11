-- Guest-requested hub transfers (airport/bus/train) for reception desk queue.

create table if not exists guest_hub_transfer_requests (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants (id) on delete cascade,
  stay_id uuid not null references guest_stays (id) on delete cascade,
  bed_id text not null,
  guest_name text,
  hub_category text not null check (hub_category in ('airport', 'bus', 'train')),
  direction text not null check (direction in ('to_hostel', 'from_hostel')),
  requested_date date not null,
  requested_time text not null,
  status text not null default 'open' check (status in ('open', 'done')),
  note text,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index if not exists guest_hub_transfer_requests_tenant_status_created_idx
  on guest_hub_transfer_requests (tenant_id, status, created_at desc);

create index if not exists guest_hub_transfer_requests_stay_idx
  on guest_hub_transfer_requests (stay_id);

grant all on table public.guest_hub_transfer_requests to postgres, service_role;
