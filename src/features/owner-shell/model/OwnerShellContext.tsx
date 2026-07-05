'use client';

import type { TenantLifecycleStatus } from '@/entities/tenant/lib/resolveTenantLifecycle';
import { createContext, useContext } from 'react';

export type OwnerShellContextValue = {
  canEditSettings: boolean;
  lifecycleStatus: TenantLifecycleStatus;
};

const OwnerShellContext = createContext<OwnerShellContextValue | null>(null);

interface OwnerShellProviderProps {
  value: OwnerShellContextValue;
  children: React.ReactNode;
}

export function OwnerShellProvider({ value, children }: OwnerShellProviderProps) {
  return <OwnerShellContext.Provider value={value}>{children}</OwnerShellContext.Provider>;
}

export function useOwnerShell(): OwnerShellContextValue {
  const value = useContext(OwnerShellContext);
  if (!value) {
    throw new Error('useOwnerShell must be used within OwnerShellProvider');
  }
  return value;
}
