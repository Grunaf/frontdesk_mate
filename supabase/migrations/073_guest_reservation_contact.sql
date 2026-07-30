-- Stay contact: confirmed phone + guest-proposed pending + reception email.
-- Replaces stay_contact_whatsapp (no dual-read / alias).

alter table public.guest_reservations
  add column if not exists contact_phone text,
  add column if not exists contact_phone_pending text,
  add column if not exists contact_email text;

comment on column public.guest_reservations.contact_phone is
  'Confirmed guest phone (E.164). Set at reception issue or after desk confirms a pending change.';

comment on column public.guest_reservations.contact_phone_pending is
  'Guest-proposed phone awaiting reception confirm; overwritten on each guest edit until confirmed.';

comment on column public.guest_reservations.contact_email is
  'Guest email set at reception only; not editable by guest.';

-- Backfill confirmed phone from legacy stay contact.
update public.guest_reservations
set contact_phone = stay_contact_whatsapp
where contact_phone is null
  and stay_contact_whatsapp is not null
  and length(trim(stay_contact_whatsapp)) > 0;

alter table public.guest_reservations
  drop column if exists stay_contact_whatsapp;
