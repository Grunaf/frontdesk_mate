'use client';

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useParams, usePathname, useRouter, useSearchParams } from 'next/navigation';
import { saveTenantAction, setTenantArchiveAction } from '../../actions';
import type { CityPackContent, CityPackGateSnapshot, CityPackSelectOption } from '@/entities/city-pack';
import type { CityPackId, TenantSettings } from '@/entities/tenant';
import { isRoomMapModuleEnabled } from '@/entities/tenant/lib/resolveGuestModuleToggles';
import {
  getTenantSetupSummaries,
  type TenantReadinessInput,
} from '@/entities/tenant/lib/resolveTenantReadiness';
import {
  inferLaunchBookingPath,
  resolveFirstIncompleteLaunchStep,
  resolveGuestPathGate,
  type LaunchBookingPath,
  type LaunchStepId,
} from '@/entities/tenant/lib/resolveGuestPathReadiness';
import {
  readAdminModeFromSearchParams,
  readStoredAdminTenantMode,
  resolveDefaultAdminTenantMode,
  writeStoredAdminTenantMode,
  type AdminTenantMode,
} from './launch/adminTenantMode';
import { LAUNCH_STEP_ORDER } from '@/features/tenant-launch-setup';
import { LaunchSetupWizard } from '@/features/tenant-launch-setup';
import { TenantAdminSectionPanel } from '@/features/tenant-admin-sections';
import {
  ADMIN_SECTIONS,
  adminSectionIdForSaveBlock,
  adminTenantSettingsSectionPath,
  getAdminSectionStatus,
  normalizeAdminSectionId,
  type AdminSectionId,
} from './lib/adminSections';
import {
  appendContactsModuleToUrl,
  CONTACTS_ADMIN_MODULE_QUERY,
  getContactsAdminModuleLabel,
  normalizeContactsAdminModuleId,
  stripSettingsModuleFromUrl,
  type ContactsAdminModuleId,
} from './lib/contactsAdminSubsections';
import {
  getArrivalJourneyAdminModuleLabel,
  normalizeArrivalJourneyAdminModuleId,
  type ArrivalJourneyAdminModuleId,
} from './lib/arrivalJourneyAdminSubsections';
import {
  getGuestAppAdminModuleLabel,
  normalizeGuestAppAdminModuleId,
  type GuestAppAdminModuleId,
} from './lib/guestAppAdminSubsections';
import { appendSettingsModuleToUrl } from './lib/tenantSettingsModuleUrl';
import {
  formatAdminSectionGuestProgress,
  getAdminSectionGuestProgress,
} from './lib/resolveAdminSectionProgress';
import { validateTenantFormBeforeSave } from './lib/validateTenantFormBeforeSave';
import {
  clearReceptionDeskPinInputs,
  tenantFormHasUnsavedChanges,
} from './lib/tenantFormHasUnsavedChanges';
import { resolveSubscriptionLifecycleStatus } from './sections/SubscriptionFields';
import { AdminSectionStatusBadge } from './ui/AdminField';
import { AdminToast } from './ui/AdminToast';
import {
  mergeDraftSettings,
  TenantFormDraftProvider,
  useTenantFormDraft,
} from './ui/TenantFormDraftContext';
import { TenantReadinessChecklist } from './ui/TenantReadinessChecklist';
import { TenantCommandBar } from './ui/TenantCommandBar';
import { TenantFormHiddenPayload } from './ui/TenantFormHiddenPayload';
import { TenantSettingsNav } from './ui/TenantSettingsNav';
import { AdminSettingsPanelBreadcrumbs } from './ui/AdminSettingsPanelBreadcrumbs';
import { TenantUnsavedSectionDialog } from './ui/TenantUnsavedSectionDialog';
import {
  scrollTenantSettingsPanelIntoView,
  scrollToSectionTarget,
  TENANT_SETTINGS_PANEL_ID,
} from './lib/scrollTenantSettingsPanelIntoView';

interface TenantFormAccordionProps {
  originalSlug: string;
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
    archived: boolean;
  };
}

