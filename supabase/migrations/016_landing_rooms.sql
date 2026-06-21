-- Per-tenant landing room types (replaces hardcoded ROOMS_DATA for default tenant).

update tenants
set settings = jsonb_set(
  settings,
  '{landing}',
  '{
    "roomsSectionTitle": "Choose your stay",
    "roomsSectionSubtitle": "Select between social single bed dorms or comfortable private rooms",
    "roomTypes": [
      {
        "id": "single-bed-dorm",
        "engineRoomTypeId": "DORM8",
        "title": "Single Bed in Shared Dorm",
        "description": "Perfect for solo travelers and backpackers. Features comfortable mattresses, personal lockers, and individual power sockets next to your bed.",
        "priceFromEur": 15,
        "imageUrl": "/images/rooms/single-dorm.jpg",
        "requiresChatUpgrade": true
      },
      {
        "id": "private-room",
        "engineRoomTypeId": "DBL_PRIV",
        "title": "Private Room",
        "description": "Ideal for couples or digital nomads seeking privacy. Includes a spacious queen-size bed, private bathroom, and air conditioning.",
        "priceFromEur": 45,
        "imageUrl": "/images/rooms/double-private.jpg",
        "requiresChatUpgrade": false
      }
    ]
  }'::jsonb,
  true
),
updated_at = now()
where slug = 'default';
