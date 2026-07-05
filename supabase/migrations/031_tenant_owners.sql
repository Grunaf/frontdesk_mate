-- Module 2: owner portal auth — tenant_owners (1:1 user ↔ tenant) + tenants RLS.
--
-- Supabase Dashboard (manual):
--   Auth → Providers: Email enabled.
--   Auth → URL configuration:
--     Site URL: https://dashboard.{BASE_DOMAIN} (dev: http://dashboard.localhost:3000)
--     Redirect URLs: http://dashboard.localhost:3000/**, https://dashboard.{domain}/**
--   Confirm email: recommended for prod; may disable in dev for faster signup.

-- tenant_owners: 1 auth user ↔ 1 tenant
create table public.tenant_owners (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint tenant_owners_user_id_unique unique (user_id),
  constraint tenant_owners_tenant_id_unique unique (tenant_id)
);

create index tenant_owners_user_id_idx on public.tenant_owners (user_id);
create index tenant_owners_tenant_id_idx on public.tenant_owners (tenant_id);

alter table public.tenant_owners enable row level security;

create policy tenant_owners_select_own on public.tenant_owners
  for select to authenticated
  using (user_id = auth.uid());

grant select on public.tenant_owners to authenticated;
grant all on public.tenant_owners to service_role;

-- tenants: RLS — anon keeps full SELECT (guest/landing); authenticated only via tenant_owners
alter table public.tenants enable row level security;

create policy tenants_select_anon on public.tenants
  for select to anon
  using (true);

create policy tenants_select_owner on public.tenants
  for select to authenticated
  using (
    exists (
      select 1
      from public.tenant_owners o
      where o.tenant_id = tenants.id
        and o.user_id = auth.uid()
    )
  );
