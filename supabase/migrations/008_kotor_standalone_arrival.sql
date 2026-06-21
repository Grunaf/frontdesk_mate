-- Kotor demo: standalone house (one door), walk-in during the day — no building main door.
update tenants
set settings = settings
  || '{"arrivalAccess": {"dayMode": "walk_in"}}'::jsonb
  || jsonb_build_object(
    'doors',
    jsonb_strip_nulls(
      jsonb_build_object('subDoor', settings #>> '{doors,subDoor}')
    )
  ),
  updated_at = now()
where slug = 'kotor-demo';
