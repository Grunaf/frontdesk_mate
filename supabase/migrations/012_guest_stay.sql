-- Guest stay: rooms, beds, floor path hints for "find your bed" module.

update tenants
set settings = settings || '{
  "guestStay": {
    "floors": [
      {
        "id": "2",
        "label": "Floor 2",
        "pathHint": "After the floor door, dorm doors are along the left corridor. Kitchen and laundry are on Floor 1."
      }
    ],
    "rooms": [
      {
        "id": "vega",
        "label": "Vega",
        "floorId": "2",
        "doorImage": "/images/vega/2_floor_door.jpg",
        "layoutId": "balkan-han"
      }
    ],
    "beds": [
      { "id": "4A-Bot", "roomId": "vega" },
      { "id": "4A-Top", "roomId": "vega" },
      { "id": "4B", "roomId": "vega" },
      { "id": "4C-Bot", "roomId": "vega" },
      { "id": "4C-Top", "roomId": "vega" },
      { "id": "4D", "roomId": "vega" }
    ]
  }
}'::jsonb,
updated_at = now()
where slug = 'default';
