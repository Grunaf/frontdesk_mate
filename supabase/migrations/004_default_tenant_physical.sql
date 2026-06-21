-- Enable modular capabilities for the default Sarajevo tenant.
update tenants
set settings = settings || '{
  "roomLayoutId": "balkan-han",
  "highlightedBedId": "4B",
  "doorImages": {
    "main": "/images/entrance.jpg",
    "sub": "/images/basement_entrance.jpg"
  },
  "activeRulesKeys": ["quietHours", "alcohol"]
}'::jsonb,
updated_at = now()
where slug = 'default';
