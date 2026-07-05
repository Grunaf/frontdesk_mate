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
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { ChevronDown } from 'lucide-react';
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
  getAdminSectionHint,
  getAdminSectionStatus,
  getDefaultOpenSections,
  normalizeAdminSectionId,
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
import { saveOwnerTenantSettingsAction } from '@/features/owner-setup/api/saveOwnerTenantSettingsAction';
import { validateOwnerTenantFormBeforeSave } from '@/features/owner-setup/lib/validateOwnerTenantFormBeforeSave';
import { useOwnerShell } from '@/features/owner-shell';
import { TenantAdminSectionPanel } from '@/features/tenant-admin-sections';
import { cn } from '@/shared/lib/utils';
import { getOwnerSettingsSections } from '../lib/ownerSettingsSections';

interface OwnerSettingsCoordinatorProps {
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

function scrollToSectionTarget(target: HTMLElement, stickyOffset: number) {
  const top = target.getBoundingClientRect().top + window.scrollY - stickyOffset;
  window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
}

export function OwnerSettingsCoordinator(props: OwnerSettingsCoordinatorProps) {
  return <OwnerSettingsCoordinatorInner {...props} />;
}

function OwnerSettingsCoordinatorInner({
  locale,
  lifecycleStatus: shellLifecycleStatus,
  justSaved = false,
  cityPackOptions,
  cityPackGateSnapshot,
  cityPackContentsById,
  initial,
}: OwnerSettingsCoordinatorProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { canEditSettings } = useOwnerShell();
  const t = useTranslations('pages.owner.settings');
  const { draft, markDirty, resetDirty, isDirty } = useTenantFormDraft();

  const formRef = useRef<HTMLFormElement>(null);
  const stickyFooterRef = useRef<HTMLDivElement>(null);
  const sectionRefs = useRef<Partial<Record<AdminSectionId, HTMLDivElement | null>>>({});
  const pendingScrollRef = useRef<AdminSectionId | null>(null);
  const stickyOffsetRef = useRef(96);
  const saveToastHandledRef = useRef(false);
  const hashHandledRef = useRef(false);

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

  const navInputLive = readinessInput;
  const ownerSections = useMemo(() => getOwnerSettingsSections(), []);

  const defaultOpen = useMemo(
    () =>
      getDefaultOpenSections(navInputLive).filter((id) => id !== 'subscription') as AdminSectionId[],
    [navInputLive]
  );

  const [openSections, setOpenSections] = useState<AdminSectionId[]>(
    defaultOpen.length > 0 ? defaultOpen : ['identity']
  );
  const [activeNav, setActiveNav] = useState<AdminSectionId>(defaultOpen[0] ?? 'identity');

  const jumpToSection = useCallback(
    (sectionId: AdminSectionId) => {
      if (sectionId === 'subscription') {
        return;
      }
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
    },
    [openSections]
  );

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
    if (hashHandledRef.current) {
      return;
    }
    const raw = typeof window !== 'undefined' ? window.location.hash.replace(/^#/, '') : '';
    const sectionId = normalizeAdminSectionId(raw);
    if (!sectionId || sectionId === 'subscription') {
      hashHandledRef.current = true;
      return;
    }
    hashHandledRef.current = true;
    jumpToSection(sectionId);
  }, [jumpToSection]);

  useEffect(() => {
    const onHashChange = () => {
      const sectionId = normalizeAdminSectionId(window.location.hash.replace(/^#/, ''));
      if (sectionId && sectionId !== 'subscription') {
        jumpToSection(sectionId);
      }
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, [jumpToSection]);

  useEffect(() => {
    if (!justSaved || saveToastHandledRef.current) {
      return;
    }

    saveToastHandledRef.current = true;
    resetDirty();
    router.replace(`/${locale}/settings`);

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
      jumpToSection(firstGap.sectionId as AdminSectionId);
    }
  }, [guestPathInput, justSaved, jumpToSection, locale, readinessInput, resetDirty, router, t]);

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
        jumpToSection('contacts');
        return;
      }

      if (block.code === 'guest_extra_price') {
        jumpToSection('guest-app');
      }
    },
    [canEditSettings, jumpToSection, mergedSettings]
  );

