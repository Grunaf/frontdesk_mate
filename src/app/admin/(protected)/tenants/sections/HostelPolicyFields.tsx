'use client';

import type { TenantSettings } from '@/entities/tenant';
import { isTenantFieldMissing, type TenantReadinessInput } from '@/entities/tenant/lib/resolveTenantReadiness';
import { AdminFieldRow } from '../ui/AdminField';
import { AdminTimeField } from '../ui/AdminTimeField';
import { AdminCurrencyFields } from '../ui/AdminCurrencyFields';
import { useTenantFormDraft } from '../ui/TenantFormDraftContext';

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
  const { updateDraft } = useTenantFormDraft();

  const timeFields = (
    <AdminFieldRow>
      <AdminTimeField
        label="Check-in from"
        value={settings?.checkInTime ?? ''}
        onChange={(value) => updateDraft({ checkInTime: value })}
        missing={isTenantFieldMissing('checkInTime', readinessInput)}
      />
      <AdminTimeField
        label="Check-out until"
        value={settings?.checkOutTime ?? ''}
        onChange={(value) => updateDraft({ checkOutTime: value })}
      />
    </AdminFieldRow>
  );

  if (scope === 'launch-core') {
    return (
      <div className="space-y-4 border-t pt-6">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Stay policy
        </p>
        {timeFields}
      </div>
    );
  }

  return (
    <div className="space-y-4 border-t pt-6">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Stay policy & money
      </p>
      {timeFields}
      <AdminTimeField
        label="Self check-in after"
        value={settings?.selfCheckInTimeAfter ?? ''}
        onChange={(value) => updateDraft({ selfCheckInTimeAfter: value })}
        hint="Shown when guests arrive outside reception hours."
      />
      <AdminCurrencyFields settings={settings} />
    </div>
  );
}
