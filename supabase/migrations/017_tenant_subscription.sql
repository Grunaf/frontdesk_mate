-- Subscription window + archival for multi-tenant SaaS lifecycle.

alter table tenants
  add column if not exists subscription_starts_at timestamptz,
  add column if not exists subscription_ends_at timestamptz,
  add column if not exists archived_at timestamptz;

update tenants
set
  subscription_starts_at = coalesce(subscription_starts_at, created_at, now()),
  subscription_ends_at = coalesce(subscription_ends_at, now() + interval '1 year')
where subscription_starts_at is null
   or subscription_ends_at is null;

alter table tenants
  alter column subscription_starts_at set default now(),
  alter column subscription_ends_at set default (now() + interval '1 year');
