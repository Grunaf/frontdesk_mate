-- Migrate tenant settings.activeRulesKeys → houseRules (structured templates).

update tenants
set
  settings = (settings - 'activeRulesKeys') || jsonb_build_object(
    'houseRules',
    coalesce(
      (
        select jsonb_agg(rule_obj order by ord)
        from (
          select
            ord,
            case key_val
              when 'quietHours' then jsonb_build_object(
                'id', 'quiet-hours',
                'templateId', 'quietHours',
                'enabled', true,
                'params', jsonb_build_object('from', '22:00', 'to', '08:00')
              )
              when 'alcohol' then jsonb_build_object(
                'id', 'alcohol',
                'templateId', 'alcohol',
                'enabled', true
              )
              when 'smoking' then jsonb_build_object(
                'id', 'smoking',
                'templateId', 'smoking',
                'enabled', true
              )
              when 'registration' then jsonb_build_object(
                'id', 'registration',
                'templateId', 'registration',
                'enabled', true
              )
              when 'laundry' then jsonb_build_object(
                'id', 'laundry',
                'templateId', 'laundry',
                'enabled', true
              )
              else null
            end as rule_obj
          from jsonb_array_elements_text(settings->'activeRulesKeys') with ordinality as t(key_val, ord)
        ) mapped
        where rule_obj is not null
      ),
      '[]'::jsonb
    )
  ),
  updated_at = now()
where settings ? 'activeRulesKeys'
  and not (settings ? 'houseRules');
