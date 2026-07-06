'use client';

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import Link from 'next/link';
import { useParams, usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import type { CityPackContent, CityPackGateSnapshot, CityPackSelectOption } from '@/entities/city-pack';
import type { CityPackId, TenantSettings } from '@/entities/tenant';
import { isRoomMapModuleEnabled } from '@/entities/tenant/lib/resolveGuestModuleToggles';
import {
  inferLaunchBookingPath,
  resolveGuestPathGate,
} from '@/entities/tenant/lib/resolveGuestPathReadiness';
import {
  getTenantSetupSummaries,
  type TenantReadinessInput,
} from '@/entities/tenant/lib/resolveTenantReadiness';
import type { TenantLifecycleStatus } from '@/entities/tenant/lib/resolveTenantLifecycle';
import {
  adminSectionIdForSaveBlock,
  getAdminSectionStatus,
  type AdminSectionId,
} from '@/app/admin/(protected)/tenants/lib/adminSections';
import {
  formatAdminSectionGuestProgress,
  getAdminSectionGuestProgress,
} from '@/app/admin/(protected)/tenants/lib/resolveAdminSectionProgress';
import { resolveSubscriptionLifecycleStatus } from '@/app/admin/(protected)/tenants/sections/SubscriptionFields';
import { AdminSectionStatusBadge } from '@/app/admin/(protected)/tenants/ui/AdminField';
import { AdminToast } from '@/app/admin/(protected)/tenants/ui/AdminToast';
import {
  mergeDraftSettings,
  useTenantFormDraft,
} from '@/app/admin/(protected)/tenants/ui/TenantFormDraftContext';
import { TenantFormHiddenPayload } from '@/app/admin/(protected)/tenants/ui/TenantFormHiddenPayload';
import { TenantReadinessChecklist } from '@/app/admin/(protected)/tenants/ui/TenantReadinessChecklist';
import { TenantSettingsNav } from '@/app/admin/(protected)/tenants/ui/TenantSettingsNav';
import { TenantUnsavedSectionDialog } from '@/app/admin/(protected)/tenants/ui/TenantUnsavedSectionDialog';
import {
  clearReceptionDeskPinInputs,
  tenantFormHasUnsavedChanges,
} from '@/app/admin/(protected)/tenants/lib/tenantFormHasUnsavedChanges';
import { saveOwnerTenantSettingsAction } from '@/features/owner-setup/api/saveOwnerTenantSettingsAction';
import { validateOwnerTenantFormBeforeSave } from '@/features/owner-setup/lib/validateOwnerTenantFormBeforeSave';
import { useOwnerShell } from '@/features/owner-shell';
import { TenantAdminSectionPanel } from '@/features/tenant-admin-sections';
import {
  getOwnerSettingsSections,
  normalizeOwnerSettingsSectionId,
  ownerSettingsSectionPath,
  type OwnerSettingsSectionId,
} from '../lib/ownerSettingsSections';
import {
  appendContactsModuleToUrl,
  CONTACTS_ADMIN_MODULE_QUERY,
  getContactsAdminModuleLabel,
  normalizeContactsAdminModuleId,
  stripSettingsModuleFromUrl,
  type ContactsAdminModuleId,
} from '@/app/admin/(protected)/tenants/lib/contactsAdminSubsections';
import {
  getArrivalJourneyAdminModuleLabel,
  normalizeArrivalJourneyAdminModuleId,
  type ArrivalJourneyAdminModuleId,
} from '@/app/admin/(protected)/tenants/lib/arrivalJourneyAdminSubsections';
import {
  getGuestAppAdminModuleLabel,
  normalizeGuestAppAdminModuleId,
  type GuestAppAdminModuleId,
} from '@/app/admin/(protected)/tenants/lib/guestAppAdminSubsections';
import { appendSettingsModuleToUrl } from '@/app/admin/(protected)/tenants/lib/tenantSettingsModuleUrl';
import { AdminSettingsPanelBreadcrumbs } from '@/app/admin/(protected)/tenants/ui/AdminSettingsPanelBreadcrumbs';
import {
  scrollTenantSettingsPanelIntoView,
  scrollToSectionTarget,
  TENANT_SETTINGS_PANEL_ID,
} from '@/app/admin/(protected)/tenants/lib/scrollTenantSettingsPanelIntoView';

interface OwnerSettingsCoordinatorProps {
  locale: string;
  lifecycleStatus: TenantLifecycleStatus;
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

export function OwnerSettingsCoordinator(props: OwnerSettingsCoordinatorProps) {
  return <OwnerSettingsCoordinatorInner {...props} />;
}

function OwnerSettingsCoordinatorInner({
  locale,
  lifecycleStatus: shellLifecycleStatus,
  cityPackOptions,
  cityPackGateSnapshot,
  cityPackContentsById,
  initial,
}: OwnerSettingsCoordinatorProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const routeParams = useParams();
  const justSaved = searchParams.get('saved') === '1';
  const { canEditSettings } = useOwnerShell();
  const t = useTranslations('pages.owner.settings');
  const tUnsavedNav = useTranslations('pages.owner.settings.unsavedNav');
  const { draft, clearDraft, resetDirty } = useTenantFormDraft();

  const formRef = useRef<HTMLFormElement>(null);
  const stickyFooterRef = useRef<HTMLDivElement>(null);
  const stickyOffsetRef = useRef(96);
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

  const [receptionDeskPinInput, setReceptionDeskPinInput] = useState('');

  const [pendingSectionNav, setPendingSectionNav] = useState<{
    sectionId: AdminSectionId;
    href: string;
  } | null>(null);

  const formBaseline = useMemo(
    () => ({
      slug: initial.slug,
      name: initial.name,
      cityPackId: initial.cityPackId,
      subscriptionStartsAt: initial.subscriptionStartsAt,
      subscriptionEndsAt: initial.subscriptionEndsAt,
      settings: initial.settings,
    }),
    [
      initial.slug,
      initial.name,
      initial.cityPackId,
      initial.subscriptionStartsAt,
      initial.subscriptionEndsAt,
      initial.settings,
    ]
  );

  const subscription = useMemo(
    () => ({
      subscriptionStartsAt: initial.subscriptionStartsAt,
      subscriptionEndsAt: initial.subscriptionEndsAt,
    }),
    [initial.subscriptionEndsAt, initial.subscriptionStartsAt]
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

  const ownerSections = useMemo(() => getOwnerSettingsSections(), []);

  const activeSectionId = useMemo((): OwnerSettingsSectionId => {
    const fromRoute = normalizeOwnerSettingsSectionId(String(routeParams.sectionId ?? ''));
    return fromRoute ?? 'identity';
  }, [routeParams.sectionId]);

  const activeSection = useMemo(
    () => ownerSections.find((entry) => entry.id === activeSectionId) ?? ownerSections[0],
    [activeSectionId, ownerSections]
  );

  const contactsModuleId = useMemo(() => {
    if (activeSectionId !== 'contacts') {
      return null;
    }
    return normalizeContactsAdminModuleId(searchParams.get(CONTACTS_ADMIN_MODULE_QUERY));
  }, [activeSectionId, searchParams]);

  const arrivalJourneyModuleId = useMemo(() => {
    if (activeSectionId !== 'arrival-journey') {
      return null;
    }
    return normalizeArrivalJourneyAdminModuleId(searchParams.get(CONTACTS_ADMIN_MODULE_QUERY));
  }, [activeSectionId, searchParams]);

  const guestAppModuleId = useMemo(() => {
    if (activeSectionId !== 'guest-app') {
      return null;
    }
    return normalizeGuestAppAdminModuleId(searchParams.get(CONTACTS_ADMIN_MODULE_QUERY));
  }, [activeSectionId, searchParams]);

  const setContactsModule = useCallback(
    (moduleId: ContactsAdminModuleId | null) => {
      const params = new URLSearchParams(searchParams.toString());
      params.delete('saved');
      if (moduleId) {
        params.set(CONTACTS_ADMIN_MODULE_QUERY, moduleId);
      } else {
        params.delete(CONTACTS_ADMIN_MODULE_QUERY);
      }
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname);
    },
    [pathname, router, searchParams]
  );

  const setArrivalJourneyModule = useCallback(
    (moduleId: ArrivalJourneyAdminModuleId | null) => {
      const params = new URLSearchParams(searchParams.toString());
      params.delete('saved');
      if (moduleId) {
        params.set(CONTACTS_ADMIN_MODULE_QUERY, moduleId);
      } else {
        params.delete(CONTACTS_ADMIN_MODULE_QUERY);
      }
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname);
    },
    [pathname, router, searchParams]
  );

  const setGuestAppModule = useCallback(
    (moduleId: GuestAppAdminModuleId | null) => {
      const params = new URLSearchParams(searchParams.toString());
      params.delete('saved');
      if (moduleId) {
        params.set(CONTACTS_ADMIN_MODULE_QUERY, moduleId);
      } else {
        params.delete(CONTACTS_ADMIN_MODULE_QUERY);
      }
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname);
    },
    [pathname, router, searchParams]
  );

  const settingsDrillDownModuleScrollSkipRef = useRef(true);

  const activeSettingsDrillDownModuleId =
    activeSectionId === 'contacts'
      ? contactsModuleId
      : activeSectionId === 'arrival-journey'
        ? arrivalJourneyModuleId
        : activeSectionId === 'guest-app'
          ? guestAppModuleId
          : null;

  useEffect(() => {
    if (
      activeSectionId !== 'contacts' &&
      activeSectionId !== 'arrival-journey' &&
      activeSectionId !== 'guest-app'
    ) {
      settingsDrillDownModuleScrollSkipRef.current = true;
      return;
    }
    if (settingsDrillDownModuleScrollSkipRef.current) {
      settingsDrillDownModuleScrollSkipRef.current = false;
      return;
    }
    const frame = requestAnimationFrame(() => {
      scrollTenantSettingsPanelIntoView(stickyOffsetRef.current);
    });
    return () => cancelAnimationFrame(frame);
  }, [activeSectionId, activeSettingsDrillDownModuleId]);

  useEffect(() => {
    if (
      activeSectionId === 'contacts' ||
      activeSectionId === 'arrival-journey' ||
      activeSectionId === 'guest-app'
    ) {
      return;
    }
    if (!searchParams.get(CONTACTS_ADMIN_MODULE_QUERY)) {
      return;
    }
    router.replace(stripSettingsModuleFromUrl(pathname, searchParams.toString()));
  }, [activeSectionId, pathname, router, searchParams]);

  const mergedSettings = useMemo(
    () => mergeDraftSettings(initial.settings ?? {}, draft),
    [initial.settings, draft]
  );

  const hasUnsavedChanges = useMemo(
    () =>
      tenantFormHasUnsavedChanges({
        baseline: formBaseline,
        identity,
        subscription,
        draft,
        receptionDeskPinInput,
      }),
    [formBaseline, identity, subscription, draft, receptionDeskPinInput]
  );

  const resetFormToBaseline = useCallback(() => {
    clearDraft();
    setIdentity({
      slug: formBaseline.slug,
      name: formBaseline.name,
      cityPackId: formBaseline.cityPackId,
    });
    setReceptionDeskPinInput('');
    clearReceptionDeskPinInputs(formRef.current);
    resetDirty();
  }, [clearDraft, formBaseline, resetDirty]);

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

  const navInputLive = readinessInput;

  const navigateToSection = useCallback(
    (
      sectionId: AdminSectionId,
      href?: string,
      settingsModule?: ContactsAdminModuleId | ArrivalJourneyAdminModuleId | GuestAppAdminModuleId
    ) => {
      if (sectionId === 'subscription') {
        return;
      }
      let target =
        href ?? ownerSettingsSectionPath(locale, sectionId as OwnerSettingsSectionId);
      if (sectionId === 'contacts' && settingsModule) {
        const moduleId = normalizeContactsAdminModuleId(settingsModule);
        if (moduleId) {
          target = appendContactsModuleToUrl(target, moduleId);
        }
      } else if (sectionId === 'arrival-journey' && settingsModule) {
        const moduleId = normalizeArrivalJourneyAdminModuleId(settingsModule);
        if (moduleId) {
          target = appendSettingsModuleToUrl(target, moduleId);
        }
      } else if (sectionId === 'guest-app' && settingsModule) {
        const moduleId = normalizeGuestAppAdminModuleId(settingsModule);
        if (moduleId) {
          target = appendSettingsModuleToUrl(target, moduleId);
        }
      }
      if (hasUnsavedChanges) {
        setPendingSectionNav({ sectionId, href: target });
        return;
      }
      router.push(target);
    },
    [hasUnsavedChanges, locale, router]
  );

  const handleStayOnSection = useCallback(() => {
    setPendingSectionNav(null);
  }, []);

  const handleKeepEditingElsewhere = useCallback(() => {
    if (!pendingSectionNav) {
      return;
    }
    router.push(pendingSectionNav.href);
    setPendingSectionNav(null);
  }, [pendingSectionNav, router]);

  const handleDiscardAndNavigate = useCallback(() => {
    if (!pendingSectionNav) {
      return;
    }
    const target = pendingSectionNav.href;
    resetFormToBaseline();
    setPendingSectionNav(null);
    router.push(target);
  }, [pendingSectionNav, resetFormToBaseline, router]);

  const unsavedNavLabels = useMemo(
    () => ({
      title: tUnsavedNav('title'),
      description: tUnsavedNav('description'),
      stay: tUnsavedNav('stay'),
      keepEditingElsewhere: tUnsavedNav('keepEditingElsewhere'),
      discardChanges: tUnsavedNav('discardChanges'),
    }),
    [tUnsavedNav]
  );

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    const raw = window.location.hash.replace(/^#/, '');
    const fromHash = normalizeOwnerSettingsSectionId(raw);
    if (!fromHash) {
      return;
    }
    router.replace(ownerSettingsSectionPath(locale, fromHash));
  }, [locale, router]);

  useLayoutEffect(() => {
    const syncStickyOffset = () => {
      const footerHeight = stickyFooterRef.current?.getBoundingClientRect().height ?? 0;
      const offset = 72 + footerHeight / 2;
      stickyOffsetRef.current = offset;
      formRef.current?.style.setProperty('--admin-sticky-offset', `${offset}px`);
    };

    syncStickyOffset();
    const footerEl = stickyFooterRef.current;
    const observer = footerEl ? new ResizeObserver(syncStickyOffset) : null;
    if (footerEl && observer) {
      observer.observe(footerEl);
    }
    window.addEventListener('resize', syncStickyOffset);
    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', syncStickyOffset);
    };
  }, [canEditSettings]);

  useEffect(() => {
    if (!justSaved || saveToastHandledRef.current) {
      return;
    }

    saveToastHandledRef.current = true;
    clearDraft();
    setReceptionDeskPinInput('');
    clearReceptionDeskPinInputs(formRef.current);
    resetDirty();
    router.replace(pathname);

    const gate = resolveGuestPathGate(guestPathInput);
    if (gate.ready) {
      setToast({ variant: 'success', message: t('toast.savedReady') });
      return;
    }

    const setup = getTenantSetupSummaries(readinessInput);
    const configGaps = setup.config.incompleteItems;

    if (configGaps.length === 0) {
      setToast({ variant: 'success', message: t('toast.saved') });
      return;
    }

    setToast({
      variant: 'warning',
      message: t('toast.savedIncomplete', { count: configGaps.length }),
      actionLabel: t('toast.viewChecklist'),
    });

    const firstGap = configGaps[0];
    if (firstGap?.sectionId && firstGap.sectionId !== 'subscription') {
      navigateToSection(firstGap.sectionId as AdminSectionId);
    }
  }, [clearDraft, guestPathInput, justSaved, navigateToSection, pathname, readinessInput, resetDirty, router, t]);

  useEffect(() => {
    const error = searchParams.get('error');
    if (!error) {
      return;
    }

    if (error === 'read_only') {
      setToast({ variant: 'warning', message: t('toast.readOnly') });
    } else if (error === 'save') {
      setToast({ variant: 'warning', message: t('toast.saveFailed') });
    }
  }, [searchParams, t]);

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
        navigateToSection(adminSectionIdForSaveBlock(block.code), undefined, 'reception-desk');
        return;
      }
      if (block.code === 'guest_extra_price') {
        navigateToSection(adminSectionIdForSaveBlock(block.code));
      }
    },
    [canEditSettings, navigateToSection, mergedSettings]
  );

  const fieldsDisabled = !canEditSettings;
  const sectionStatus = getAdminSectionStatus(activeSectionId, navInputLive);
  const sectionProgress = getAdminSectionGuestProgress(activeSectionId, readinessInput);
  const sectionProgressLabel = sectionProgress
    ? formatAdminSectionGuestProgress(sectionProgress)
    : null;

  const settingsPanelInDetail =
    (activeSectionId === 'contacts' && contactsModuleId !== null) ||
    (activeSectionId === 'arrival-journey' && arrivalJourneyModuleId !== null) ||
    (activeSectionId === 'guest-app' && guestAppModuleId !== null);

  const settingsDrillDownModuleLabel =
    activeSectionId === 'contacts' && contactsModuleId
      ? getContactsAdminModuleLabel(contactsModuleId)
      : activeSectionId === 'arrival-journey' && arrivalJourneyModuleId
        ? getArrivalJourneyAdminModuleLabel(arrivalJourneyModuleId)
        : activeSectionId === 'guest-app' && guestAppModuleId
          ? getGuestAppAdminModuleLabel(guestAppModuleId)
          : '';

  const handleSettingsDrillDownBack = useCallback(() => {
    if (activeSectionId === 'contacts') {
      setContactsModule(null);
      return;
    }
    if (activeSectionId === 'arrival-journey') {
      setArrivalJourneyModule(null);
      return;
    }
    if (activeSectionId === 'guest-app') {
      setGuestAppModule(null);
    }
  }, [activeSectionId, setArrivalJourneyModule, setContactsModule, setGuestAppModule]);

  const handleReceptionDeskPinInput = useCallback((event: React.FormEvent<HTMLFormElement>) => {
    const target = event.target;
    if (target instanceof HTMLInputElement && target.name === 'receptionDeskPin') {
      setReceptionDeskPinInput(target.value);
    }
  }, []);

  return (
    <>
      <TenantUnsavedSectionDialog
        open={pendingSectionNav !== null}
        labels={unsavedNavLabels}
        onStay={handleStayOnSection}
        onKeepEditingElsewhere={handleKeepEditingElsewhere}
        onDiscardChanges={handleDiscardAndNavigate}
      />
      <form
      ref={formRef}
      action={saveOwnerTenantSettingsAction}
      className="relative space-y-6 pb-24"
      noValidate
      onSubmit={handleFormSubmit}
      onInput={canEditSettings ? handleReceptionDeskPinInput : undefined}
    >
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="returnTo" value="settings" />
      <input type="hidden" name="originalSlug" value={initial.slug} />
      <input type="hidden" name="slug" value={identity.slug} />
      <input type="hidden" name="name" value={identity.name} />
      <input type="hidden" name="cityPackId" value={identity.cityPackId} />
      <input type="hidden" name="settingsSection" value={activeSectionId} />

      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">{t('title')}</h1>
        <p className="text-sm text-muted-foreground">
          {t('subtitle')}{' '}
          <Link
            href={`/${locale}/setup`}
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            {t('backToSetup')}
          </Link>
        </p>
      </div>

      {toast ? (
        <AdminToast
          variant={toast.variant}
          message={toast.message}
          actionLabel={toast.actionLabel}
          onAction={
            toast.actionLabel
              ? () => {
                  const target = document.getElementById('tenant-readiness');
                  if (target) {
                    scrollToSectionTarget(target, stickyOffsetRef.current);
                  }
                }
              : undefined
          }
          onDismiss={() => setToast(null)}
        />
      ) : null}

      <TenantReadinessChecklist
        readinessInput={readinessInput}
        guestPathInput={guestPathInput}
        onJumpToSection={navigateToSection}
      />

      <div className="grid gap-8 lg:grid-cols-[240px_minmax(0,1fr)]">
        <aside className="lg:sticky lg:top-[var(--admin-sticky-offset,6rem)] lg:self-start">
          <TenantSettingsNav
            tenantSlug={identity.slug}
            navInputLive={navInputLive}
            readinessInput={readinessInput}
            isDirty={hasUnsavedChanges}
            onNavigate={navigateToSection}
            sectionFilter={(id) => id !== 'subscription'}
            buildSectionHref={(sectionId) =>
              ownerSettingsSectionPath(locale, sectionId as OwnerSettingsSectionId)
            }
          />
        </aside>

        <div className="flex min-w-0 flex-col gap-2">
          {settingsPanelInDetail ? (
            <AdminSettingsPanelBreadcrumbs
              sectionLabel={activeSection.label}
              moduleLabel={settingsDrillDownModuleLabel}
              onBackToHub={handleSettingsDrillDownBack}
              backAriaLabel={`Back to ${activeSection.label}`}
            />
          ) : null}

          <div
            id={TENANT_SETTINGS_PANEL_ID}
            className={`min-w-0 rounded-xl border bg-background px-4 pb-5 pt-4 ${fieldsDisabled ? 'pointer-events-none opacity-60' : ''}`}
            style={{ scrollMarginTop: 'var(--admin-sticky-offset, 6rem)' }}
          >
            {!settingsPanelInDetail ? (
              <header className="mb-4 border-b pb-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 space-y-1">
                    <h2 className="text-sm font-semibold">{activeSection.label}</h2>
                    <p className="text-xs text-muted-foreground">{activeSection.description}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {sectionProgressLabel ? (
                      <span className="text-[10px] font-medium text-muted-foreground">
                        {sectionProgressLabel}
                      </span>
                    ) : null}
                    <AdminSectionStatusBadge status={sectionStatus} />
                  </div>
                </div>
              </header>
            ) : null}
            <TenantAdminSectionPanel
              key={activeSectionId}
            surface="owner"
            sectionId={activeSectionId}
            initialSettings={initial.settings}
            identity={identity}
            originalSlug={initial.slug}
            subscription={subscription}
            onSubscriptionChange={() => {}}
            readinessInput={readinessInput}
            onIdentityChange={setIdentity}
            onJumpToSection={navigateToSection}
            cityPackOptions={cityPackOptions}
            cityPackGateSnapshot={cityPackGateSnapshot}
            cityPackContentsById={cityPackContentsById}
            mergedSettings={mergedSettings}
            readOnly={fieldsDisabled}
            locale={locale}
            contactsModuleId={contactsModuleId}
              onContactsModuleChange={setContactsModule}
            arrivalJourneyModuleId={arrivalJourneyModuleId}
            onArrivalJourneyModuleChange={setArrivalJourneyModule}
            guestAppModuleId={guestAppModuleId}
            onGuestAppModuleChange={setGuestAppModule}
            />
          </div>
        </div>
      </div>

      <TenantFormHiddenPayload
        subscriptionStartsAt={subscription.subscriptionStartsAt}
        subscriptionEndsAt={subscription.subscriptionEndsAt}
        mergedSettings={mergedSettings}
        roomMapEnabled={draft.roomMapEnabled ?? isRoomMapModuleEnabled(mergedSettings)}
      />

      {canEditSettings ? (
        <div
          ref={stickyFooterRef}
          className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/80"
        >
          <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              {hasUnsavedChanges ? t('unsavedChanges') : t('allChangesSaved')}
            </p>
            <button
              type="submit"
              className="inline-flex min-h-11 items-center justify-center rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              {t('save')}
            </button>
          </div>
        </div>
      ) : null}
    </form>
    </>
  );
}
