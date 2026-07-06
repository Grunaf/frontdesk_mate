'use client';

import type { TenantSettings } from '@/entities/tenant';
import {
  resolveTourismRegistrationConfig,
  resolveTourismRegistrationRequired,
} from '@/entities/tenant/lib/normalizeGuestStaySettings';
import { useTenantFormDraft } from '@/app/admin/(protected)/tenants/ui/TenantFormDraftContext';
import {
  DEFAULT_TOURISM_PROFILE_ID,
  getTourismRegistrationProfile,
  TOURISM_PROFILE_IDS,
} from '../model/tourismRegistrationProfiles';

export interface GuestTourismRegistrationComplianceFieldProps {
  mergedSettings: TenantSettings;
  disabled?: boolean;
}

export function GuestTourismRegistrationComplianceField({
  mergedSettings,
  disabled,
}: GuestTourismRegistrationComplianceFieldProps) {
  const { draft, updateDraft } = useTenantFormDraft();
  const checked =
    draft.tourismRegistrationRequired ?? resolveTourismRegistrationRequired(mergedSettings);

  const existingConfig = resolveTourismRegistrationConfig(mergedSettings);
  const profileId =
    draft.tourismProfileId ?? existingConfig?.profileId ?? DEFAULT_TOURISM_PROFILE_ID;

  return (
    <section className="space-y-3" aria-labelledby="guest-registration-settings-heading">
      <p
        id="guest-registration-settings-heading"
        className="text-xs font-medium uppercase tracking-wide text-muted-foreground"
      >
        Guest registration
      </p>
      <div className="rounded-xl border border-amber-200/60 bg-amber-50/40 px-4 py-3 dark:border-amber-900/40 dark:bg-amber-950/20">
        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            checked={checked}
            disabled={disabled}
            onChange={(event) => updateDraft({ tourismRegistrationRequired: event.target.checked })}
            className="mt-0.5 size-4 shrink-0 rounded border"
          />
          <span>
            <span className="block text-sm font-medium">Require identity registration</span>
            <span className="mt-0.5 block text-xs text-muted-foreground">
              When enabled, guests must register their identity documents before accessing settlement
              details. Required documents depend on the selected jurisdiction.
            </span>
          </span>
        </label>

        {checked ? (
          <div className="ml-7 mt-3">
            <label className="block text-xs font-medium text-muted-foreground">
              Jurisdiction
              <select
                value={profileId}
                disabled={disabled}
                onChange={(event) => updateDraft({ tourismProfileId: event.target.value })}
                className="mt-1 block w-full rounded-md border bg-background px-2 py-1.5 text-sm"
              >
                {TOURISM_PROFILE_IDS.map((id) => {
                  const profile = getTourismRegistrationProfile(id);
                  return (
                    <option key={id} value={id}>
                      {profile?.countryNameKey ?? id}
                    </option>
                  );
                })}
              </select>
            </label>
          </div>
        ) : null}
      </div>
    </section>
  );
}