  const fieldsDisabled = !canEditSettings;

  return (
    <form
      ref={formRef}
      action={saveOwnerTenantSettingsAction}
      className="relative space-y-6 pb-24"
      noValidate
      onSubmit={handleFormSubmit}
      onInput={canEditSettings ? markDirty : undefined}
    >
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="returnTo" value="settings" />
      <input type="hidden" name="originalSlug" value={initial.slug} />
      <input type="hidden" name="slug" value={identity.slug} />
      <input type="hidden" name="name" value={identity.name} />
      <input type="hidden" name="cityPackId" value={identity.cityPackId} />

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
        onJumpToSection={jumpToSection}
      />

      <div
        className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1"
        role="tablist"
        aria-label={t('sectionChipsLabel')}
      >
        {ownerSections.map((section) => {
          const status = getAdminSectionStatus(section.id, navInputLive);
          return (
            <button
              key={section.id}
              type="button"
              role="tab"
              aria-selected={activeNav === section.id}
              onClick={() => jumpToSection(section.id)}
              className={cn(
                'inline-flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                activeNav === section.id
                  ? 'border-primary bg-primary/10 text-foreground'
                  : 'border-border bg-background text-muted-foreground hover:bg-muted/60'
              )}
            >
              {section.label}
              <AdminSectionStatusBadge status={status} />
            </button>
          );
        })}
      </div>

      <div className="min-w-0 rounded-xl border bg-background">
        {ownerSections.map((section) => {
          const isOpen = openSections.includes(section.id);
          const status = getAdminSectionStatus(section.id, navInputLive);
          const hint = getAdminSectionHint(section.id, navInputLive);
          const progress = getAdminSectionGuestProgress(section.id, readinessInput);
          const progressLabel = progress ? formatAdminSectionGuestProgress(progress) : null;

          return (
            <div
              key={section.id}
              ref={(node) => {
                sectionRefs.current[section.id] = node;
              }}
              className="scroll-mt-[var(--admin-sticky-offset,6rem)] border-b last:border-b-0"
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
                        <span className="text-[10px] font-medium text-muted-foreground">
                          {progressLabel}
                        </span>
                      ) : null}
                      <AdminSectionStatusBadge status={status} />
                    </span>
                  </span>
                  <span className="text-xs font-normal text-muted-foreground">{section.description}</span>
                  {hint && !isOpen ? (
                    <span className="text-[11px] text-muted-foreground">{hint}</span>
                  ) : null}
                </span>
                <ChevronDown
                  className={cn(
                    'mt-0.5 size-4 shrink-0 text-muted-foreground transition-transform',
                    isOpen && 'rotate-180'
                  )}
                />
              </button>

              {isOpen ? (
                <div
                  className={cn('px-4 pb-5 pt-1', fieldsDisabled && 'pointer-events-none opacity-60')}
                >
                  <TenantAdminSectionPanel
                    surface="owner"
                    sectionId={section.id}
                    initialSettings={initial.settings}
                    identity={identity}
                    originalSlug={initial.slug}
                    subscription={subscription}
                    onSubscriptionChange={() => {}}
                    readinessInput={readinessInput}
                    onIdentityChange={(next) => {
                      markDirty();
                      setIdentity(next);
                    }}
                    onJumpToSection={jumpToSection}
                    cityPackOptions={cityPackOptions}
                    cityPackGateSnapshot={cityPackGateSnapshot}
                    cityPackContentsById={cityPackContentsById}
                    mergedSettings={mergedSettings}
                    readOnly={fieldsDisabled}
                    locale={locale}
                  />
                </div>
              ) : null}
            </div>
          );
        })}
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
              {isDirty ? t('unsavedChanges') : t('allChangesSaved')}
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
  );
}
