-- Desk roles (Volunteers Phase C): allow check-in / cleaning staff permissions.
-- App whitelist: desk.check_in, desk.cleaning (empty {} remains valid / legacy check-in).

alter table public.reception_users
  drop constraint if exists reception_users_permissions_whitelist;

alter table public.reception_users
  add constraint reception_users_permissions_whitelist check (
    permissions <@ array[
      'desk.check_in',
      'desk.cleaning'
    ]::text[]
  );
