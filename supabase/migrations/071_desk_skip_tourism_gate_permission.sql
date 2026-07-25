-- Allow staff permission: skip tourism gate on check-in / grant (with app confirm).
-- App whitelist: desk.check_in, desk.cleaning, desk.skip_tourism_gate
-- (empty {} remains valid / legacy check-in only — no skip).

alter table public.reception_users
  drop constraint if exists reception_users_permissions_whitelist;

alter table public.reception_users
  add constraint reception_users_permissions_whitelist check (
    permissions <@ array[
      'desk.check_in',
      'desk.cleaning',
      'desk.skip_tourism_gate'
    ]::text[]
  );
