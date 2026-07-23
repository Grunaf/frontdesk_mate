-- Bed housekeeping pipeline: needs_strip → stripped → ready.
-- Legacy: no_linen → needs_strip, waiting_linen → stripped.

alter table public.housekeeping_bed_statuses
  drop constraint if exists housekeeping_bed_statuses_status_check;

update public.housekeeping_bed_statuses
set status = case status
  when 'no_linen' then 'needs_strip'
  when 'waiting_linen' then 'stripped'
  else status
end
where status in ('no_linen', 'waiting_linen');

alter table public.housekeeping_bed_statuses
  add constraint housekeeping_bed_statuses_status_check
  check (status in ('needs_strip', 'stripped', 'ready'));
