-- Module 9: owner city pack requests (self-service, no auto-provisioning).

create type public.city_pack_request_kind as enum ('new_city', 'pack_not_ready', 'other');
create type public.city_pack_request_status as enum ('pending', 'reviewed', 'fulfilled', 'dismissed');

create table public.city_pack_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  tenant_id uuid references public.tenants (id) on delete set null,
  kind public.city_pack_request_kind not null,
  city_name text not null,
  country_or_region text,
  message text,
  related_city_pack_id text references public.city_packs (id) on delete set null,
  status public.city_pack_request_status not null default 'pending',
  created_at timestamptz not null default now()
);

create index city_pack_requests_user_id_idx on public.city_pack_requests (user_id);
create index city_pack_requests_status_created_idx on public.city_pack_requests (status, created_at desc);

alter table public.city_pack_requests enable row level security;

create policy city_pack_requests_insert_own on public.city_pack_requests
  for insert to authenticated
  with check (user_id = auth.uid());

create policy city_pack_requests_select_own on public.city_pack_requests
  for select to authenticated
  using (user_id = auth.uid());

grant insert, select on public.city_pack_requests to authenticated;
grant all on public.city_pack_requests to service_role;
