'use client';

import type { CityPackContent, CityPackGateSnapshot, CityPackSelectOption } from '@/entities/city-pack';
import type { CityPackId, TenantSettings } from '@/entities/tenant';
import type { TenantReadinessInput } from '@/entities/tenant/lib/resolveTenantReadiness';
import {
  resolveTourismRegistrationConfig,
  resolveTourismRegistrationRequired,
} from '@/entities/tenant/lib/normalizeGuestStaySettings';
import {
  DEFAULT_TOURISM_PROFILE_ID,
  getTourismRegistrationProfile,
  TOURISM_PROFILE_IDS,
} from '@/features/guest-tourism-registration/model/tourismRegistrationProfiles';
import { BookingEngineFields } from '@/app/admin/(protected)/tenants/BookingEngineFields';
import type { AdminSectionId } from '@/app/admin/(protected)/tenants/lib/adminSections';
import { ArrivalJourneyFields } from '@/app/admin/(protected)/tenants/sections/ArrivalJourneyFields';
import { ContactsFields } from '@/app/admin/(protected)/tenants/sections/ContactsFields';
import { GuestAppFields } from '@/app/admin/(protected)/tenants/sections/GuestAppFields';
import { IdentityFields } from '@/app/admin/(protected)/tenants/sections/IdentityFields';
import { LandingFields } from '@/app/admin/(protected)/tenants/sections/LandingFields';
import { SubscriptionFields } from '@/app/admin/(protected)/tenants/sections/SubscriptionFields';
import { WifiFields } from '@/app/admin/(protected)/tenants/sections/WifiFields';
import { useTenantFormDraft } from '@/app/admin/(protected)/tenants/ui/TenantFormDraftContext';

export interface TenantAdminSectionIdentityState {
  slug: string;
  name: string;
  cityPackId: CityPackId;
}

export interface TenantAdminSectionSubscriptionState {
  subscriptionStartsAt: string;
  subscriptionEndsAt: string;
}

export interface TenantAdminSectionPanelProps {
  surface: 'platform' | 'owner';
  sectionId: AdminSectionId;
  initialSettings?: TenantSettings;
  identity: TenantAdminSectionIdentityState;
  originalSlug: string;
  subscription: TenantAdminSectionSubscriptionState;
  onSubscriptionChange: (patch: Partial<TenantAdminSectionSubscriptionState>) => void;
  readinessInput: TenantReadinessInput;
  onIdentityChange: (next: TenantAdminSectionIdentityState) => void;
  onJumpToSection: (sectionId: AdminSectionId) => void;
  cityPackOptions: CityPackSelectOption[];
  cityPackGateSnapshot: CityPackGateSnapshot;
  cityPackContentsById: Record<string, CityPackContent>;
  mergedSettings: TenantSettings;
  readOnly?: boolean;
}

function GuestTourismRegistrationComplianceField({
  mergedSettings,
  disabled,
}: {
  mergedSettings: TenantSettings;
  disabled?: boolean;
}) {
  const { draft, updateDraft } = useTenantFormDraft();
  const checked =
    draft.tourismRegistrationRequired ?? resolveTourismRegistrationRequired(mergedSettings);

  const existingConfig = resolveTourismRegistrationConfig(mergedSettings);
  const profileId =
    draft.tourismProfileId ?? existingConfig?.profileId ?? DEFAULT_TOURISM_PROFILE_ID;

  return (
    <div className="mb-6 rounded-xl border border-amber-200/60 bg-amber-50/40 px-4 py-3 dark:border-amber-900/40 dark:bg-amber-950/20">
      <label className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={(event) => updateDraft({ tourismRegistrationRequired: event.target.checked })}
          className="mt-0.5 size-4 shrink-0 rounded border"
        />
        <span>
          <span className="block text-sm font-medium">Guest registration</span>
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
  );
}

export function TenantAdminSectionPanel({
  surface,
  sectionId,
  initialSettings,
  identity,
  originalSlug,
  subscription,
  onSubscriptionChange,
  readinessInput,
  onIdentityChange,
  onJumpToSection,
  cityPackOptions,
  cityPackGateSnapshot,
  cityPackContentsById,
  mergedSettings,
  readOnly = false,
}: TenantAdminSectionPanelProps) {
  const s = initialSettings;
  const isOwner = surface === 'owner';

  const handleIdentityChange = (next: TenantAdminSectionIdentityState) => {
    if (isOwner) {
      onIdentityChange({
        slug: identity.slug,
        name: next.name,
        cityPackId: identity.cityPackId,
      });
      return;
    }
    onIdentityChange(next);
  };

  switch (sectionId) {
    case 'identity':
      return (
        <IdentityFields
          slug={identity.slug}
          originalSlug={originalSlug}
          name={identity.name}
          cityPackId={identity.cityPackId}
          cityPackOptions={cityPackOptions}
          cityPackGateSnapshot={cityPackGateSnapshot}
          settings={s}
          readinessInput={readinessInput}
          onChange={handleIdentityChange}
          cityPackContent={cityPackContentsById[identity.cityPackId]}
          slugReadOnly={isOwner}
          cityPackReadOnly={isOwner}
        />
      );
    case 'subscription':
      return (
        <SubscriptionFields
          subscriptionStartsAt={subscription.subscriptionStartsAt}
          subscriptionEndsAt={subscription.subscriptionEndsAt}
          onChange={onSubscriptionChange}
        />
      );
    case 'landing':
      return (
        <LandingFields
          tenantSlug={identity.slug}
          settings={mergedSettings}
          readinessInput={readinessInput}
          onJumpToSection={onJumpToSection}
        />
      );
    case 'booking':
      return <BookingEngineFields settings={mergedSettings} readinessInput={readinessInput} />;
    case 'arrival-journey':
      return (
        <ArrivalJourneyFields
          tenantSlug={identity.slug}
          settings={mergedSettings}
          cityPackId={identity.cityPackId}
          cityPackLabel={cityPackOptions.find((pack) => pack.id === identity.cityPackId)?.label}
          cityPackGateSnapshot={cityPackGateSnapshot}
          cityPackContent={cityPackContentsById[identity.cityPackId]}
          readinessInput={readinessInput}
        />
      );
    case 'guest-app':
      return (
        <>
          <GuestTourismRegistrationComplianceField mergedSettings={mergedSettings} disabled={readOnly} />
          <GuestAppFields
            tenantSlug={identity.slug}
            settings={mergedSettings}
            cityPackId={identity.cityPackId}
            cityPackContent={cityPackContentsById[identity.cityPackId]}
            cityPackGateSnapshot={cityPackGateSnapshot}
            readinessInput={readinessInput}
            onJumpToSection={onJumpToSection}
          />
        </>
      );
    case 'wifi':
      return <WifiFields settings={mergedSettings} readinessInput={readinessInput} />;
    case 'contacts':
      return <ContactsFields settings={mergedSettings} readinessInput={readinessInput} />;
  }
}
