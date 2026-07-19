-- Guest tourism identity fields (citizenship, passport, DOB, gender).
-- Greenfield: NOT NULL without residual DEFAULT. Fails if existing rows lack values.

alter table guest_stay_tourism_guests
  add column if not exists citizenship text not null,
  add column if not exists passport_number text not null,
  add column if not exists date_of_birth date not null,
  add column if not exists gender text not null;

alter table guest_stay_tourism_guests
  drop constraint if exists guest_stay_tourism_guests_gender_check;

alter table guest_stay_tourism_guests
  add constraint guest_stay_tourism_guests_gender_check
  check (gender in ('male', 'female'));
