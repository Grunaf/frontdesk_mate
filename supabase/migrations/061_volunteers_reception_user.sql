-- Link volunteer records to reception staff accounts created with the volunteer.

alter table public.volunteers
  add column if not exists reception_user_id uuid references public.reception_users (id) on delete set null;

create index if not exists volunteers_reception_user_id_idx
  on public.volunteers (reception_user_id)
  where reception_user_id is not null;

comment on column public.volunteers.reception_user_id is
  'Reception desk staff account created with this volunteer (PIN not stored in plaintext)';
