-- Tivat (Montenegro) city pack — places + transport in DB (routes applied via city-pack:migrate-routes).

insert into city_packs (id, name)
values ('tivat', 'Tivat')
on conflict (id) do nothing;

update city_packs
set
  label = 'Tivat (Montenegro)',
  status = 'ready',
  content = jsonb_build_object(
    'places', jsonb_build_array(
      jsonb_build_object('id', 'atm-porto', 'name', 'ATM (Porto Montenegro / city centre)', 'category', 'essential', 'googleMapsUrl', 'https://maps.google.com/?q=ATM+Porto+Montenegro+Tivat', 'isTopPick', false, 'needNow', true),
      jsonb_build_object('id', 'pharmacy-bona', 'name', 'Pharmacy Bona', 'category', 'essential', 'googleMapsUrl', 'https://maps.google.com/?q=Apoteka+Bona+Tivat', 'isTopPick', false, 'needNow', true),
      jsonb_build_object('id', 'voli-centar', 'name', 'Voli supermarket (city centre)', 'category', 'essential', 'googleMapsUrl', 'https://maps.google.com/?q=Voli+Tivat+Montenegro', 'isTopPick', false, 'needNow', true),
      jsonb_build_object('id', 'pekara-gradska', 'name', 'Pekara Gradska (bakery)', 'category', 'food', 'googleMapsUrl', 'https://maps.google.com/?q=Pekara+Gradska+Tivat', 'isTopPick', false, 'needNow', true),
      jsonb_build_object('id', 'konoba-bonaca', 'name', 'Konoba Bonaća', 'category', 'food', 'googleMapsUrl', 'https://maps.google.com/?q=Konoba+Bonaca+Tivat', 'isTopPick', true, 'needNow', false),
      jsonb_build_object('id', 'restaurant-astoria', 'name', 'Astoria Restaurant', 'category', 'food', 'googleMapsUrl', 'https://maps.google.com/?q=Astoria+Restaurant+Tivat', 'isTopPick', true, 'needNow', false),
      jsonb_build_object('id', 'caffe-astoria', 'name', 'Caffe Astoria', 'category', 'cafes', 'googleMapsUrl', 'https://maps.google.com/?q=Caffe+Astoria+Tivat', 'isTopPick', true, 'needNow', false),
      jsonb_build_object('id', 'plavi-horizonti', 'name', 'Plavi Horizonti beach bar', 'category', 'bars', 'googleMapsUrl', 'https://maps.google.com/?q=Plavi+Horizonti+Tivat', 'isTopPick', true, 'needNow', false),
      jsonb_build_object('id', 'porto-montenegro', 'name', 'Porto Montenegro marina', 'category', 'sights', 'googleMapsUrl', 'https://maps.google.com/?q=Porto+Montenegro+Tivat', 'isTopPick', true, 'needNow', false),
      jsonb_build_object('id', 'naval-heritage', 'name', 'Naval Heritage Collection', 'category', 'sights', 'googleMapsUrl', 'https://maps.google.com/?q=Naval+Heritage+Collection+Tivat', 'isTopPick', true, 'needNow', false),
      jsonb_build_object('id', 'old-town-tivat', 'name', 'Tivat old town & waterfront', 'category', 'sights', 'googleMapsUrl', 'https://maps.google.com/?q=Tivat+old+town+Montenegro', 'isTopPick', true, 'needNow', false)
    ),
    'enabledRoutes', jsonb_build_array('airport', 'bus_central'),
    'recommendedTaxi', jsonb_build_object(
      'name', 'Red Taxi',
      'phoneRaw', '38267019719',
      'phoneMask', '+382 67 019 719'
    )
  ),
  updated_at = now()
where id = 'tivat';
