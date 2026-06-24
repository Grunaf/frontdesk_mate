'use client';

import type { TenantSettings } from '@/entities/tenant';
import { isTenantFieldMissing, type TenantReadinessInput } from '@/entities/tenant/lib/resolveTenantReadiness';
import { AdminFieldRow } from '../ui/AdminField';
import { AdminTimeField } from '../ui/AdminTimeField';
import { AdminCurrencyFields } from '../ui/AdminCurrencyFields';

export type HostelPolicyFieldsScope = 'full' | 'launch-core';

interface HostelPolicyFieldsProps {
  settings?: TenantSettings;
  readinessInput: TenantReadinessInput;
  scope?: HostelPolicyFieldsScope;
}

export function HostelPolicyFields({
  settings,
  readinessInput,
  scope = 'full',
}: HostelPolicyFieldsProps) {
  if (scope === 'launch-core') {
    return (
      <div className="space-y-4 border-t pt-6">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Stay policy
        </p>
        <AdminFieldRow>
          <AdminTimeField
            label="Check-in from"
            name="checkInTime"
            defaultValue={settings?.checkInTime}
            missing={isTenantFieldMissing('checkInTime', readinessInput)}
          />
          <AdminTimeField
            label="Check-out until"
            name="checkOutTime"
            defaultValue={settings?.checkOutTime}
          />
        </AdminFieldRow>
      </div>
    );
  }

  return (
    <div className="space-y-4 border-t pt-6">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Stay policy & money
      </p>
      <AdminFieldRow>
        <AdminTimeField
          label="Check-in from"
          name="checkInTime"
          defaultValue={settings?.checkInTime}
          missing={isTenantFieldMissing('checkInTime', readinessInput)}
        />
        <AdminTimeField
          label="Check-out until"
          name="checkOutTime"
          defaultValue={settings?.checkOutTime}
        />
      </AdminFieldRow>
      <AdminTimeField
        label="Self check-in after"
        name="selfCheckInTimeAfter"
        defaultValue={settings?.selfCheckInTimeAfter}
        hint="Shown when guests arrive outside reception hours."
      />
      <AdminCurrencyFields settings={settings} />
    </div>
  );
}
