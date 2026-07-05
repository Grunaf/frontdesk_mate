'use client';

import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { CityPackContent, CityPackGateSnapshot, CityPackSelectOption } from '@/entities/city-pack';
import {
  isCityPackReadyForTenant,
  resolveCityPackNotReadyReasonForTenant,
} from '@/entities/city-pack/lib/resolveCityPackGateForTenant';
import type { CityPackId, TenantSettings } from '@/entities/tenant';
import {
  isLaunchStepComplete,
  type GuestPathReadinessInput,
  type LaunchBookingPath,
  type LaunchStepId,
} from '@/entities/tenant/lib/resolveGuestPathReadiness';
import type { TenantReadinessInput } from '@/entities/tenant/lib/resolveTenantReadiness';
import type { AdminSectionId } from '@/app/admin/(protected)/tenants/lib/adminSections';
import { ADMIN_SECTIONS } from '@/app/admin/(protected)/tenants/lib/adminSections';
import { BookingEngineFields } from '@/app/admin/(protected)/tenants/BookingEngineFields';
import { ArrivalJourneyFields } from '@/app/admin/(protected)/tenants/sections/ArrivalJourneyFields';
import { ContactsFields } from '@/app/admin/(protected)/tenants/sections/ContactsFields';
import { GuestAppFields } from '@/app/admin/(protected)/tenants/sections/GuestAppFields';
import { GuestStayFields } from '@/app/admin/(protected)/tenants/sections/GuestStayFields';
import { IdentityFields } from '@/app/admin/(protected)/tenants/sections/IdentityFields';
import { LandingFields } from '@/app/admin/(protected)/tenants/sections/LandingFields';
import { SubscriptionFields } from '@/app/admin/(protected)/tenants/sections/SubscriptionFields';
import { WifiFields } from '@/app/admin/(protected)/tenants/sections/WifiFields';
import { LaunchBookingFork } from './LaunchBookingFork';
import { LaunchPreviewStep } from './LaunchPreviewStep';
import { LaunchStepChecklist } from './LaunchStepChecklist';
import { getLaunchStepDefinition, LAUNCH_STEPS } from './launchSteps';
import { cn } from '@/shared/lib/utils';
import { Icon } from '@/shared/ui';

interface IdentityState {
  slug: string;
  name: string;
  cityPackId: CityPackId;
}

interface SubscriptionState {
  subscriptionStartsAt: string;
  subscriptionEndsAt: string;
}

export interface OwnerLaunchWizardLabels {
  back: string;
  next: string;
  save: string;
  openFullSection: (values: { section: string }) => string;
  subscriptionSeeAbove: string;
  cityPackReady: string;
  cityPackNotReady: string;
  cityPackRequestLink: string;
  steps: Record<
    LaunchStepId,
    {
      title: string;
      description: string;
      short: string;
    }
  >;
}

export interface LaunchSetupWizardProps {
  surface?: 'platform' | 'owner';
  locale?: string;
  readOnly?: boolean;
  ownerLabels?: OwnerLaunchWizardLabels;
  stepId: LaunchStepId;
  onStepChange: (stepId: LaunchStepId) => void;
  bookingPath: LaunchBookingPath;
  onBookingPathChange: (path: LaunchBookingPath) => void;
  guestPathInput: GuestPathReadinessInput;
  readinessInput: TenantReadinessInput;
  identity: IdentityState;
  originalSlug: string;
  subscription: SubscriptionState;
  onSubscriptionChange: (patch: Partial<SubscriptionState>) => void;
  onIdentityChange: (next: IdentityState) => void;
  onJumpToAdvancedSection: (sectionId: AdminSectionId) => void;
  settings?: TenantSettings;
  lifecycleStatus: GuestPathReadinessInput['lifecycleStatus'];
  cityPackOptions: CityPackSelectOption[];
  cityPackGateSnapshot: CityPackGateSnapshot;
  cityPackContentsById: Record<string, CityPackContent>;
}

function OwnerIdentitySubscriptionHint({ message }: { message: string }) {
  return <p className="mt-6 border-t pt-6 text-sm text-muted-foreground">{message}</p>;
}

