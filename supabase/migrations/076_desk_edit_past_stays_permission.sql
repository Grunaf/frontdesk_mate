-- Allow staff permission: edit dates/bed/booking fields on ended / checked-out stays.
-- App whitelist: desk.check_in, desk.cleaning, desk.skip_tourism_gate, desk.edit_past_stays
-- (empty {} remains valid / legacy check-in only — no edit past).

alter table public.reception_users
  drop constraint if exists reception_users_permissions_whitelist;

alter table public.reception_users
  add constraint reception_users_permissions_whitelist check (
    permissions <@ array[
      'desk.check_in',
      'desk.cleaning',
      'desk.skip_tourism_gate',
      'desk.edit_past_stays'
    ]::text[]
  );
