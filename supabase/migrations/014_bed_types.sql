-- Tag default tenant beds with explicit bedType for the visual editor.

update tenants
set settings = jsonb_set(
  settings,
  '{guestStay,beds}',
  '[
    { "id": "4A", "roomId": "vega", "x": 30, "y": 30, "bedType": "bunk", "isBunk": true, "topId": "4A-Top", "bottomId": "4A-Bot" },
    { "id": "4B", "roomId": "vega", "x": 30, "y": 110, "bedType": "single" },
    { "id": "4C", "roomId": "vega", "x": 170, "y": 30, "bedType": "bunk", "isBunk": true, "topId": "4C-Top", "bottomId": "4C-Bot" },
    { "id": "4D", "roomId": "vega", "x": 170, "y": 110, "bedType": "single" }
  ]'::jsonb,
  true
),
updated_at = now()
where slug = 'default';