export function LaunchSetupWizard({
  surface = 'platform',
  locale = 'en',
  readOnly = false,
  ownerLabels,
  stepId,
  onStepChange,
  bookingPath,
  onBookingPathChange,
  guestPathInput,
  readinessInput,
  identity,
  originalSlug,
  subscription,
  onSubscriptionChange,
  onIdentityChange,
  onJumpToAdvancedSection,
  settings,
  lifecycleStatus,
  cityPackOptions,
  cityPackGateSnapshot,
  cityPackContentsById,
}: LaunchSetupWizardProps) {
  const isOwner = surface === 'owner';
  const labels = isOwner ? ownerLabels : undefined;
  const step = getLaunchStepDefinition(stepId);
  const stepIndex = LAUNCH_STEPS.findIndex((entry) => entry.id === stepId);
  const cityPack = cityPackOptions.find((pack) => pack.id === identity.cityPackId);
  const packReady = isCityPackReadyForTenant(identity.cityPackId, cityPackGateSnapshot);
  const packNotReadyReason = resolveCityPackNotReadyReasonForTenant(
    identity.cityPackId,
    cityPackGateSnapshot
  );

  const stepTitle = labels?.steps[stepId]?.title ?? step.title;
  const stepDescription = labels?.steps[stepId]?.description ?? step.description;

  const renderStepPanel = (panelId: LaunchStepId) => {
    switch (panelId) {
      case 'identity':
        return (
          <>
            <IdentityFields
              slug={identity.slug}
              originalSlug={originalSlug}
              name={identity.name}
              cityPackId={identity.cityPackId}
              cityPackOptions={cityPackOptions}
              cityPackGateSnapshot={cityPackGateSnapshot}
              cityPackContent={cityPackContentsById[identity.cityPackId]}
              settings={settings}
              readinessInput={readinessInput}
              onChange={onIdentityChange}
              slugReadOnly={isOwner}
              cityPackReadOnly={isOwner}
            />
            {isOwner ? (
              <OwnerIdentitySubscriptionHint message={labels?.subscriptionSeeAbove ?? ''} />
            ) : (
              <div className="mt-6 border-t pt-6">
                <SubscriptionFields
                  subscriptionStartsAt={subscription.subscriptionStartsAt}
                  subscriptionEndsAt={subscription.subscriptionEndsAt}
                  onChange={onSubscriptionChange}
                />
              </div>
            )}
          </>
        );
      case 'contacts-landing':
        return (
          <>
            <ContactsFields settings={settings} readinessInput={readinessInput} scope="launch-core" />
            <div className="mt-6 border-t pt-6">
              <LandingFields
                tenantSlug={identity.slug}
                settings={settings}
                readinessInput={readinessInput}
                scope="launch-hero"
              />
            </div>
          </>
        );
      case 'booking':
        return (
          <>
            <LaunchBookingFork value={bookingPath} onChange={onBookingPathChange} />
            <div className="mt-6 space-y-6 border-t pt-6">
              {bookingPath === 'engine' ? (
                <BookingEngineFields settings={settings} readinessInput={readinessInput} />
              ) : (
                <>
                  <div className="rounded-lg border bg-muted/20 px-4 py-3 text-sm">
                    <p className="text-muted-foreground">
                      Guests book via your reception WhatsApp. Room cards use the same number unless
                      you set a separate booking WhatsApp in Reception &amp; hostel.
                    </p>
                    <button
                      type="button"
                      onClick={() => onJumpToAdvancedSection('contacts')}
                      className="mt-3 text-sm font-medium text-primary hover:underline"
                    >
                      {isOwner && labels
                        ? labels.openFullSection({
                            section:
                              ADMIN_SECTIONS.find((entry) => entry.id === 'contacts')?.label ?? 'contacts',
                          })
                        : 'Open Reception & hostel'}
                    </button>
                  </div>
                  <LandingFields
                    tenantSlug={identity.slug}
                    settings={settings}
                    readinessInput={readinessInput}
                    scope="launch-rooms"
                  />
                </>
              )}
            </div>
          </>
        );
      case 'arrival':
        return (
          <ArrivalJourneyFields
            tenantSlug={identity.slug}
            settings={settings}
            cityPackId={identity.cityPackId}
            cityPackLabel={cityPack?.label}
            cityPackGateSnapshot={cityPackGateSnapshot}
            cityPackContent={cityPackContentsById[identity.cityPackId]}
            readinessInput={readinessInput}
            scope="launch-core"
          />
        );
      case 'room-map':
        return <GuestStayFields tenantSlug={identity.slug} settings={settings} readinessInput={readinessInput} />;
      case 'rules-wifi':
        return (
          <>
            <div className="rounded-lg border bg-muted/20 px-4 py-3 text-sm">
              <p className="font-medium">Local guide</p>
              <p className="mt-1 text-muted-foreground">
                City pack:{' '}
                <span className="font-medium text-foreground">{cityPack?.label ?? identity.cityPackId}</span>
                {packReady
                  ? isOwner && labels
                    ? ` — ${labels.cityPackReady}`
                    : ' — ready for guests (places + routes).'
                  : ` — ${packNotReadyReason ?? (isOwner && labels ? labels.cityPackNotReady : 'not ready yet.')} `}
                {!packReady && isOwner && labels ? (
                  <>
                    {' '}
                    <Link
                      href={`/${locale}/onboarding/city-request`}
                      className="font-semibold text-primary underline"
                    >
                      {labels.cityPackRequestLink}
                    </Link>
                  </>
                ) : null}
                {!packReady && !isOwner ? (
                  <a href={`/admin/city-packs/${identity.cityPackId}`} className="font-semibold text-primary underline">
                    Edit city pack →
                  </a>
                ) : null}
              </p>
            </div>
            <div className="mt-6 border-t pt-6">
              <GuestAppFields
                tenantSlug={identity.slug}
                settings={settings}
                cityPackId={identity.cityPackId}
                cityPackContent={cityPackContentsById[identity.cityPackId]}
                cityPackGateSnapshot={cityPackGateSnapshot}
                readinessInput={readinessInput}
                scope="rules-only"
              />
            </div>
            <div className="mt-6 border-t pt-6">
              <WifiFields settings={settings} readinessInput={readinessInput} />
            </div>
          </>
        );
      case 'preview':
        return (
          <LaunchPreviewStep
            slug={identity.slug}
            lifecycleStatus={lifecycleStatus}
            readinessInput={guestPathInput}
            locale={locale}
          />
        );
      default:
        return null;
    }
  };

  const goToStep = (nextIndex: number) => {
    const next = LAUNCH_STEPS[nextIndex];
    if (next) {
      onStepChange(next.id);
    }
  };

  const chipLabel = (entryId: LaunchStepId, index: number, fallbackTitle: string) => {
    const short = labels?.steps[entryId]?.short;
    if (short) {
      return `${index + 1}. ${short}`;
    }
    return `${index + 1}. ${fallbackTitle.split(' ')[0]}`;
  };

  return (
    <div className="space-y-5 rounded-xl border bg-background p-4 sm:p-5">
      <fieldset disabled={readOnly} className="min-w-0 space-y-5 disabled:opacity-80">
        <div className="space-y-3">
          <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
            {LAUNCH_STEPS.map((entry, index) => {
              const complete = isLaunchStepComplete(entry.id, guestPathInput);

              return (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() => onStepChange(entry.id)}
                  className={cn(
                    'shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors',
                    entry.id === stepId
                      ? 'border-primary bg-primary text-primary-foreground'
                      : complete
                        ? 'border-green-300 bg-green-50 text-green-900 hover:bg-green-100'
                        : 'border-border bg-background text-muted-foreground hover:bg-muted/50'
                  )}
                >
                  {chipLabel(entry.id, index, entry.title)}
                </button>
              );
            })}
          </div>

          <div>
            <h3 className="text-base font-semibold">{stepTitle}</h3>
            <p className="mt-0.5 text-sm text-muted-foreground">{stepDescription}</p>
          </div>
        </div>

        {stepId !== 'preview' ? (
          <LaunchStepChecklist stepId={stepId} readinessInput={guestPathInput} />
        ) : null}

        {LAUNCH_STEPS.map((entry) => (
          <div
            key={entry.id}
            className={cn(entry.id !== stepId && 'hidden')}
            aria-hidden={entry.id !== stepId}
          >
            {renderStepPanel(entry.id)}
          </div>
        ))}

        {step.sectionIds.length > 0 ? (
          <div className="flex flex-wrap gap-2 border-t pt-4">
            {step.sectionIds.map((sectionId) => {
              const sectionLabel =
                ADMIN_SECTIONS.find((entry) => entry.id === sectionId)?.label ?? sectionId;
              return (
                <button
                  key={sectionId}
                  type="button"
                  onClick={() => onJumpToAdvancedSection(sectionId)}
                  className="text-xs font-medium text-primary hover:underline"
                >
                  {labels
                    ? labels.openFullSection({ section: sectionLabel })
                    : `Open full ${sectionLabel} section →`}
                </button>
              );
            })}
          </div>
        ) : null}
      </fieldset>

      <div className="flex items-center justify-between gap-3 border-t pt-4">
        <button
          type="button"
          disabled={stepIndex <= 0}
          onClick={() => goToStep(stepIndex - 1)}
          className="inline-flex min-h-11 items-center gap-1 rounded-md border px-3 py-2 text-sm font-medium disabled:opacity-40"
        >
          <Icon icon={ChevronLeft} className="size-4" />
          {labels?.back ?? 'Back'}
        </button>
        {stepId === 'preview' ? (
          <button
            type="submit"
            disabled={readOnly}
            className="inline-flex min-h-11 items-center gap-1 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-40"
          >
            {labels?.save ?? 'Save changes'}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => goToStep(stepIndex + 1)}
            className="inline-flex min-h-11 items-center gap-1 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"
          >
            {labels?.next ?? 'Next'}
            <Icon icon={ChevronRight} className="size-4" />
          </button>
        )}
      </div>
    </div>
  );
}
