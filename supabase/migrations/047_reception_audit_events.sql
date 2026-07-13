-- Immutable audit trail for reception desk staff actions.

create table public.reception_audit_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  actor_reception_user_id uuid references public.reception_users (id) on delete set null,
  event_type text not null,
  subject_type text,
  subject_id text,
  flags jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index reception_audit_events_tenant_created_idx
  on public.reception_audit_events (tenant_id, created_at desc);

alter table public.reception_audit_events enable row level security;

grant all on public.reception_audit_events to service_role;
