-- Strip redundant "Floor " / "Room " prefixes from guestStay labels.
-- Guest app adds localized prefixes via i18n; stored values should be short (e.g. "2", "Vega").

update tenants
set
  settings = jsonb_set(
    settings,
    '{guestStay,floors}',
    coalesce(
      (
        select jsonb_agg(
          case
            when coalesce(floor_elem->>'label', '') ~* '^Floor\s+'
              then jsonb_set(
                floor_elem,
                '{label}',
                to_jsonb(regexp_replace(floor_elem->>'label', '^Floor\s+', '', 'i'))
              )
            else floor_elem
          end
        )
        from jsonb_array_elements(coalesce(settings->'guestStay'->'floors', '[]'::jsonb)) as floor_elem
      ),
      '[]'::jsonb
    ),
    true
  ),
  updated_at = now()
where jsonb_typeof(settings->'guestStay'->'floors') = 'array'
  and jsonb_array_length(settings->'guestStay'->'floors') > 0;

update tenants
set
  settings = jsonb_set(
    settings,
    '{guestStay,rooms}',
    coalesce(
      (
        select jsonb_agg(
          case
            when coalesce(room_elem->>'label', '') ~* '^Room\s+'
              then jsonb_set(
                room_elem,
                '{label}',
                to_jsonb(regexp_replace(room_elem->>'label', '^Room\s+', '', 'i'))
              )
            else room_elem
          end
        )
        from jsonb_array_elements(coalesce(settings->'guestStay'->'rooms', '[]'::jsonb)) as room_elem
      ),
      '[]'::jsonb
    ),
    true
  ),
  updated_at = now()
where jsonb_typeof(settings->'guestStay'->'rooms') = 'array'
  and jsonb_array_length(settings->'guestStay'->'rooms') > 0;

-- Demo default tenant: Floor 2 → 2
update tenants
set
  settings = jsonb_set(
    settings,
    '{guestStay,floors}',
    (
      select jsonb_agg(
        case
          when floor_elem->>'id' = '2' and floor_elem->>'label' = 'Floor 2'
            then jsonb_set(floor_elem, '{label}', '"2"'::jsonb)
          else floor_elem
        end
      )
      from jsonb_array_elements(settings->'guestStay'->'floors') as floor_elem
    ),
    true
  ),
  updated_at = now()
where slug = 'default'
  and jsonb_typeof(settings->'guestStay'->'floors') = 'array';
