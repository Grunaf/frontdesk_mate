-- Kotor demo: explicit standalone arrival layout preset.
update tenants
set settings = jsonb_set(
  settings,
  '{arrivalAccess,preset}',
  '"standalone"'::jsonb,
  true
),
updated_at = now()
where slug = 'kotor-demo';
