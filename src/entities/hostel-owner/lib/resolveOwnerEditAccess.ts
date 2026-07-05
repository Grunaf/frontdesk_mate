import type { TenantLifecycleStatus } from '@/entities/tenant/lib/resolveTenantLifecycle';

export type OwnerEditAccessReasonKey = 'expired' | 'archived';

export type OwnerEditAccess = {
  canEditSettings: boolean;
  reasonKey: OwnerEditAccessReasonKey | null;
};

export function resolveOwnerEditAccess(lifecycleStatus: TenantLifecycleStatus): OwnerEditAccess {
  switch (lifecycleStatus) {
    case 'active':
    case 'scheduled':
      return { canEditSettings: true, reasonKey: null };
    case 'expired':
      return { canEditSettings: false, reasonKey: 'expired' };
    case 'archived':
      return { canEditSettings: false, reasonKey: 'archived' };
    default: {
      const _exhaustive: never = lifecycleStatus;
      return _exhaustive;
    }
  }
}
