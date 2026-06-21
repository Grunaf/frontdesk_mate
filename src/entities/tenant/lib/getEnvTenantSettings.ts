import type { TenantSettings } from '../model/settings';

/** Dev-only empty fallback when Supabase is not configured. Use DB tenant settings in production. */
export function getEnvTenantSettings(): TenantSettings {
  return {};
}
