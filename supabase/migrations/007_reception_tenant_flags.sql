-- Tenant-specific reception behavior (hours, WhatsApp, taxi backup flags).
update tenants
set settings = jsonb_set(
  settings,
  '{reception}',
  coalesce(settings->'reception', '{}'::jsonb) || '{
    "open": "08:00",
    "close": "22:00",
    "whatsappEnabled": true,
    "canHelpWithTaxi": true
  }'::jsonb
),
updated_at = now()
where slug = 'default';

update tenants
set settings = jsonb_set(
  settings,
  '{reception}',
  '{
    "open": "08:00",
    "close": "22:00",
    "whatsappEnabled": true,
    "canHelpWithTaxi": true
  }'::jsonb
),
updated_at = now()
where slug = 'kotor-demo';
