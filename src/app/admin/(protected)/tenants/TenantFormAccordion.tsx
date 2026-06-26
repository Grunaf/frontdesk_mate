'use client';

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { ChevronDown } from 'lucide-react';
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
import { LAUNCH_STEP_ORDER } from './launch/launchSteps';
import { LaunchSetupWizard } from './launch/LaunchSetupWizard';
import { cn } from '@/shared/lib/utils';
import { BookingEngineFields } from './BookingEngineFields';
import {
  ADMIN_SECTIONS,
  getAdminSectionHint,
  getAdminSectionStatus,
  getDefaultOpenSections,
  type AdminSectionId,
} from './lib/adminSections';
import {
  formatAdminSectionGuestProgress,
  getAdminSectionGuestProgress,
} from './lib/resolveAdminSectionProgress';
import { validateTenantFormBeforeSave } from './lib/validateTenantFormBeforeSave';
import { ArrivalJourneyFields } from './sections/ArrivalJourneyFields';
import { ContactsFields } from './sections/ContactsFields';
import { GuestAppFields } from './sections/GuestAppFields';
import { IdentityFields } from './sections/IdentityFields';
import { LandingFields } from './sections/LandingFields';
import { SubscriptionFields, resolveSubscriptionLifecycleStatus } from './sections/SubscriptionFields';
import { WifiFields } from './sections/WifiFields';
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

interface TenantFormAccordionProps {
  originalSlug: string;
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

function SectionPanel({
  sectionId,
  initial,
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
}: {
  sectionId: AdminSectionId;
  initial: TenantFormAccordionProps['initial'];
  identity: IdentityState;
  originalSlug: string;
  subscription: SubscriptionState;
  onSubscriptionChange: (patch: Partial<SubscriptionState>) => void;
  readinessInput: TenantReadinessInput;
  onIdentityChange: (next: IdentityState) => void;
  onJumpToSection: (sectionId: AdminSectionId) => void;
  cityPackOptions: CityPackSelectOption[];
  cityPackGateSnapshot: CityPackGateSnapshot;
  cityPackContentsById: Record<string, CityPackContent>;
}) {
  const s = initial.settings;

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
          onChange={onIdentityChange}
          cityPackContent={cityPackContentsById[identity.cityPackId]}
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
          settings={s}
          readinessInput={readinessInput}
          onJumpToSection={onJumpToSection}
        />
      );
    case 'booking':
      return <BookingEngineFields settings={s} readinessInput={readinessInput} />;
    case 'arrival-journey':
      return (
        <ArrivalJourneyFields
          settings={s}
          cityPackId={identity.cityPackId}
          cityPackLabel={cityPackOptions.find((pack) => pack.id === identity.cityPackId)?.label}
          cityPackGateSnapshot={cityPackGateSnapshot}
          cityPackContent={cityPackContentsById[identity.cityPackId]}
          readinessInput={readinessInput}
        />
      );
    case 'guest-app':
      return (
        <GuestAppFields
          settings={s}
          cityPackId={identity.cityPackId}
          cityPackGateSnapshot={cityPackGateSnapshot}
          readinessInput={readinessInput}
          onJumpToSection={onJumpToSection}
        />
      );
    case 'wifi':
      return <WifiFields settings={s} readinessInput={readinessInput} />;
    case 'contacts':
      return <ContactsFields settings={s} readinessInput={readinessInput} />;
  }
}

