'use client';

import { useContext } from 'react';
import type { HostelConfig } from '../model/hostel-config';
import { TenantContext } from './tenant-context';

export function useHostelConfig(): HostelConfig {
  const tenant = useContext(TenantContext);
  if (!tenant) {
    throw new Error('useHostelConfig must be used within TenantProvider');
  }

  return tenant.hostel;
}
