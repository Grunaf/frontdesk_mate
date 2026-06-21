-- Explicit booking provider per tenant (none | cloudbeds | frontdesk_master).
update tenants
set settings = (settings - 'bookingEngineId') || '{
  "booking": { "provider": "cloudbeds", "engineId": "SFTNHx" }
}'::jsonb,
updated_at = now()
where slug = 'default';

update tenants
set settings = (settings - 'bookingEngineId') || '{
  "booking": { "provider": "none" }
}'::jsonb,
updated_at = now()
where slug = 'kotor-demo';
