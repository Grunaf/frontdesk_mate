-- Room map bed positions live in guestStay.beds (no hardcoded layoutId / balkan-han).

update tenants
set settings = (settings - 'roomLayoutId') || '{
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
        "doorImage": "/images/vega/2_floor_door.jpg"
      }
    ],
    "beds": [
      { "id": "4A", "roomId": "vega", "x": 30, "y": 30, "isBunk": true, "topId": "4A-Top", "bottomId": "4A-Bot" },
      { "id": "4B", "roomId": "vega", "x": 30, "y": 110 },
      { "id": "4C", "roomId": "vega", "x": 170, "y": 30, "isBunk": true, "topId": "4C-Top", "bottomId": "4C-Bot" },
      { "id": "4D", "roomId": "vega", "x": 170, "y": 110 }
    ]
  }
}'::jsonb,
updated_at = now()
where slug = 'default';
