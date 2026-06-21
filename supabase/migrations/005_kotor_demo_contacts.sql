-- Demo tenant: readable reception mask + hostel-specific final walk leg.
update tenants
set settings = jsonb_set(
  jsonb_set(
    settings,
    '{contacts,phoneMask}',
    '"+382 67 890 123"'
  ),
  '{arrivalWalkToHostel}',
  '"From Kotor bus station, enter the old town through the Sea Gate and continue to our address."'
),
updated_at = now()
where slug = 'kotor-demo';
