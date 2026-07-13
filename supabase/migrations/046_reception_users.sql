-- Reception desk staff accounts (per-tenant logins; auth in app — stage 2).

create table public.reception_users (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  login text not null,
  display_name text not null,
  pin_hash text not null,
  disabled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint reception_users_tenant_login_unique unique (tenant_id, login)
);

create index reception_users_tenant_id_idx on public.reception_users (tenant_id);

alter table public.reception_users enable row level security;

grant all on table public.reception_users to postgres, service_role;
