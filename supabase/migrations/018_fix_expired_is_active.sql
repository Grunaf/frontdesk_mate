-- Expired tenants were incorrectly marked is_active=false on save.
-- is_active now reflects explicit archive only (archived_at set).
update tenants
set is_active = true
where archived_at is null
  and is_active = false;