interface IdentityState {
  slug: string;
  name: string;
  cityPackId: CityPackId;
}

interface SubscriptionState {
  subscriptionStartsAt: string;
  subscriptionEndsAt: string;
}

function scrollToChecklist(stickyOffset: number) {
  const target = document.getElementById('tenant-readiness');
  if (target) {
    scrollToSectionTarget(target, stickyOffset);
  }
}

export function TenantFormAccordion(props: TenantFormAccordionProps) {
  return (
    <TenantFormDraftProvider>
      <TenantFormAccordionInner {...props} />
    </TenantFormDraftProvider>
  );
}

function TenantFormAccordionInner({
  originalSlug,
  cityPackOptions,
  cityPackGateSnapshot,
  cityPackContentsById,
  initial,
}: TenantFormAccordionProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const routeParams = useParams();
  const justSaved = searchParams.get('saved') === '1';
  const { draft, updateDraft, clearDraft, resetDirty } = useTenantFormDraft();

  const formRef = useRef<HTMLFormElement>(null);
  const archiveFormRef = useRef<HTMLFormElement>(null);
  const archiveValueRef = useRef<HTMLInputElement>(null);
  const stickyBarRef = useRef<HTMLDivElement>(null);
  const stickyOffsetRef = useRef(88);
  const saveToastHandledRef = useRef(false);

  const [toast, setToast] = useState<{
    variant: 'success' | 'warning';
    message: string;
    actionLabel?: string;
  } | null>(null);

  const [subscription, setSubscription] = useState<SubscriptionState>({
    subscriptionStartsAt: initial.subscriptionStartsAt,
    subscriptionEndsAt: initial.subscriptionEndsAt,
  });

  const lifecycleStatus = useMemo(
    () =>
      resolveSubscriptionLifecycleStatus({
        archived: initial.archived,
        subscriptionStartsAt: subscription.subscriptionStartsAt,
        subscriptionEndsAt: subscription.subscriptionEndsAt,
      }),
    [initial.archived, subscription.subscriptionStartsAt, subscription.subscriptionEndsAt]
  );

  const [identity, setIdentity] = useState<IdentityState>({
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

  const navTenantSlug = identity.slug.trim() || originalSlug || 'new';

  const activeSectionId = useMemo(() => {
    const fromRoute = normalizeAdminSectionId(String(routeParams.sectionId ?? ''));
    if (fromRoute) {
      return fromRoute;
    }
    return 'identity' as AdminSectionId;
  }, [routeParams.sectionId]);

  const activeSection = useMemo(
    () => ADMIN_SECTIONS.find((entry) => entry.id === activeSectionId) ?? ADMIN_SECTIONS[0],
    [activeSectionId]
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
    setSubscription({
      subscriptionStartsAt: formBaseline.subscriptionStartsAt,
      subscriptionEndsAt: formBaseline.subscriptionEndsAt,
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

  const setupSummaries = useMemo(
    () => getTenantSetupSummaries(readinessInput),
    [readinessInput]
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

  const storageSlug = identity.slug.trim() || originalSlug || 'new';
  const queryMode = useMemo(
    () => readAdminModeFromSearchParams(searchParams),
    [searchParams]
  );

  const [adminMode, setAdminMode] = useState<AdminTenantMode>(() =>
    resolveDefaultAdminTenantMode({
      isNewTenant: !originalSlug,
      guestPathReady: resolveGuestPathGate(guestPathInput).ready,
      storedMode: queryMode,
    })
  );

  const [launchStep, setLaunchStep] = useState<LaunchStepId>(() =>
    resolveFirstIncompleteLaunchStep(guestPathInput, LAUNCH_STEP_ORDER)
  );

  useEffect(() => {
    if (queryMode) {
      return;
    }
    const stored = readStoredAdminTenantMode(storageSlug);
    if (stored) {
      setAdminMode(stored);
    }
  }, [queryMode, storageSlug]);

  const applyAdminMode = useCallback(
    (mode: AdminTenantMode) => {
      setAdminMode(mode);
      writeStoredAdminTenantMode(storageSlug, mode);
    },
    [storageSlug]
  );

  const handleAdminModeChange = useCallback(
    (mode: AdminTenantMode) => {
      applyAdminMode(mode);
      if (mode === 'launch') {
        setLaunchStep(resolveFirstIncompleteLaunchStep(guestPathInput, LAUNCH_STEP_ORDER));
      }
    },
    [applyAdminMode, guestPathInput]
  );

  const handleBookingPathChange = useCallback(
    (path: LaunchBookingPath) => {
      updateDraft({ launchBookingPath: path });
    },
    [updateDraft]
  );

  const navInputLive = readinessInput;

  const navigateToSection = useCallback(
    (
      sectionId: AdminSectionId,
      href?: string,
      settingsModule?: ContactsAdminModuleId | ArrivalJourneyAdminModuleId | GuestAppAdminModuleId
    ) => {
      let target =
        href ?? adminTenantSettingsSectionPath(navTenantSlug, sectionId);
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
    [hasUnsavedChanges, navTenantSlug, router]
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

  const handleJumpToAdvancedSection = useCallback(
    (sectionId: AdminSectionId) => {
      applyAdminMode('advanced');
      navigateToSection(sectionId);
    },
    [applyAdminMode, navigateToSection]
  );

  useLayoutEffect(() => {
    const syncStickyOffset = () => {
      const stickyHeight = stickyBarRef.current?.getBoundingClientRect().height ?? 72;
      stickyOffsetRef.current = stickyHeight + 16;
      formRef.current?.style.setProperty('--admin-sticky-offset', `${stickyOffsetRef.current}px`);
    };

    syncStickyOffset();
    const stickyEl = stickyBarRef.current;
    const observer = stickyEl ? new ResizeObserver(syncStickyOffset) : null;
    if (stickyEl && observer) {
      observer.observe(stickyEl);
    }
    window.addEventListener('resize', syncStickyOffset);
    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', syncStickyOffset);
    };
  }, []);

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
      setToast({ variant: 'success', message: 'Tenant saved — ready for guests' });
      setLaunchStep('preview');
      return;
    }

    if (adminMode === 'launch') {
      setToast({
        variant: 'warning',
        message: `Saved — ${gate.incompleteMust.length} guest-path must item${gate.incompleteMust.length === 1 ? '' : 's'} left`,
        actionLabel: 'Continue setup',
      });
      setLaunchStep(resolveFirstIncompleteLaunchStep(guestPathInput, LAUNCH_STEP_ORDER));
      return;
    }

    const setup = getTenantSetupSummaries(readinessInput);
    const configGaps = setup.config.incompleteItems;
    const moduleGaps = setup.modules.incompleteModules;

    if (configGaps.length === 0 && moduleGaps.length === 0) {
      setToast({ variant: 'success', message: 'Tenant saved' });
      return;
    }

    if (configGaps.length > 0) {
      setToast({
        variant: 'warning',
        message: `Saved — ${configGaps.length} config item${configGaps.length === 1 ? '' : 's'} still incomplete`,
        actionLabel: 'View checklist',
      });

      const firstGap = configGaps[0];
      if (firstGap?.sectionId) {
        navigateToSection(firstGap.sectionId as AdminSectionId);
      }
      return;
    }

    setToast({
      variant: 'warning',
      message: `Saved — config complete, ${moduleGaps.length} module${moduleGaps.length === 1 ? '' : 's'} not live`,
      actionLabel: 'View checklist',
    });

    navigateToSection('guest-app');
  }, [
    justSaved,
    pathname,
    readinessInput,
    guestPathInput,
    adminMode,
    router,
    clearDraft,
    resetDirty,
    navigateToSection,
  ]);

  const handleArchiveToggle = useCallback(() => {
    if (initial.archived) {
      if (
        window.confirm(
          'Restore this tenant? Landing and guest app will follow the subscription dates after restore.'
        )
      ) {
        if (archiveValueRef.current) {
          archiveValueRef.current.value = 'false';
        }
        archiveFormRef.current?.requestSubmit();
      }
      return;
    }

    const label = identity.name.trim() || identity.slug.trim() || 'this tenant';
    if (
      window.confirm(
        `Archive ${label}? Guest landing and app will go offline immediately.`
      )
    ) {
      if (archiveValueRef.current) {
        archiveValueRef.current.value = 'true';
      }
      archiveFormRef.current?.requestSubmit();
    }
  }, [identity.name, identity.slug, initial.archived]);

  const handleFormSubmit = useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      const formData = new FormData(event.currentTarget);
      const block = validateTenantFormBeforeSave({
        subscriptionStartsAt: subscription.subscriptionStartsAt,
        subscriptionEndsAt: subscription.subscriptionEndsAt,
        mergedSettings,
        receptionDeskPin: String(formData.get('receptionDeskPin') || ''),
      });

      if (!block) {
        return;
      }

      event.preventDefault();
      setToast({ variant: 'warning', message: block.message });

      if (block.code === 'subscription_dates') {
        if (adminMode === 'launch') {
          setLaunchStep('identity');
        } else {
          navigateToSection(adminSectionIdForSaveBlock(block.code));
        }
        return;
      }

      if (block.code === 'reception_desk_pin') {
        navigateToSection(adminSectionIdForSaveBlock(block.code), undefined, 'reception-desk');
        return;
      }

      if (adminMode === 'launch') {
        setLaunchStep('rules-wifi');
      } else {
        navigateToSection(adminSectionIdForSaveBlock(block.code));
      }
    },
    [
      subscription.subscriptionStartsAt,
      subscription.subscriptionEndsAt,
      mergedSettings,
      adminMode,
      navigateToSection,
    ]
  );

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
        onStay={handleStayOnSection}
        onKeepEditingElsewhere={handleKeepEditingElsewhere}
        onDiscardChanges={handleDiscardAndNavigate}
      />
      <form ref={archiveFormRef} action={setTenantArchiveAction} className="hidden">
        <input type="hidden" name="originalSlug" value={originalSlug} />
        <input type="hidden" name="slug" value={identity.slug} />
        <input type="hidden" name="archived" defaultValue="true" ref={archiveValueRef} />
      </form>

      <form
        ref={formRef}
        action={saveTenantAction}
        className="relative"
        noValidate
        onSubmit={handleFormSubmit}
        onInput={handleReceptionDeskPinInput}
      >
        <input type="hidden" name="originalSlug" value={originalSlug} />
        <input type="hidden" name="slug" value={identity.slug} />
        <input type="hidden" name="name" value={identity.name} />
        <input type="hidden" name="cityPackId" value={identity.cityPackId} />
        <input type="hidden" name="settingsSection" value={activeSectionId} />

        {justSaved ? (
          <p className="sr-only" aria-live="polite">
            Tenant saved
          </p>
        ) : null}

        {toast ? (
          <AdminToast
            variant={toast.variant}
            message={toast.message}
            actionLabel={toast.actionLabel}
            onAction={
              toast.actionLabel
                ? () => {
                    if (toast.actionLabel === 'Continue setup') {
                      applyAdminMode('launch');
                      setLaunchStep(
                        resolveFirstIncompleteLaunchStep(guestPathInput, LAUNCH_STEP_ORDER)
                      );
                      return;
                    }
                    scrollToChecklist(stickyOffsetRef.current);
                  }
                : undefined
            }
            onDismiss={() => setToast(null)}
          />
        ) : null}

        <TenantCommandBar
          barRef={stickyBarRef}
          displayName={identity.name}
          slug={identity.slug}
          lifecycleStatus={lifecycleStatus}
          subscriptionStartsAt={subscription.subscriptionStartsAt}
          subscriptionEndsAt={subscription.subscriptionEndsAt}
          archived={initial.archived}
          isNewTenant={!originalSlug}
          readinessInput={readinessInput}
          configComplete={setupSummaries.config.completeCount}
          configTotal={setupSummaries.config.totalCount}
          modulesLive={setupSummaries.modules.liveCount}
          modulesTracked={setupSummaries.modules.trackedCount}
          moduleGaps={setupSummaries.modules.gapCount}
          guestPathInput={guestPathInput}
          adminMode={adminMode}
          onAdminModeChange={handleAdminModeChange}
          onEditSubscription={() => {
            if (adminMode === 'launch') {
              setLaunchStep('identity');
            } else {
              navigateToSection('subscription');
            }
          }}
          onScrollToChecklist={() => scrollToChecklist(stickyOffsetRef.current)}
          onJumpToGuestModules={() => {
            if (adminMode === 'launch') {
              setLaunchStep('room-map');
            } else {
              navigateToSection('guest-app');
            }
          }}
          onArchiveToggle={handleArchiveToggle}
          isDirty={hasUnsavedChanges}
        />

        {adminMode === 'advanced' ? (
          <TenantReadinessChecklist
            readinessInput={readinessInput}
            guestPathInput={guestPathInput}
            onJumpToSection={navigateToSection}
          />
        ) : null}

        {adminMode === 'launch' ? (
          <LaunchSetupWizard
            stepId={launchStep}
            onStepChange={setLaunchStep}
            bookingPath={bookingPath}
            onBookingPathChange={handleBookingPathChange}
            guestPathInput={guestPathInput}
            readinessInput={readinessInput}
            identity={identity}
            originalSlug={originalSlug}
            subscription={subscription}
            onSubscriptionChange={(patch) => {
              setSubscription((current) => ({ ...current, ...patch }));
            }}
            onIdentityChange={setIdentity}
            onJumpToAdvancedSection={handleJumpToAdvancedSection}
            settings={mergedSettings}
            lifecycleStatus={lifecycleStatus}
            cityPackOptions={cityPackOptions}
            cityPackGateSnapshot={cityPackGateSnapshot}
            cityPackContentsById={cityPackContentsById}
          />
        ) : (
          <div className="grid w-full gap-8 lg:grid-cols-[240px_minmax(0,1fr)]">
            <aside className="min-w-0 shrink-0 lg:sticky lg:top-[var(--admin-sticky-offset,5.5rem)] lg:w-[240px] lg:self-start">
              <TenantSettingsNav
                tenantSlug={navTenantSlug}
                navInputLive={navInputLive}
                readinessInput={readinessInput}
                isDirty={hasUnsavedChanges}
                onNavigate={navigateToSection}
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
                className="min-w-0 w-full overflow-x-hidden rounded-xl border bg-background px-4 pb-5 pt-4"
                style={{ scrollMarginTop: 'var(--admin-sticky-offset, 5.5rem)' }}
              >
                {!settingsPanelInDetail ? (
                  <header className="mb-4 border-b pb-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 space-y-1">
                        <h3 className="text-sm font-semibold">{activeSection.label}</h3>
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
                surface="platform"
                sectionId={activeSectionId}
                initialSettings={initial.settings}
                identity={identity}
                originalSlug={originalSlug}
                subscription={subscription}
                onSubscriptionChange={(patch) => {
                  setSubscription((current) => ({ ...current, ...patch }));
                }}
                readinessInput={readinessInput}
                onIdentityChange={setIdentity}
                onJumpToSection={navigateToSection}
                cityPackOptions={cityPackOptions}
                cityPackGateSnapshot={cityPackGateSnapshot}
                cityPackContentsById={cityPackContentsById}
                mergedSettings={mergedSettings}
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
        )}

        <TenantFormHiddenPayload
          subscriptionStartsAt={subscription.subscriptionStartsAt}
          subscriptionEndsAt={subscription.subscriptionEndsAt}
          mergedSettings={mergedSettings}
          roomMapEnabled={draft.roomMapEnabled ?? isRoomMapModuleEnabled(mergedSettings)}
        />
      </form>
    </>
  );
}
