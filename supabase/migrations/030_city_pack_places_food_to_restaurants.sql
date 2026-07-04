-- Rename city pack place category food → restaurants (distinct from cafes).

update city_packs
set
  content = jsonb_set(
    content,
    '{places}',
    (
      select coalesce(
        jsonb_agg(
          case
            when place->>'category' = 'food'
              then jsonb_set(place, '{category}', '"restaurants"')
            else place
          end
        ),
        '[]'::jsonb
      )
      from jsonb_array_elements(coalesce(content->'places', '[]'::jsonb)) as place
    )
  ),
  updated_at = now()
where content ? 'places'
  and exists (
    select 1
    from jsonb_array_elements(coalesce(content->'places', '[]'::jsonb)) as place
    where place->>'category' = 'food'
  );
