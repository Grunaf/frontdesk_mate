-- Provenance for soft stay presence: guest self-report vs staff Cleaning → desk.
-- status remains vacant | still_here. Not checkout.

alter table public.housekeeping_stay_presence
  add column if not exists source text;

-- Historical rows were staff-only Cleaning signals.
update public.housekeeping_stay_presence
set source = 'staff'
where source is null;

alter table public.housekeeping_stay_presence
  alter column source set default 'staff';

alter table public.housekeeping_stay_presence
  alter column source set not null;

alter table public.housekeeping_stay_presence
  drop constraint if exists housekeeping_stay_presence_source_check;

alter table public.housekeeping_stay_presence
  add constraint housekeeping_stay_presence_source_check
  check (source in ('guest', 'staff'));

comment on column public.housekeeping_stay_presence.source is
  'Who set the presence signal: guest (self-report) or staff (Cleaning/desk).';
