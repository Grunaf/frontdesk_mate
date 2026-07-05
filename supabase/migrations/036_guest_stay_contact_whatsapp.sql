-- Guest stay contact for reception (separate from legacy tourism_contact_whatsapp).

alter table guest_stays
  add column if not exists stay_contact_whatsapp text;
