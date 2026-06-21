-- Normalize city_packs.content.places to v3 (isTopPick / needNow, no legacy keys).

create or replace function fdm_migrate_city_pack_place_v3(place jsonb)
returns jsonb
language plpgsql
immutable
as $$
declare
  result jsonb;
  is_top_pick boolean;
  need_now boolean;
begin
  if place is null then
    return null;
  end if;

  is_top_pick := case
    when place ? 'isTopPick' then (place->>'isTopPick')::boolean
    when place->>'tag' = 'TOP PICK' then true
    else false
  end;

  need_now := case
    when place ? 'needNow' then (place->>'needNow')::boolean
    when place ? 'isSurvival' and (place->'isSurvival')::boolean is true then true
    when place->>'tag' = 'LATE NIGHT BITES' then true
    else false
  end;

  result := place;
  result := result - 'tag';
  result := result - 'isSurvival';
  result := result - 'recommendedBy';
  result := result - 'photoUrl';
  result := result - 'priority';
  result := result - 'subCategory';

  result := jsonb_set(result, '{isTopPick}', to_jsonb(is_top_pick), true);
  result := jsonb_set(result, '{needNow}', to_jsonb(need_now), true);

  return result;
end;
$$;

update city_packs
set
  content = case
    when content ? 'places' and jsonb_typeof(content->'places') = 'array' then
      jsonb_set(
        content,
        '{places}',
        coalesce(
          (
            select jsonb_agg(fdm_migrate_city_pack_place_v3(elem))
            from jsonb_array_elements(content->'places') as elem
          ),
          '[]'::jsonb
        ),
        true
      )
    else content
  end,
  updated_at = now()
where content ? 'places';

drop function if exists fdm_migrate_city_pack_place_v3(jsonb);
