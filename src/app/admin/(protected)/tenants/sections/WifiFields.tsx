import type { TenantSettings } from '@/entities/tenant';
import { isTenantFieldMissing, type TenantReadinessInput } from '@/entities/tenant/lib/resolveTenantReadiness';
import { AdminField } from '../ui/AdminField';

interface WifiFieldsProps {
  settings?: TenantSettings;
  readinessInput: TenantReadinessInput;
}

export function WifiFields({ settings, readinessInput }: WifiFieldsProps) {
  return (
    <div className="space-y-4">
      <AdminField
        label="WiFi name"
        name="wifiName"
        defaultValue={settings?.wifi?.name}
        missing={isTenantFieldMissing('wifiName', readinessInput)}
      />
      <AdminField
        label="WiFi password"
        name="wifiPassword"
        defaultValue={settings?.wifi?.password}
        missing={isTenantFieldMissing('wifiPassword', readinessInput)}
      />
    </div>
  );
}
