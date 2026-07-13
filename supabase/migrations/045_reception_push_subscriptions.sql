-- Web Push subscriptions for reception desk PWAs (per tenant, multi-device).

create table if not exists reception_push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants (id) on delete cascade,
  endpoint text not null,
  subscription jsonb not null,
  user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, endpoint)
);

create index if not exists reception_push_subscriptions_tenant_id_idx
  on reception_push_subscriptions (tenant_id);

grant all on table public.reception_push_subscriptions to postgres, service_role;
