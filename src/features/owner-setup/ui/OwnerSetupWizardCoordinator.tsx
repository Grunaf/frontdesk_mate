'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import type { CityPackContent, CityPackGateSnapshot, CityPackSelectOption } from '@/entities/city-pack';
import type { CityPackId, TenantSettings } from '@/entities/tenant';
import { isRoomMapModuleEnabled } from '@/entities/tenant/lib/resolveGuestModuleToggles';
import {
  inferLaunchBookingPath,
  resolveFirstIncompleteLaunchStep,
  resolveGuestPathGate,
  type LaunchBookingPath,
  type LaunchStepId,
} from '@/entities/tenant/lib/resolveGuestPathReadiness';
import type { TenantReadinessInput } from '@/entities/tenant/lib/resolveTenantReadiness';
import type { TenantLifecycleStatus } from '@/entities/tenant/lib/resolveTenantLifecycle';
import { saveOwnerTenantSettingsAction } from '@/features/owner-setup/api/saveOwnerTenantSettingsAction';
import {
  readStoredOwnerLaunchBookingPath,
  readStoredOwnerLaunchStep,
  writeStoredOwnerLaunchBookingPath,
  writeStoredOwnerLaunchStep,
} from '@/features/owner-setup/lib/ownerLaunchWizardStorage';
import { validateOwnerTenantFormBeforeSave } from '@/features/owner-setup/lib/validateOwnerTenantFormBeforeSave';
import { useOwnerShell } from '@/features/owner-shell';
import {
  LAUNCH_STEP_ORDER,
  LaunchSetupWizard,
  type OwnerLaunchWizardLabels,
} from '@/features/tenant-launch-setup';
import { normalizeAdminSectionId } from '@/app/admin/(protected)/tenants/lib/adminSections';
import { resolveSubscriptionLifecycleStatus } from '@/app/admin/(protected)/tenants/sections/SubscriptionFields';
import { AdminToast } from '@/app/admin/(protected)/tenants/ui/AdminToast';
import {
  mergeDraftSettings,
  useTenantFormDraft,
} from '@/app/admin/(protected)/tenants/ui/TenantFormDraftContext';
import { TenantFormHiddenPayload } from '@/app/admin/(protected)/tenants/ui/TenantFormHiddenPayload';

interface OwnerSetupWizardCoordinatorProps {
  locale: string;
  lifecycleStatus: TenantLifecycleStatus;
  justSaved?: boolean;
  cityPackOptions: CityPackSelectOption[];
  cityPackGateSnapshot: CityPackGateSnapshot;
  cityPackContentsById: Record<string, CityPackContent>;
  initial: {
    slug: string;
    name: string;
    cityPackId: CityPackId;
    settings?: TenantSettings;
    subscriptionStartsAt: string;
    subscriptionEndsAt: string;
  };
}

export function OwnerSetupWizardCoordinator(props: OwnerSetupWizardCoordinatorProps) {
  return <OwnerSetupWizardCoordinatorInner {...props} />;
}

