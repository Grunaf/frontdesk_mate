-- Normalize legacy tenant settings: accessPoints-only arrival, bedType-only beds.

-- 1. Copy doorImages.landmark → arrivalAccess.landmark when missing.
update tenants
set
  settings = jsonb_set(
    settings,
    '{arrivalAccess}',
    coalesce(settings->'arrivalAccess', '{}'::jsonb)
      || jsonb_build_object('landmark', nullif(trim(settings #>> '{doorImages,landmark}'), '')),
    true
  ),
  updated_at = now()
where coalesce(trim(settings #>> '{doorImages,landmark}'), '') <> ''
  and coalesce(trim(settings #>> '{arrivalAccess,landmark}'), '') = '';

-- 2. Backfill arrivalAccess.accessPoints from legacy doors/doorImages when empty.
do $$
declare
  tenant_row record;
  preset text;
  day_mode text;
  main_image text;
  sub_image text;
  main_code text;
  sub_code text;
  ignore_main boolean;
  points jsonb := '[]'::jsonb;
  zone_id text;
  zone_label text;
  guide_key text;
  arrival_access jsonb;
begin
  for tenant_row in
    select id, settings
    from tenants
    where coalesce(jsonb_array_length(settings->'arrivalAccess'->'accessPoints'), 0) = 0
      and (
        settings ? 'doors'
        or settings ? 'doorImages'
      )
  loop
    preset := nullif(trim(tenant_row.settings #>> '{arrivalAccess,preset}'), '');
    day_mode := nullif(trim(tenant_row.settings #>> '{arrivalAccess,dayMode}'), '');
    main_image := nullif(trim(tenant_row.settings #>> '{doorImages,main}'), '');
    sub_image := nullif(trim(tenant_row.settings #>> '{doorImages,sub}'), '');
    main_code := nullif(trim(tenant_row.settings #>> '{doors,mainDoor}'), '');
    sub_code := nullif(trim(tenant_row.settings #>> '{doors,subDoor}'), '');
    points := '[]'::jsonb;

    ignore_main := preset = 'standalone' or (day_mode = 'walk_in' and main_image is null);

    if not ignore_main and (main_image is not null or main_code is not null) then
      points := points || jsonb_build_array(
        jsonb_strip_nulls(jsonb_build_object(
          'id', 'building_entrance',
          'kind', 'outside',
          'label', 'Building entrance',
          'image', main_image,
          'code', main_code,
          'sortOrder', 0
        ))
      );
    end if;

    if sub_image is not null or sub_code is not null then
      if preset = 'in_building' then
        zone_id := 'hostel_door';
        zone_label := 'Hostel door';
        guide_key := 'subDoor.guide';
      else
        zone_id := 'floor_1';
        zone_label := 'Floor 1';
        guide_key := 'subDoor.guideDirect';
      end if;

      points := points || jsonb_build_array(
        jsonb_strip_nulls(jsonb_build_object(
          'id', zone_id,
          'kind', 'zone',
          'label', zone_label,
          'image', sub_image,
          'code', sub_code,
          'guideKey', guide_key,
          'sortOrder', 1
        ))
      );
    end if;

    if preset = 'single_entrance'
      and (main_image is not null or main_code is not null)
      and jsonb_array_length(points) = 0
    then
      points := points || jsonb_build_array(
        jsonb_strip_nulls(jsonb_build_object(
          'id', 'building_entrance',
          'kind', 'outside',
          'label', 'Building entrance',
          'image', main_image,
          'code', main_code,
          'sortOrder', 0
        ))
      );
    end if;

    if jsonb_array_length(points) = 0 then
      continue;
    end if;

    arrival_access := coalesce(tenant_row.settings->'arrivalAccess', '{}'::jsonb)
      || jsonb_build_object('accessPoints', points);

    if preset = 'standalone' and not (arrival_access ? 'layoutKind') then
      arrival_access := arrival_access || '{"layoutKind": "direct_to_floor"}'::jsonb;
    end if;

    update tenants
    set
      settings = jsonb_set(tenant_row.settings, '{arrivalAccess}', arrival_access, true),
      updated_at = now()
    where id = tenant_row.id;
  end loop;
end $$;

-- 3. guestStay.beds: isBunk → bedType, then drop isBunk.
do $$
declare
  tenant_row record;
  beds jsonb;
  bed jsonb;
  normalized_beds jsonb;
  bed_type text;
  idx int;
begin
  for tenant_row in
    select id, settings
    from tenants
    where settings->'guestStay'->'beds' is not null
      and jsonb_typeof(settings->'guestStay'->'beds') = 'array'
      and jsonb_array_length(settings->'guestStay'->'beds') > 0
  loop
    beds := tenant_row.settings->'guestStay'->'beds';
    normalized_beds := '[]'::jsonb;

    for idx in 0 .. jsonb_array_length(beds) - 1 loop
      bed := beds->idx;
      bed_type := nullif(trim(bed->>'bedType'), '');

      if bed_type is null and coalesce((bed->>'isBunk')::boolean, false) then
        bed_type := 'bunk';
      end if;

      bed := bed - 'isBunk';

      if bed_type is not null then
        bed := bed || jsonb_build_object('bedType', bed_type);
      end if;

      normalized_beds := normalized_beds || jsonb_build_array(bed);
    end loop;

    update tenants
    set
      settings = jsonb_set(
        tenant_row.settings,
        '{guestStay,beds}',
        normalized_beds,
        true
      ),
      updated_at = now()
    where id = tenant_row.id;
  end loop;
end $$;

-- 4. Strip legacy top-level keys and arrivalAccess.preset.
update tenants
set
  settings = (
    settings
    - 'doors'
    - 'doorImages'
    - 'bookingEngineId'
    - 'roomLayoutId'
  )
  || case
    when settings->'arrivalAccess' ? 'preset' then
      jsonb_build_object(
        'arrivalAccess',
        (settings->'arrivalAccess') - 'preset'
      )
    else '{}'::jsonb
  end,
  updated_at = now()
where settings ?| array['doors', 'doorImages', 'bookingEngineId', 'roomLayoutId']
  or (settings->'arrivalAccess' ? 'preset');
