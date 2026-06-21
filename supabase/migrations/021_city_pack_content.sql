-- City pack content: admin-managed places, routes, and publish status.
-- Place shape v3 (isTopPick, needNow): legacy tag/isSurvival/etc. normalized in 022_city_pack_places_v3.sql.

alter table city_packs
  add column if not exists label text,
  add column if not exists status text not null default 'draft',
  add column if not exists content jsonb not null default '{}'::jsonb,
  add column if not exists updated_at timestamptz not null default now();

update city_packs
set label = coalesce(label, name)
where label is null;

alter table city_packs
  drop constraint if exists city_packs_status_check;

alter table city_packs
  add constraint city_packs_status_check check (status in ('draft', 'ready'));

-- Sarajevo: ready with seeded places (routes stay in code).
update city_packs
set
  label = 'Sarajevo (Bosnia)',
  status = 'ready',
  content = jsonb_build_object(
    'places', jsonb_build_array(
      jsonb_build_object('id', 'atm-dalmatinska', 'name', 'ATM UniCredit / Raiffeisen', 'category', 'essential', 'googleMapsUrl', 'https://maps.google.com/?q=UniCredit+Bank+Dalmatinska+Sarajevo', 'isTopPick', false, 'needNow', true),
      jsonb_build_object('id', 'konzum-dalmatinska', 'name', 'Konzum (Dalmatinska)', 'category', 'essential', 'googleMapsUrl', 'https://maps.google.com/?q=Konzum+Dalmatinska+Sarajevo', 'isTopPick', false, 'needNow', true),
      jsonb_build_object('id', 'apoteka-titova', 'name', 'Apoteka – Titova Street', 'category', 'essential', 'googleMapsUrl', 'https://maps.google.com/?q=Apoteka+Titova+Sarajevo', 'isTopPick', false, 'needNow', true),
      jsonb_build_object('id', 'u2-pizza', 'name', 'U2 Pizza', 'category', 'food', 'googleMapsUrl', 'https://maps.google.com/?q=U2+Pizza+Sarajevo', 'isTopPick', false, 'needNow', true),
      jsonb_build_object('id', 'zeljo-cevapi', 'name', 'Željo', 'category', 'food', 'googleMapsUrl', 'https://maps.google.com/?q=Cevabdzinica+Zeljo+Sarajevo', 'isTopPick', true, 'needNow', false),
      jsonb_build_object('id', 'pizzerija-mahir', 'name', 'Pizzerija Mahir', 'category', 'food', 'googleMapsUrl', 'https://maps.google.com/?q=Pizzerija+Mahir+Sarajevo', 'isTopPick', true, 'needNow', false),
      jsonb_build_object('id', 'bakehouse-edin', 'name', 'Bakehouse Edin', 'category', 'food', 'googleMapsUrl', 'https://maps.google.com/?q=Pekara+Edin+Sarajevo', 'isTopPick', true, 'needNow', false),
      jsonb_build_object('id', 'pub-vucko', 'name', 'Gastro Pub Vučko', 'category', 'bars', 'googleMapsUrl', 'https://maps.google.com/?q=Gastro+Pub+Vucko+Sarajevo', 'isTopPick', true, 'needNow', false),
      jsonb_build_object('id', 'zlatna-ribica', 'name', 'Zlatna ribica', 'category', 'bars', 'googleMapsUrl', 'https://maps.google.com/?q=Zlatna+ribica+Sarajevo', 'isTopPick', true, 'needNow', false),
      jsonb_build_object('id', 'kino-bosna', 'name', 'Kino Bosna', 'category', 'bars', 'googleMapsUrl', 'https://maps.google.com/?q=Kino+Bosna+Sarajevo', 'isTopPick', true, 'needNow', false),
      jsonb_build_object('id', 'fabrika-coffee', 'name', 'Fabrika Coffee', 'category', 'cafes', 'googleMapsUrl', 'https://maps.google.com/?q=Fabrika+Coffee+Sarajevo', 'isTopPick', true, 'needNow', false),
      jsonb_build_object('id', 'yellow-fortress', 'name', 'Yellow Fortress (Žuta Tabija)', 'category', 'sights', 'googleMapsUrl', 'https://maps.google.com/?q=Zuta+Tabija+Sarajevo', 'isTopPick', true, 'needNow', false)
    ),
    'enabledRoutes', jsonb_build_array('airport', 'bus_central', 'train_station'),
    'recommendedTaxi', jsonb_build_object('name', 'Zuti Taxi')
  ),
  updated_at = now()
where id = 'sarajevo';

-- Kotor: draft, empty places — finish in admin wizard.
update city_packs
set
  label = 'Kotor Bay (Montenegro)',
  status = 'draft',
  content = jsonb_build_object(
    'places', jsonb_build_array(),
    'enabledRoutes', jsonb_build_array('airport', 'bus_central'),
    'recommendedTaxi', jsonb_build_object('name', 'Red Taxi', 'phoneRaw', '38267019719', 'phoneMask', '+382 67 019 719')
  ),
  updated_at = now()
where id = 'kotor';
