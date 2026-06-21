'use client';

import { createContext } from 'react';
import type { TenantConfig } from '../model/tenant-config';

export const TenantContext = createContext<TenantConfig | null>(null);
