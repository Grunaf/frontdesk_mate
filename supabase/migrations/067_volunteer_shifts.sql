-- Volunteer weekly hour target + exact-time shifts (owner schedule MVP).

alter table public.volunteers
  add column if not exists weekly_hours_target numeric(5, 2) not null default 25;

alter table public.volunteers
  drop constraint if exists volunteers_weekly_hours_target_check;

alter table public.volunteers
  add constraint volunteers_weekly_hours_target_check
  check (weekly_hours_target > 0 and weekly_hours_target <= 168);

comment on column public.volunteers.weekly_hours_target is
  'Agreed weekly work hours (e.g. 25 for Worldpackers-style stays)';

create table if not exists public.volunteer_shifts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  volunteer_id uuid not null references public.volunteers (id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint volunteer_shifts_range_check check (ends_at > starts_at)
);

create index if not exists volunteer_shifts_tenant_starts_idx
  on public.volunteer_shifts (tenant_id, starts_at);

create index if not exists volunteer_shifts_volunteer_starts_idx
  on public.volunteer_shifts (volunteer_id, starts_at);

comment on table public.volunteer_shifts is
  'Owner-planned volunteer work shifts with exact start/end (property-local wall times stored as timestamptz)';

grant all on table public.volunteer_shifts to postgres, service_role;
