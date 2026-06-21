-- Grant API roles access to tenant tables (required when SQL is run outside Supabase CLI migrations).
grant usage on schema public to postgres, anon, authenticated, service_role;

grant all on table public.city_packs to postgres, service_role;
grant select on table public.city_packs to anon, authenticated;

grant all on table public.tenants to postgres, service_role;
grant select on table public.tenants to anon, authenticated;
