-- service_role (admin client) needs CRUD on volunteers; 059 created the table without grants.

grant all on table public.volunteers to postgres, service_role;
