-- Archive v1: no staff permissions for archive/trash/purge.
-- Clear any previously granted archive/trash keys; whitelist becomes empty-only.

update public.reception_users
set permissions = '{}'::text[]
where permissions is distinct from '{}'::text[];

alter table public.reception_users
  drop constraint if exists reception_users_permissions_whitelist;

-- Empty whitelist: only {} is allowed until a future permission set is introduced.
alter table public.reception_users
  add constraint reception_users_permissions_whitelist check (
    permissions <@ array[]::text[]
  );
