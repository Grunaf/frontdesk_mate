-- Guest stays: reception-assigned beds with magic-link access tokens.

create table if not exists guest_stays (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants (id) on delete cascade,
  bed_id text not null,
  guest_name text,
  check_in_at timestamptz not null default now(),
  check_out_at timestamptz not null,
  access_token_hash text not null unique,
  activated_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists guest_stays_tenant_id_idx on guest_stays (tenant_id);
create index if not exists guest_stays_tenant_active_idx on guest_stays (tenant_id, check_out_at)
  where revoked_at is null;

grant usage on schema public to postgres, anon, authenticated, service_role;

grant all on table public.guest_stays to postgres, service_role;
