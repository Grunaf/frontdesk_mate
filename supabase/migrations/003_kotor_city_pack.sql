-- Add Kotor city pack and demo tenant for Montenegro development.
insert into city_packs (id, name)
values ('kotor', 'Kotor Bay')
on conflict (id) do nothing;

insert into tenants (slug, name, city_pack_id, settings)
values (
  'kotor-demo',
  'Kotor Bay Demo',
  'kotor',
  '{
    "checkInTime": "14:00",
    "checkOutTime": "10:00",
    "cityTax": "1.00",
    "selfCheckInTimeAfter": "23:00",
    "wifi": { "name": "Kotor Demo", "password": "demo2024" },
    "doors": { "mainDoor": "0000#", "subDoor": "1234*" },
    "contacts": {
      "phoneRaw": "38267890123",
      "phoneMask": "+382 67 890 123",
      "address": "Stari Grad, Kotor 85330, Montenegro",
      "mapsUrl": "https://maps.google.com/?q=Kotor+Old+Town+Montenegro",
      "email": "demo@kotor-hostel.example"
    },
    "arrivalWalkToHostel": "From Kotor bus station, enter the old town through the Sea Gate and continue to our address."
  }'::jsonb
)
on conflict (slug) do update set
  name = excluded.name,
  city_pack_id = excluded.city_pack_id,
  settings = excluded.settings,
  updated_at = now();

-- Rename default tenant for clarity (optional label only).
update tenants
set name = 'Sarajevo Oasis (demo)'
where slug = 'default';
