-- Canonical Balkan Han settings for the default tenant (no env merge at runtime).
update tenants
set
  name = 'Balkan Han',
  settings = settings || '{
    "checkInTime": "14:00",
    "checkOutTime": "10:00",
    "cityTax": "10.00",
    "selfCheckInTimeAfter": "23:00",
    "laundryCost": "10€",
    "heroBgUrl": "images/room.jpg",
    "logoUrl": "/logo-text-horizontal-app.svg",
    "recommendationMap": "1zC2A9Gnf3Iv9bGEhR7R2ZNxSJKTmoCw",
    "reception": { "open": "08:00", "close": "08:00" },
    "wifi": { "name": "Balkan Han", "password": "askunkas" },
    "doors": { "mainDoor": "B9912#", "subDoor": "1234*" },
    "contacts": {
      "phoneRaw": "38761538331",
      "phoneMask": "+387 61 538 331",
      "taxiPhoneRaw": "38761663555",
      "taxiPhoneMask": "+387 61 663 555",
      "email": "balkanhan@gmail.com",
      "address": "Dalmatinska 6, Sarajevo 71000, Bosnia & Herzegovina",
      "mapsUrl": "https://share.google/R9EG3Z8KNWPPsLFG8",
      "instagram": "https://instagram.com/balkan_han",
      "facebook": "https://facebook.com/balkanhanhostel",
      "feedbackPhoneRaw": "38761538331"
    },
    "brand": { "primary": "#FF6B00" }
  }'::jsonb,
  updated_at = now()
where slug = 'default';

-- Ensure kotor-demo contacts are reception-only; taxi comes from city pack (Red Taxi).
update tenants
set settings = jsonb_set(
  settings,
  '{contacts}',
  '{
    "phoneRaw": "38267890123",
    "phoneMask": "+382 67 890 123",
    "email": "demo@kotor-hostel.example",
    "address": "Stari Grad, Kotor 85330, Montenegro",
    "mapsUrl": "https://maps.google.com/?q=Kotor+Old+Town+Montenegro"
  }'::jsonb
),
updated_at = now()
where slug = 'kotor-demo';