function OwnerSetupWizardCoordinatorInner({
  locale,
  lifecycleStatus: shellLifecycleStatus,
  justSaved = false,
  cityPackOptions,
  cityPackGateSnapshot,
  cityPackContentsById,
  initial,
}: OwnerSetupWizardCoordinatorProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { canEditSettings } = useOwnerShell();
  const tWizard = useTranslations('pages.owner.wizard');
  const { draft, updateDraft, markDirty, resetDirty } = useTenantFormDraft();

  const saveToastHandledRef = useRef(false);
  const [toast, setToast] = useState<{
    variant: 'success' | 'warning';
    message: string;
    actionLabel?: string;
  } | null>(null);

  const [identity, setIdentity] = useState({
    slug: initial.slug,
    name: initial.name,
    cityPackId: initial.cityPackId,
  });

  const subscription = useMemo(
    () => ({
      subscriptionStartsAt: initial.subscriptionStartsAt,
      subscriptionEndsAt: initial.subscriptionEndsAt,
    }),
    [initial.subscriptionStartsAt, initial.subscriptionEndsAt]
  );

  const lifecycleStatus = useMemo(
    () =>
      resolveSubscriptionLifecycleStatus({
        archived: shellLifecycleStatus === 'archived',
        subscriptionStartsAt: subscription.subscriptionStartsAt,
        subscriptionEndsAt: subscription.subscriptionEndsAt,
      }),
    [shellLifecycleStatus, subscription.subscriptionEndsAt, subscription.subscriptionStartsAt]
  );

  const mergedSettings = useMemo(
    () => mergeDraftSettings(initial.settings ?? {}, draft),
    [initial.settings, draft]
  );

  const readinessInput = useMemo<TenantReadinessInput>(
    () => ({
      slug: identity.slug,
      name: identity.name,
      cityPackId: identity.cityPackId,
      settings: mergedSettings,
      lifecycleStatus,
      cityPackGateSnapshot,
      cityPackContent: cityPackContentsById[identity.cityPackId],
    }),
    [
      identity.slug,
      identity.name,
      identity.cityPackId,
      mergedSettings,
      lifecycleStatus,
      cityPackGateSnapshot,
      cityPackContentsById,
    ]
  );

  const bookingPath = draft.launchBookingPath ?? inferLaunchBookingPath(mergedSettings);

  const guestPathInput = useMemo(
    () => ({
      ...readinessInput,
      bookingPath,
      cityPackGateSnapshot,
    }),
    [readinessInput, bookingPath, cityPackGateSnapshot]
  );

  const [launchStep, setLaunchStep] = useState<LaunchStepId>(() =>
    resolveFirstIncompleteLaunchStep(guestPathInput, LAUNCH_STEP_ORDER)
  );

  useEffect(() => {
    const stored = readStoredOwnerLaunchStep(initial.slug);
    if (stored) {
      setLaunchStep(stored);
    }
  }, [initial.slug]);

  useEffect(() => {
    const storedPath = readStoredOwnerLaunchBookingPath(initial.slug);
    if (storedPath && !draft.launchBookingPath) {
      updateDraft({ launchBookingPath: storedPath });
    }
  }, [draft.launchBookingPath, initial.slug, updateDraft]);

  useEffect(() => {
    writeStoredOwnerLaunchStep(initial.slug, launchStep);
  }, [initial.slug, launchStep]);

  useEffect(() => {
    writeStoredOwnerLaunchBookingPath(initial.slug, bookingPath);
  }, [bookingPath, initial.slug]);

  const handleBookingPathChange = useCallback(
    (path: LaunchBookingPath) => {
      updateDraft({ launchBookingPath: path });
    },
    [updateDraft]
  );

  const handleJumpToAdvancedSection = useCallback(
    (sectionId: string) => {
      const normalized = normalizeAdminSectionId(sectionId) ?? sectionId;
      router.push(`/${locale}/settings#${normalized}`);
    },
    [locale, router]
  );

  const ownerLabels = useMemo<OwnerLaunchWizardLabels>(() => {
    const stepIds: LaunchStepId[] = [
      'identity',
      'contacts-landing',
      'booking',
      'arrival',
      'room-map',
      'rules-wifi',
      'preview',
    ];
    const steps = Object.fromEntries(
      stepIds.map((id) => [
        id,
        {
          title: tWizard(`steps.${id}.title`),
          description: tWizard(`steps.${id}.description`),
          short: tWizard(`steps.${id}.short`),
        },
      ])
    ) as OwnerLaunchWizardLabels['steps'];

    return {
      back: tWizard('back'),
      next: tWizard('next'),
      save: tWizard('save'),
      openFullSection: (values) => tWizard('openFullSection', values),
      subscriptionSeeAbove: tWizard('subscriptionSeeAbove'),
      cityPackReady: tWizard('cityPackReady'),
      cityPackNotReady: tWizard('cityPackNotReady'),
      cityPackRequestLink: tWizard('cityPackRequestLink'),
      steps,
    };
  }, [tWizard]);

  useEffect(() => {
    if (!justSaved || saveToastHandledRef.current) {
      return;
    }

    saveToastHandledRef.current = true;
    resetDirty();
    router.replace(`/${locale}/setup`);

    const gate = resolveGuestPathGate(guestPathInput);

    if (gate.ready) {
      setToast({ variant: 'success', message: tWizard('toast.savedReady') });
      setLaunchStep('preview');
      return;
    }

    setToast({
      variant: 'warning',
      message: tWizard('toast.savedIncomplete', { count: gate.incompleteMust.length }),
      actionLabel: tWizard('toast.continueSetup'),
    });
    setLaunchStep(resolveFirstIncompleteLaunchStep(guestPathInput, LAUNCH_STEP_ORDER));
  }, [guestPathInput, justSaved, locale, resetDirty, router, tWizard]);

  useEffect(() => {
    const error = searchParams.get('error');
    if (!error) {
      return;
    }

    if (error === 'read_only') {
      setToast({ variant: 'warning', message: tWizard('toast.readOnly') });
    } else if (error === 'save') {
      setToast({ variant: 'warning', message: tWizard('toast.saveFailed') });
    }
  }, [searchParams, tWizard]);

  const handleFormSubmit = useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      if (!canEditSettings) {
        event.preventDefault();
        return;
      }

      const formData = new FormData(event.currentTarget);
      const block = validateOwnerTenantFormBeforeSave({
        mergedSettings,
        receptionDeskPin: String(formData.get('receptionDeskPin') || ''),
      });

      if (!block) {
        return;
      }

      event.preventDefault();
      setToast({ variant: 'warning', message: block.message });

      if (block.code === 'reception_desk_pin') {
        setLaunchStep('contacts-landing');
        return;
      }

      setLaunchStep('rules-wifi');
    },
    [canEditSettings, mergedSettings]
  );

  return (
    <form
      action={saveOwnerTenantSettingsAction}
      className="relative space-y-4"
      noValidate
      onSubmit={handleFormSubmit}
      onInput={canEditSettings ? markDirty : undefined}
    >
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="originalSlug" value={initial.slug} />
      <input type="hidden" name="slug" value={identity.slug} />
      <input type="hidden" name="name" value={identity.name} />
      <input type="hidden" name="cityPackId" value={identity.cityPackId} />

      {toast ? (
        <AdminToast
          variant={toast.variant}
          message={toast.message}
          actionLabel={toast.actionLabel}
          onAction={
            toast.actionLabel
              ? () => {
                  setLaunchStep(resolveFirstIncompleteLaunchStep(guestPathInput, LAUNCH_STEP_ORDER));
                }
              : undefined
          }
          onDismiss={() => setToast(null)}
        />
      ) : null}

      <LaunchSetupWizard
        surface="owner"
        locale={locale}
        readOnly={!canEditSettings}
        ownerLabels={ownerLabels}
        stepId={launchStep}
        onStepChange={setLaunchStep}
        bookingPath={bookingPath}
        onBookingPathChange={handleBookingPathChange}
        guestPathInput={guestPathInput}
        readinessInput={readinessInput}
        identity={identity}
        originalSlug={initial.slug}
        subscription={subscription}
        onSubscriptionChange={() => {}}
        onIdentityChange={(next) => {
          markDirty();
          setIdentity((current) => ({
            ...current,
            name: next.name,
            slug: initial.slug,
            cityPackId: initial.cityPackId,
          }));
        }}
        onJumpToAdvancedSection={handleJumpToAdvancedSection}
        settings={mergedSettings}
        lifecycleStatus={lifecycleStatus}
        cityPackOptions={cityPackOptions}
        cityPackGateSnapshot={cityPackGateSnapshot}
        cityPackContentsById={cityPackContentsById}
      />

      <TenantFormHiddenPayload
        subscriptionStartsAt={subscription.subscriptionStartsAt}
        subscriptionEndsAt={subscription.subscriptionEndsAt}
        mergedSettings={mergedSettings}
        roomMapEnabled={draft.roomMapEnabled ?? isRoomMapModuleEnabled(mergedSettings)}
      />
    </form>
  );
}
