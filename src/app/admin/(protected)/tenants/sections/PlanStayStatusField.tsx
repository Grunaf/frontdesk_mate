'use client';

import type { TenantSettings } from '@/entities/tenant';
import { resolvePlanStayStatusEnabled } from '@/entities/tenant/lib/normalizeGuestStaySettings';
import { useTenantFormDraft } from '../ui/TenantFormDraftContext';

export interface PlanStayStatusFieldProps {
  mergedSettings: TenantSettings;
  disabled?: boolean;
}

export function PlanStayStatusField({ mergedSettings, disabled }: PlanStayStatusFieldProps) {
  const { draft, updateDraft } = useTenantFormDraft();
  const checked = draft.planStayStatusEnabled ?? resolvePlanStayStatusEnabled(mergedSettings);

  return (
    <section className="space-y-3" aria-labelledby="plan-stay-status-settings-heading">
      <p
        id="plan-stay-status-settings-heading"
        className="text-xs font-medium uppercase tracking-wide text-muted-foreground"
      >
        Reception Plan
      </p>
      <label className="flex items-start gap-3 rounded-xl border bg-muted/20 px-4 py-3">
        <input
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={(event) => updateDraft({ planStayStatusEnabled: event.target.checked })}
          className="mt-0.5 size-4 shrink-0 rounded border"
        />
        <span>
          <span className="block text-sm font-medium">Show stay status on Plan</span>
          <span className="mt-0.5 block text-xs text-muted-foreground">
            Shows booking lifecycle badges on Plan. Does not affect housekeeping.
          </span>
        </span>
      </label>
    </section>
  );
}
