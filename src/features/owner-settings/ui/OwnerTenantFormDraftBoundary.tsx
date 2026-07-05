'use client';

import type { ReactNode } from 'react';
import { TenantFormDraftProvider } from '@/app/admin/(protected)/tenants/ui/TenantFormDraftContext';

export function OwnerTenantFormDraftBoundary({ children }: { children: ReactNode }) {
  return <TenantFormDraftProvider>{children}</TenantFormDraftProvider>;
}
