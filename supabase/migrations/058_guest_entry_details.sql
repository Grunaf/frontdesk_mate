-- Entry details for tourism settlement: transport + entry point (stay),
-- stamp page (per guest), and step status (complete | skipped).

alter table guest_reservations
  add column if not exists entry_transport_type text,
  add column if not exists entry_point_code text,
  add column if not exists entry_point_label text,
  add column if not exists entry_details_status text;

comment on column guest_reservations.entry_transport_type is
  'plane | bus | car | train | other';
comment on column guest_reservations.entry_point_code is
  'Airport IATA (or catalog code) when transport is plane';
comment on column guest_reservations.entry_point_label is
  'Display / free-text entry point name';
comment on column guest_reservations.entry_details_status is
  'incomplete | complete | skipped';

alter table guest_stay_tourism_guests
  add column if not exists entry_stamp_page integer;

comment on column guest_stay_tourism_guests.entry_stamp_page is
  'Passport page number of the entry stamp (optional, for reception)';

-- Legacy stays that already collected entry dates → complete.
update guest_reservations gr
set entry_details_status = 'complete'
where entry_details_status is null
  and exists (
    select 1 from guest_stay_tourism_guests g where g.stay_id = gr.id
  )
  and not exists (
    select 1
    from guest_stay_tourism_guests g
    where g.stay_id = gr.id
      and g.entry_stamp_date is null
  );
