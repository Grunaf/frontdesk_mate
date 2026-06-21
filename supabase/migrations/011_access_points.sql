-- Access points model: building entrance + floor zones (Balkan Han) and direct-to-floor (Kotor).

update tenants
set settings = jsonb_set(
  settings,
  '{arrivalAccess}',
  coalesce(settings->'arrivalAccess', '{}'::jsonb) || '{
    "layoutKind": "building_then_zones",
    "dayMode": "doorbell",
    "landmark": "/images/entrance.jpg",
    "bedFloorMap": { "4B": "2" },
    "accessPoints": [
      {
        "id": "building_entrance",
        "kind": "outside",
        "label": "Building entrance",
        "image": "/images/entrance.jpg",
        "code": "B9912#",
        "sortOrder": 0
      },
      {
        "id": "floor_1",
        "kind": "zone",
        "label": "Floor 1 — kitchen & dorms",
        "image": "/images/basement_entrance.jpg",
        "code": "1234*",
        "forFloors": ["1"],
        "alsoForFloors": ["2"],
        "guideKey": "subDoor.guide",
        "sortOrder": 1
      },
      {
        "id": "floor_2",
        "kind": "zone",
        "label": "Floor 2 — dorms & common",
        "forFloors": ["2"],
        "alsoForFloors": ["1"],
        "sortOrder": 2
      }
    ]
  }'::jsonb,
  true
),
updated_at = now()
where slug = 'default';

update tenants
set settings = jsonb_set(
  settings,
  '{arrivalAccess}',
  '{
    "layoutKind": "direct_to_floor",
    "dayMode": "walk_in",
    "landmark": "/images/kotor/facade.jpg",
    "accessPoints": [
      {
        "id": "floor_1",
        "kind": "zone",
        "label": "Floor 1",
        "forFloors": ["1"],
        "sortOrder": 0
      },
      {
        "id": "floor_2",
        "kind": "zone",
        "label": "Floor 2",
        "forFloors": ["2"],
        "sortOrder": 1
      },
      {
        "id": "floor_3",
        "kind": "zone",
        "label": "Floor 3",
        "forFloors": ["3"],
        "sortOrder": 2
      }
    ]
  }'::jsonb,
  true
),
updated_at = now()
where slug = 'kotor-demo';
