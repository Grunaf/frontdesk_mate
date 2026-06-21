'use client';

import { useTenant } from './TenantProvider';

export function useModuleStatus(module: import('../model/capabilities').AppModule) {
  const { capabilities } = useTenant();
  return capabilities[module];
}

export function useCapabilities() {
  const { capabilities } = useTenant();
  return capabilities;
}
