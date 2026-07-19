-- Entry stamp is a calendar date collected at reception (not a photo upload).
-- passport photo remains in storage; entry_stamp_storage_path stays unused ('').

alter table guest_stay_tourism_guests
  add column if not exists entry_stamp_date date;
