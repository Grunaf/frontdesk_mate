'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { CityPackGateSnapshot, CityPackSelectOption } from '@/entities/city-pack';
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
import type { AdminSectionId } from '../lib/adminSections';
import { ArrivalAccessFields } from '../ArrivalAccessFields';
import { BookingEngineFields } from '../BookingEngineFields';
import { ContactsFields } from '../sections/ContactsFields';
import { GuestAppFields } from '../sections/GuestAppFields';
import { GuestStayFields } from '../sections/GuestStayFields';
import { IdentityFields } from '../sections/IdentityFields';
import { LandingFields } from '../sections/LandingFields';
import { SubscriptionFields } from '../sections/SubscriptionFields';
import { WifiFields } from '../sections/WifiFields';
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

interface LaunchSetupWizardProps {
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
}

export function LaunchSetupWizard({
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
}: LaunchSetupWizardProps) {
  const step = getLaunchStepDefinition(stepId);
  const stepIndex = LAUNCH_STEPS.findIndex((entry) => entry.id === stepId);
  const cityPack = cityPackOptions.find((pack) => pack.id === identity.cityPackId);
  const packReady = isCityPackReadyForTenant(identity.cityPackId, cityPackGateSnapshot);
  const packNotReadyReason = resolveCityPackNotReadyReasonForTenant(
    identity.cityPackId,
    cityPackGateSnapshot
  );

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
              settings={settings}
              readinessInput={readinessInput}
              onChange={onIdentityChange}
            />
            <div className="mt-6 border-t pt-6">
              <SubscriptionFields
                subscriptionStartsAt={subscription.subscriptionStartsAt}
                subscriptionEndsAt={subscription.subscriptionEndsAt}
                onChange={onSubscriptionChange}
              />
            </div>
          </>
        );
      case 'contacts-landing':
        return (
          <>
            <ContactsFields settings={settings} readinessInput={readinessInput} scope="launch-core" />
            <div className="mt-6 border-t pt-6">
              <LandingFields
                settings={settings}
                readinessInput={readinessInput}
                scope="launch-hero"
                includeLandingJson={bookingPath === 'engine'}
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
                  <input type="hidden" name="bookingProvider" value="none" />
                  <p className="text-sm text-muted-foreground">
                    Guests book via the same WhatsApp as reception unless you set another number below.
                  </p>
                  <ContactsFields
                    settings={settings}
                    readinessInput={readinessInput}
                    scope="launch-booking-override"
                  />
                  <LandingFields
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
        return <ArrivalAccessFields settings={settings} />;
      case 'room-map':
        return <GuestStayFields settings={settings} readinessInput={readinessInput} />;
      case 'rules-wifi':
        return (
          <>
            <div className="rounded-lg border bg-muted/20 px-4 py-3 text-sm">
              <p className="font-medium">Local guide</p>
              <p className="mt-1 text-muted-foreground">
                City pack: <span className="font-medium text-foreground">{cityPack?.label ?? identity.cityPackId}</span>
                {packReady
                  ? ' — ready for guests (places + routes).'
                  : ` — ${packNotReadyReason ?? 'not ready yet.'} `}
                {!packReady ? (
                  <a href={`/admin/city-packs/${identity.cityPackId}`} className="font-semibold text-primary underline">
                    Edit city pack →
                  </a>
                ) : null}
              </p>
            </div>
            <div className="mt-6 border-t pt-6">
              <GuestAppFields
                settings={settings}
                cityPackId={identity.cityPackId}
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

  return (
    <div className="space-y-5 rounded-xl border bg-background p-4 sm:p-5">
      <div className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {LAUNCH_STEPS.map((entry, index) => {
            const complete = isLaunchStepComplete(entry.id, guestPathInput);

            return (
              <button
                key={entry.id}
                type="button"
                onClick={() => onStepChange(entry.id)}
                className={cn(
                  'rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors',
                  entry.id === stepId
                    ? 'border-primary bg-primary text-primary-foreground'
                    : complete
                      ? 'border-green-300 bg-green-50 text-green-900 hover:bg-green-100'
                      : 'border-border bg-background text-muted-foreground hover:bg-muted/50'
                )}
              >
                {index + 1}. {entry.title.split(' ')[0]}
              </button>
            );
          })}
        </div>

        <div>
          <h3 className="text-base font-semibold">{step.title}</h3>
          <p className="mt-0.5 text-sm text-muted-foreground">{step.description}</p>
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
          {step.sectionIds.map((sectionId) => (
            <button
              key={sectionId}
              type="button"
              onClick={() => onJumpToAdvancedSection(sectionId)}
              className="text-xs font-medium text-primary hover:underline"
            >
              Open full {sectionId} section →
            </button>
          ))}
        </div>
      ) : null}

      <div className="flex items-center justify-between gap-3 border-t pt-4">
        <button
          type="button"
          disabled={stepIndex <= 0}
          onClick={() => goToStep(stepIndex - 1)}
          className="inline-flex items-center gap-1 rounded-md border px-3 py-2 text-sm font-medium disabled:opacity-40"
        >
          <Icon icon={ChevronLeft} className="size-4" />
          Back
        </button>
        {stepId === 'preview' ? (
          <button
            type="submit"
            className="inline-flex items-center gap-1 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            Save changes
          </button>
        ) : (
          <button
            type="button"
            onClick={() => goToStep(stepIndex + 1)}
            className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"
          >
            Next
            <Icon icon={ChevronRight} className="size-4" />
          </button>
        )}
      </div>
    </div>
  );
}
