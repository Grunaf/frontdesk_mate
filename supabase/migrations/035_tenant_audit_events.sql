-- Module 11: immutable audit trail for owner/platform tenant settings changes.

create type public.tenant_audit_actor as enum ('owner', 'platform');

create table public.tenant_audit_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  actor_kind public.tenant_audit_actor not null,
  actor_user_id uuid references auth.users (id) on delete set null,
  event_type text not null,
  changed_keys text[] not null default '{}',
  flags jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index tenant_audit_events_tenant_created_idx
  on public.tenant_audit_events (tenant_id, created_at desc);

alter table public.tenant_audit_events enable row level security;

grant all on public.tenant_audit_events to service_role;
