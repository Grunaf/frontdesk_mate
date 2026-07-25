-- Guest profile identity (reusable across bookings) + link tourism stay rows to guests.
-- Sync A: tourism identity edits update the guests profile.

alter table public.guests
  add column if not exists first_name text,
  add column if not exists last_name text,
  add column if not exists citizenship text,
  add column if not exists passport_number text,
  add column if not exists date_of_birth date,
  add column if not exists country_of_birth text,
  add column if not exists place_of_birth text,
  add column if not exists gender text,
  add column if not exists document_type text;

alter table public.guests
  drop constraint if exists guests_gender_check;

alter table public.guests
  add constraint guests_gender_check
  check (gender is null or gender in ('male', 'female'));

alter table public.guests
  drop constraint if exists guests_document_type_check;

alter table public.guests
  add constraint guests_document_type_check
  check (document_type is null or document_type in ('passport', 'id_card'));

create index if not exists guests_tenant_display_name_idx
  on public.guests (tenant_id, display_name);

create index if not exists guests_tenant_passport_number_idx
  on public.guests (tenant_id, passport_number)
  where passport_number is not null and btrim(passport_number) <> '';

alter table public.guest_stay_tourism_guests
  add column if not exists guest_id uuid references public.guests (id) on delete set null;

create index if not exists guest_stay_tourism_guests_guest_id_idx
  on public.guest_stay_tourism_guests (guest_id)
  where guest_id is not null;
