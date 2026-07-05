'use client';

import type { TenantSettings } from '@/entities/tenant';
import { isTenantFieldMissing, type TenantReadinessInput } from '@/entities/tenant/lib/resolveTenantReadiness';
import { AdminField } from '../ui/AdminField';
import { useTenantFormDraft } from '../ui/TenantFormDraftContext';

interface WifiFieldsProps {
  settings?: TenantSettings;
  readinessInput: TenantReadinessInput;
}

export function WifiFields({ settings, readinessInput }: WifiFieldsProps) {
  const { updateDraft } = useTenantFormDraft();
  const wifiName = settings?.wifi?.name ?? '';
  const wifiPassword = settings?.wifi?.password ?? '';

  return (
    <div className="space-y-4">
      <AdminField
        label="WiFi name"
        value={wifiName}
        onChange={(value) =>
          updateDraft({
            wifi: {
              name: value,
              password: wifiPassword,
            },
          })
        }
        missing={isTenantFieldMissing('wifiName', readinessInput)}
      />
      <AdminField
        label="WiFi password"
        value={wifiPassword}
        onChange={(value) =>
          updateDraft({
            wifi: {
              name: wifiName,
              password: value,
            },
          })
        }
        missing={isTenantFieldMissing('wifiPassword', readinessInput)}
      />
    </div>
  );
}
