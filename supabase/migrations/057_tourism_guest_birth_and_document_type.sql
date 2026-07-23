-- Birth place/country + document type for tourism guests.
-- Backfill existing rows before NOT NULL constraints.

alter table guest_stay_tourism_guests
  add column if not exists country_of_birth text,
  add column if not exists place_of_birth text,
  add column if not exists document_type text;

update guest_stay_tourism_guests
set
  country_of_birth = coalesce(nullif(trim(country_of_birth), ''), nullif(trim(citizenship), ''), 'ME'),
  place_of_birth = coalesce(nullif(trim(place_of_birth), ''), 'Unknown'),
  document_type = coalesce(nullif(trim(document_type), ''), 'passport')
where
  country_of_birth is null
  or trim(country_of_birth) = ''
  or place_of_birth is null
  or trim(place_of_birth) = ''
  or document_type is null
  or trim(document_type) = '';

alter table guest_stay_tourism_guests
  alter column country_of_birth set not null,
  alter column place_of_birth set not null,
  alter column document_type set not null;

alter table guest_stay_tourism_guests
  drop constraint if exists guest_stay_tourism_guests_document_type_check;

alter table guest_stay_tourism_guests
  add constraint guest_stay_tourism_guests_document_type_check
  check (document_type in ('passport', 'id_card'));
