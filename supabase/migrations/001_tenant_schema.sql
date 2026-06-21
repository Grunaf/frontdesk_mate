-- SaaS tenant layer: city packs (shared routes) + per-hostel settings.
-- Routes stay in code/i18n for now; city_pack_id selects the pack at runtime.

create table if not exists city_packs (
  id text primary key,
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists tenants (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  city_pack_id text not null references city_packs (id),
  settings jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists tenants_slug_idx on tenants (slug);
create index if not exists tenants_city_pack_idx on tenants (city_pack_id);

insert into city_packs (id, name)
values ('sarajevo', 'Sarajevo')
on conflict (id) do nothing;

-- Example tenant; full settings seeded in migration 006.
insert into tenants (slug, name, city_pack_id, settings)
values (
  'default',
  'Default Hostel',
  'sarajevo',
  '{}'::jsonb
)
on conflict (slug) do nothing;

grant usage on schema public to postgres, anon, authenticated, service_role;

grant all on table public.city_packs to postgres, service_role;
grant select on table public.city_packs to anon, authenticated;

grant all on table public.tenants to postgres, service_role;
grant select on table public.tenants to anon, authenticated;