function scrollToSectionTarget(target: HTMLElement, stickyOffset: number) {
  const top = target.getBoundingClientRect().top + window.scrollY - stickyOffset;
  window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
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
  justSaved = false,
  cityPackOptions,
  cityPackGateSnapshot,
  cityPackContentsById,
  initial,
}: TenantFormAccordionProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { draft, updateDraft, isDirty, markDirty, resetDirty } = useTenantFormDraft();

  const formRef = useRef<HTMLFormElement>(null);
  const archiveFormRef = useRef<HTMLFormElement>(null);
  const archiveValueRef = useRef<HTMLInputElement>(null);
  const stickyBarRef = useRef<HTMLDivElement>(null);
  const sectionRefs = useRef<Partial<Record<AdminSectionId, HTMLDivElement | null>>>({});
  const pendingScrollRef = useRef<AdminSectionId | null>(null);
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

  const guestPathGate = useMemo(
    () => resolveGuestPathGate(guestPathInput),
    [guestPathInput]
  );

  const storageSlug = identity.slug.trim() || originalSlug || 'new';
  const storedMode = useMemo(
    () => readStoredAdminTenantMode(storageSlug),
    [storageSlug]
  );
  const queryMode = useMemo(
    () => readAdminModeFromSearchParams(searchParams),
    [searchParams]
  );

  const [adminMode, setAdminMode] = useState<AdminTenantMode>(() =>
    resolveDefaultAdminTenantMode({
      isNewTenant: !originalSlug,
      guestPathReady: guestPathGate.ready,
      storedMode: queryMode ?? storedMode,
    })
  );

  const [launchStep, setLaunchStep] = useState<LaunchStepId>(() =>
    resolveFirstIncompleteLaunchStep(guestPathInput, LAUNCH_STEP_ORDER)
  );

  useEffect(() => {
    writeStoredAdminTenantMode(storageSlug, adminMode);
  }, [adminMode, storageSlug]);

  const handleAdminModeChange = useCallback((mode: AdminTenantMode) => {
    setAdminMode(mode);
    if (mode === 'launch') {
      setLaunchStep(resolveFirstIncompleteLaunchStep(guestPathInput, LAUNCH_STEP_ORDER));
    }
  }, [guestPathInput]);

  const handleBookingPathChange = useCallback(
    (path: LaunchBookingPath) => {
      updateDraft({ launchBookingPath: path });
    },
    [updateDraft]
  );

  const navInputLive = readinessInput;

  const defaultOpen = useMemo(() => getDefaultOpenSections(navInputLive), [navInputLive]);
  const [openSections, setOpenSections] = useState<string[]>(defaultOpen);
  const [activeNav, setActiveNav] = useState<AdminSectionId>(defaultOpen[0] ?? 'identity');

  const jumpToSection = useCallback((sectionId: AdminSectionId) => {
    setActiveNav(sectionId);
    pendingScrollRef.current = sectionId;

    const isAlreadyOpen = openSections.length === 1 && openSections[0] === sectionId;
    if (isAlreadyOpen) {
      const target = sectionRefs.current[sectionId];
      if (target) {
        scrollToSectionTarget(target, stickyOffsetRef.current);
      }
      pendingScrollRef.current = null;
      return;
    }

    setOpenSections([sectionId]);
  }, [openSections]);

  const handleJumpToAdvancedSection = useCallback(
    (sectionId: AdminSectionId) => {
      setAdminMode('advanced');
      jumpToSection(sectionId);
    },
    [jumpToSection]
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
    const sectionId = pendingScrollRef.current;
    if (!sectionId) {
      return;
    }

    if (!openSections.includes(sectionId)) {
      pendingScrollRef.current = null;
      return;
    }

    const target = sectionRefs.current[sectionId];
    if (!target) {
      pendingScrollRef.current = null;
      return;
    }

    const offset = stickyOffsetRef.current;
    let done = false;
    let raf2 = 0;

    const runScroll = () => {
      if (done) return;
      done = true;
      scrollToSectionTarget(target, offset);
      pendingScrollRef.current = null;
    };

    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(runScroll);
    });
    const fallback = window.setTimeout(runScroll, 260);

    return () => {
      done = true;
      cancelAnimationFrame(raf1);
      if (raf2) cancelAnimationFrame(raf2);
      window.clearTimeout(fallback);
      pendingScrollRef.current = null;
    };
  }, [openSections]);

  useEffect(() => {
    if (!justSaved || saveToastHandledRef.current) {
      return;
    }

    saveToastHandledRef.current = true;
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
        setActiveNav(firstGap.sectionId as AdminSectionId);
        pendingScrollRef.current = firstGap.sectionId as AdminSectionId;
        setOpenSections([firstGap.sectionId as AdminSectionId]);
      }
      return;
    }

    setToast({
      variant: 'warning',
      message: `Saved — config complete, ${moduleGaps.length} module${moduleGaps.length === 1 ? '' : 's'} not live`,
      actionLabel: 'View checklist',
    });

    setActiveNav('guest-app');
    pendingScrollRef.current = 'guest-app';
    setOpenSections(['guest-app']);
  }, [justSaved, pathname, readinessInput, guestPathInput, adminMode, router, resetDirty]);

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
      const block = validateTenantFormBeforeSave({
        subscriptionStartsAt: subscription.subscriptionStartsAt,
        subscriptionEndsAt: subscription.subscriptionEndsAt,
        mergedSettings,
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
          jumpToSection('subscription');
        }
        return;
      }

      if (adminMode === 'launch') {
        setLaunchStep('rules-wifi');
      } else {
        jumpToSection('guest-app');
      }
    },
    [
      subscription.subscriptionStartsAt,
      subscription.subscriptionEndsAt,
      mergedSettings,
      adminMode,
      jumpToSection,
    ]
  );

  return (
    <>
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
        onInput={markDirty}
      >
      <input type="hidden" name="originalSlug" value={originalSlug} />
      <input type="hidden" name="slug" value={identity.slug} />
      <input type="hidden" name="name" value={identity.name} />
      <input type="hidden" name="cityPackId" value={identity.cityPackId} />
      <TenantFormHiddenPayload
        subscriptionStartsAt={subscription.subscriptionStartsAt}
        subscriptionEndsAt={subscription.subscriptionEndsAt}
        mergedSettings={mergedSettings}
        roomMapEnabled={draft.roomMapEnabled ?? isRoomMapModuleEnabled(mergedSettings)}
      />

      {toast ? (
        <AdminToast
          variant={toast.variant}
          message={toast.message}
          actionLabel={toast.actionLabel}
          onAction={
            toast.actionLabel
              ? () => {
                  if (toast.actionLabel === 'Continue setup') {
                    setAdminMode('launch');
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
            jumpToSection('subscription');
          }
        }}
        onScrollToChecklist={() => scrollToChecklist(stickyOffsetRef.current)}
        onJumpToGuestModules={() => {
          if (adminMode === 'launch') {
            setLaunchStep('room-map');
          } else {
            jumpToSection('guest-app');
          }
        }}
        onArchiveToggle={handleArchiveToggle}
        isDirty={isDirty}
      />

      {adminMode === 'advanced' ? (
        <TenantReadinessChecklist
          readinessInput={readinessInput}
          guestPathInput={guestPathInput}
          onJumpToSection={jumpToSection}
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
            markDirty();
            setSubscription((current) => ({ ...current, ...patch }));
          }}
          onIdentityChange={(next) => {
            markDirty();
            setIdentity(next);
          }}
          onJumpToAdvancedSection={handleJumpToAdvancedSection}
          settings={initial.settings}
          lifecycleStatus={lifecycleStatus}
          cityPackOptions={cityPackOptions}
          cityPackGateSnapshot={cityPackGateSnapshot}
          cityPackContentsById={cityPackContentsById}
        />
      ) : (
      <div className="grid gap-8 lg:grid-cols-[240px_minmax(0,1fr)]">
        <aside className="lg:sticky lg:top-[var(--admin-sticky-offset,5.5rem)] lg:self-start">
          <nav className="space-y-1 rounded-xl border bg-background p-2" aria-label="Settings sections">
            <p className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Sections
            </p>
            {ADMIN_SECTIONS.map((section) => {
              const status = getAdminSectionStatus(section.id, navInputLive);
              const hint = getAdminSectionHint(section.id, navInputLive);
              const progress = getAdminSectionGuestProgress(section.id, readinessInput);
              const progressLabel = progress ? formatAdminSectionGuestProgress(progress) : null;

              return (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => jumpToSection(section.id)}
                  className={cn(
                    'w-full rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-muted/60',
                    activeNav === section.id && 'bg-muted'
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium">{section.label}</span>
                    <div className="flex shrink-0 items-center gap-1.5">
                      {progressLabel ? (
                        <span className="text-[10px] font-medium text-muted-foreground">{progressLabel}</span>
                      ) : null}
                      <AdminSectionStatusBadge status={status} />
                    </div>
                  </div>
                  {hint ? (
                    <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-muted-foreground">{hint}</p>
                  ) : null}
                </button>
              );
            })}
          </nav>
        </aside>

        <div className="min-w-0 rounded-xl border bg-background">
          {ADMIN_SECTIONS.map((section) => {
            const isOpen = openSections.includes(section.id);
            const status = getAdminSectionStatus(section.id, navInputLive);
            const progress = getAdminSectionGuestProgress(section.id, readinessInput);
            const progressLabel = progress ? formatAdminSectionGuestProgress(progress) : null;

            return (
              <div
                key={section.id}
                ref={(node) => {
                  sectionRefs.current[section.id] = node;
                }}
                className="scroll-mt-[var(--admin-sticky-offset,5.5rem)] border-b last:border-b-0"
              >
                <button
                  type="button"
                  aria-expanded={isOpen}
                  onClick={() => {
                    pendingScrollRef.current = null;
                    setActiveNav(section.id);
                    setOpenSections((current) =>
                      current.includes(section.id)
                        ? current.filter((id) => id !== section.id)
                        : [...current, section.id]
                    );
                  }}
                  className="flex w-full items-start justify-between gap-3 px-4 py-4 text-left hover:bg-muted/30"
                >
                  <span className="flex flex-1 flex-col items-start gap-0.5 pr-2">
                    <span className="flex w-full items-center justify-between gap-3 text-sm font-semibold">
                      <span>{section.label}</span>
                      <span className="flex items-center gap-2">
                        {progressLabel ? (
                          <span className="text-[10px] font-medium text-muted-foreground">{progressLabel}</span>
                        ) : null}
                        <AdminSectionStatusBadge status={status} />
                      </span>
                    </span>
                    <span className="text-xs font-normal text-muted-foreground">{section.description}</span>
                  </span>
                  <ChevronDown
                    className={cn(
                      'mt-0.5 size-4 shrink-0 text-muted-foreground transition-transform',
                      isOpen && 'rotate-180'
                    )}
                  />
                </button>

                <div
                  className={cn(
                    'grid transition-[grid-template-rows] duration-200 ease-out',
                    isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
                  )}
                  aria-hidden={!isOpen}
                >
                  <div className="min-h-0 overflow-hidden">
                    <div className="px-4 pb-5 pt-1">
                      <SectionPanel
                        sectionId={section.id}
                        initial={initial}
                        identity={identity}
                        originalSlug={originalSlug}
                        subscription={subscription}
                        onSubscriptionChange={(patch) => {
                          markDirty();
                          setSubscription((current) => ({ ...current, ...patch }));
                        }}
                        readinessInput={readinessInput}
                        onIdentityChange={(next) => {
                          markDirty();
                          setIdentity(next);
                        }}
                        onJumpToSection={jumpToSection}
                        cityPackOptions={cityPackOptions}
                        cityPackGateSnapshot={cityPackGateSnapshot}
                        cityPackContentsById={cityPackContentsById}
                      />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      )}
    </form>
    </>
  );
}
