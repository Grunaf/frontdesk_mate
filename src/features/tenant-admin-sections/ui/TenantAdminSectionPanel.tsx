'use client';

import type { CityPackContent, CityPackGateSnapshot, CityPackSelectOption } from '@/entities/city-pack';
import type { CityPackId, TenantSettings } from '@/entities/tenant';
import type { TenantReadinessInput } from '@/entities/tenant/lib/resolveTenantReadiness';
import { BookingEngineFields } from '@/app/admin/(protected)/tenants/BookingEngineFields';
import type { AdminSectionId } from '@/app/admin/(protected)/tenants/lib/adminSections';
import { ArrivalJourneyFields } from '@/app/admin/(protected)/tenants/sections/ArrivalJourneyFields';
import { ContactsFields } from '@/app/admin/(protected)/tenants/sections/ContactsFields';
import type { ContactsAdminModuleId } from '@/app/admin/(protected)/tenants/lib/contactsAdminSubsections';
import type { ArrivalJourneyAdminModuleId } from '@/app/admin/(protected)/tenants/lib/arrivalJourneyAdminSubsections';
import type { GuestAppAdminModuleId } from '@/app/admin/(protected)/tenants/lib/guestAppAdminSubsections';
import { GuestAppFields } from '@/app/admin/(protected)/tenants/sections/GuestAppFields';
import { IdentityFields } from '@/app/admin/(protected)/tenants/sections/IdentityFields';
import { LandingFields } from '@/app/admin/(protected)/tenants/sections/LandingFields';
import { SubscriptionFields } from '@/app/admin/(protected)/tenants/sections/SubscriptionFields';
import { WifiFields } from '@/app/admin/(protected)/tenants/sections/WifiFields';

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
  locale?: string;
  contactsModuleId?: ContactsAdminModuleId | null;
  onContactsModuleChange?: (moduleId: ContactsAdminModuleId | null) => void;
  arrivalJourneyModuleId?: ArrivalJourneyAdminModuleId | null;
  onArrivalJourneyModuleChange?: (moduleId: ArrivalJourneyAdminModuleId | null) => void;
  guestAppModuleId?: GuestAppAdminModuleId | null;
  onGuestAppModuleChange?: (moduleId: GuestAppAdminModuleId | null) => void;
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
  locale = 'en',
  contactsModuleId = null,
  onContactsModuleChange,
  arrivalJourneyModuleId = null,
  onArrivalJourneyModuleChange,
  guestAppModuleId = null,
  onGuestAppModuleChange,
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
          ownerLocale={isOwner ? locale : undefined}
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
          activeModuleId={arrivalJourneyModuleId}
          onModuleChange={onArrivalJourneyModuleChange}
        />
      );
    case 'guest-app':
      return (
        <GuestAppFields
          tenantSlug={identity.slug}
          settings={mergedSettings}
          cityPackId={identity.cityPackId}
          cityPackContent={cityPackContentsById[identity.cityPackId]}
          cityPackGateSnapshot={cityPackGateSnapshot}
          readinessInput={readinessInput}
          onJumpToSection={onJumpToSection}
          surface={isOwner ? 'owner' : 'platform'}
          locale={locale}
          readOnly={readOnly}
          activeModuleId={guestAppModuleId}
          onModuleChange={onGuestAppModuleChange}
        />
      );
    case 'wifi':
      return <WifiFields settings={mergedSettings} readinessInput={readinessInput} />;
    case 'contacts':
      return (
        <ContactsFields
          settings={mergedSettings}
          readinessInput={readinessInput}
          surface={isOwner ? 'owner' : 'platform'}
          tenantSlug={identity.slug}
          locale={locale}
          readOnly={readOnly}
          activeModuleId={contactsModuleId}
          onModuleChange={onContactsModuleChange}
        />
      );
  }
}
