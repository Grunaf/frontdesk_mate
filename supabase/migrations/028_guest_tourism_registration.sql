-- Tourism registration fields on stays and per-guest document metadata.

alter table guest_stays
  add column if not exists tourism_contact_whatsapp text,
  add column if not exists tourism_registration_completed_at timestamptz,
  add column if not exists tourism_exported_at timestamptz;

create table if not exists guest_stay_tourism_guests (
  id uuid primary key default gen_random_uuid(),
  stay_id uuid not null references guest_stays (id) on delete cascade,
  first_name text not null,
  last_name text not null,
  passport_storage_path text not null,
  entry_stamp_storage_path text not null,
  created_at timestamptz not null default now()
);

create index if not exists guest_stay_tourism_guests_stay_id_idx
  on guest_stay_tourism_guests (stay_id);

grant all on table public.guest_stay_tourism_guests to postgres, service_role;
