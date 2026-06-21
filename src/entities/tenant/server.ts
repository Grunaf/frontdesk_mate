import 'server-only';

export {
  getTenantConfig,
  getTenantGuestShell,
  getTenantRecord,
  listPublicTenants,
  listTenants,
  resolveTenantAccess,
  resolveTenantSlug,
  setTenantArchived,
  upsertTenant,
} from './api/getTenantConfig';
export type { TenantAccessResult, TenantConfig, TenantGuestShell } from './api/getTenantConfig';
