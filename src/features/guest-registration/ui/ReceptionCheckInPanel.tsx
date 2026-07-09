'use client';

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react';
import type { GuestStayRecordWithLink } from '@/entities/guest-stay';
import type { GuestIssueRecord } from '@/entities/guest-issue';
import { stayOverlapsBedNightRange } from '@/entities/guest-stay/lib/guestAccessIntervals';
import { listGuestStayBedIds } from '@/entities/guest-stay';
import type { TenantSettings } from '@/entities/tenant';
import {
  resolveGuestAccessMessageTemplate,
  resolveGuestAccessPinMissingText,
  resolveTourismRegistrationRequired,
} from '@/entities/tenant';
import { isRoomMapModuleEnabled } from '@/entities/tenant/lib/resolveGuestModuleToggles';
import {
  createGuestStayAction,
  listActiveGuestStaysAction,
  reissueGuestStayAction,
  revokeGuestStayAction,
} from '../actions/receptionActions';
import {
  addNights,
  defaultWalkInDates,
  formatDisplayDate,
  type GuestAccessFormMode,
  type IssuedAccessFilter,
  isValidAccessRange,
} from '../lib/guestAccessDates';
import { resolveBedInventory, flattenBedInventory } from '../lib/resolveBedInventory';
import { resolveReceptionHubSnapshot } from '../lib/resolveReceptionHubSnapshot';
import { resolveGuestAccessPeriod } from '../lib/resolveGuestAccessPeriod';
import {
  formatReceptionDeskStats,
  resolveReceptionDeskStats,
} from '../lib/resolveReceptionDeskStats';
import { BedAccessCalendar } from './BedAccessCalendar';
import { IssueGuestAccessForm } from './IssueGuestAccessForm';
import { ReceptionHubView } from './ReceptionHubView';
import { IssuedAccessList } from './IssuedAccessList';
import { IssuesList } from './IssuesList';
import { ReissueAccessDialog } from './ReissueAccessDialog';
import { RevokeAccessDialog } from './RevokeAccessDialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui';

interface ReceptionCheckInPanelProps {
  tenantSlug: string;
  tenantName: string;
  settings?: TenantSettings;
  initialStays: GuestStayRecordWithLink[];
  initialOpenIssues: GuestIssueRecord[];
}

interface ReissueDraft {
  stayId: string;
  guestName: string;
  bedId: string;
  checkInDate: string;
  checkOutDate: string;
}

type DeskTab = 'desk' | 'plan' | 'access' | 'issues';

function pickDefaultBedId(bedOptions: string[], unavailableBedIds: Set<string>): string {
  return bedOptions.find((id) => !unavailableBedIds.has(id)) ?? bedOptions[0] ?? '';
}

function toDateInput(iso: string): string {
  return iso.slice(0, 10);
}

export function ReceptionCheckInPanel({
  tenantSlug,
  tenantName,
  settings,
  initialStays,
  initialOpenIssues,
}: ReceptionCheckInPanelProps) {
  const bedOptions = useMemo(() => listGuestStayBedIds(settings ?? {}), [settings]);
  const checkInTime = settings?.checkInTime ?? '14:00';
  const walkInDefaults = defaultWalkInDates();
  const issueFormRef = useRef<HTMLDivElement>(null);

  const [stays, setStays] = useState(initialStays);
  const [deskTab, setDeskTab] = useState<DeskTab>('desk');
  const [openIssueCount, setOpenIssueCount] = useState(initialOpenIssues.length);
  const [mode, setMode] = useState<GuestAccessFormMode>('walk-in');
  const [guestName, setGuestName] = useState('');
  const [checkInDate, setCheckInDate] = useState(walkInDefaults.checkInDate);
  const [checkOutDate, setCheckOutDate] = useState(walkInDefaults.checkOutDate);
  const [issuedAccessFilter, setIssuedAccessFilter] = useState<IssuedAccessFilter>('today');
  const [error, setError] = useState<string | null>(null);
  const [revokeError, setRevokeError] = useState<string | null>(null);
  const [expandedStayId, setExpandedStayId] = useState<string | null>(null);
  const [stayPins, setStayPins] = useState<Record<string, string>>({});
  const [pendingRevokeStayId, setPendingRevokeStayId] = useState<string | null>(null);
  const [pendingReissueStay, setPendingReissueStay] = useState<GuestStayRecordWithLink | null>(null);
  const [reissueDraft, setReissueDraft] = useState<ReissueDraft | null>(null);
  const [isPending, startTransition] = useTransition();

  const tenantSettings = settings ?? {};
  const omitBedFromGuestMessage = useMemo(
    () => isRoomMapModuleEnabled(tenantSettings),
    [tenantSettings]
  );
  const rangeValid = isValidAccessRange(checkInDate, checkOutDate);

  const accessPeriod = useMemo(
    () => resolveGuestAccessPeriod(checkInDate, checkOutDate, checkInTime),
    [checkInDate, checkOutDate, checkInTime]
  );

  const hubSnapshot = useMemo(
    () => resolveReceptionHubSnapshot(tenantSettings, stays),
    [tenantSettings, stays]
  );

  const inventory = useMemo(
    () =>
      resolveBedInventory(tenantSettings, stays, {
        nightDate: hubSnapshot.operational.operationalDate,
      }),
    [tenantSettings, stays, hubSnapshot.operational.operationalDate]
  );
  const guestAccessMessageTemplate = useMemo(
    () => resolveGuestAccessMessageTemplate(tenantSettings),
    [tenantSettings]
  );
  const guestAccessPinMissingText = useMemo(
    () => resolveGuestAccessPinMissingText(tenantSettings),
    [tenantSettings]
  );
  const tourismRegistrationRequired = useMemo(
    () => resolveTourismRegistrationRequired(tenantSettings),
    [tenantSettings]
  );
  const resolveBedLabel = useCallback(
    (bedId: string) => {
      const match = flattenBedInventory(inventory).find((entry) => entry.bedId === bedId);
      return match?.displayLabel ?? bedId;
    },
    [inventory]
  );
  const deskStats = useMemo(
    () => formatReceptionDeskStats(resolveReceptionDeskStats(tenantSettings, stays)),
    [tenantSettings, stays]
  );

  const overlappingBedIds = useMemo(() => {
    const ids = new Set<string>();
    for (const bedId of bedOptions) {
      const overlaps = stays.some((stay) => {
        if (reissueDraft?.stayId === stay.id) return false;
        return stayOverlapsBedNightRange(stay, bedId, accessPeriod.checkInAt, accessPeriod.checkOutAt);
      });
      if (overlaps) ids.add(bedId);
    }
    return ids;
  }, [accessPeriod.checkInAt, accessPeriod.checkOutAt, bedOptions, reissueDraft?.stayId, stays]);

  const bedsByRoom = useMemo(
    () =>
      inventory.roomGroups
        .map((group) => ({
          roomId: group.roomId,
          roomLabel: group.roomLabel,
          beds: group.beds
            .filter((entry) => !overlappingBedIds.has(entry.bedId))
            .map((entry) => ({ bedId: entry.bedId, displayLabel: entry.displayLabel })),
        }))
        .filter((group) => group.beds.length > 0),
    [inventory.roomGroups, overlappingBedIds]
  );

  const availableBedIds = useMemo(
    () => bedOptions.filter((id) => !overlappingBedIds.has(id)),
    [bedOptions, overlappingBedIds]
  );

  const [bedId, setBedId] = useState(() => pickDefaultBedId(bedOptions, overlappingBedIds));

  useEffect(() => {
    if (bedId && !overlappingBedIds.has(bedId)) return;
    setBedId(pickDefaultBedId(bedOptions, overlappingBedIds));
  }, [bedId, bedOptions, overlappingBedIds]);

  const handleModeChange = (nextMode: GuestAccessFormMode) => {
    if (reissueDraft) return;
    setMode(nextMode);
    if (nextMode === 'walk-in') {
      const nextDates = defaultWalkInDates();
      setCheckInDate(nextDates.checkInDate);
      setCheckOutDate(nextDates.checkOutDate);
    }
  };

  const refreshStays = useCallback(async () => {
    const updated = await listActiveGuestStaysAction(tenantSlug);
    setStays(updated);
    return updated;
  }, [tenantSlug]);

  const createErrorMessage = (code: string): string => {
    switch (code) {
      case 'unauthorized':
        return 'Session expired — sign in again at reception desk.';
      case 'access_overlap':
        return 'Another guest access overlaps these dates on this bed.';
      case 'bed_not_found':
        return 'Bed not found in room map configuration.';
      case 'tenant_not_found':
        return 'Hostel not found.';
      case 'not_found':
        return 'Access not found or already revoked.';
      case 'db_unavailable':
        return 'Database unavailable. Run migrations and check SUPABASE_SECRET_KEY.';
      case 'unknown':
        return 'Something went wrong. Try again or check the server logs.';
      default:
        return code;
    }
  };

  const clearReissueDraft = () => {
    setReissueDraft(null);
    setError(null);
    const nextDates = defaultWalkInDates();
    setMode('walk-in');
    setCheckInDate(nextDates.checkInDate);
    setCheckOutDate(nextDates.checkOutDate);
    setGuestName('');
    setBedId(pickDefaultBedId(bedOptions, overlappingBedIds));
  };

  const beginReissueDraft = (stay: GuestStayRecordWithLink) => {
    setReissueDraft({
      stayId: stay.id,
      guestName: stay.guest_name ?? '',
      bedId: stay.bed_id,
      checkInDate: toDateInput(stay.check_in_at),
      checkOutDate: toDateInput(stay.check_out_at),
    });
    setMode('custom');
    setGuestName(stay.guest_name ?? '');
    setCheckInDate(toDateInput(stay.check_in_at));
    setCheckOutDate(toDateInput(stay.check_out_at));
    setBedId(stay.bed_id);
    setError(null);
    issueFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };

  const handleSubmit = () => {
    setError(null);

    if (!rangeValid) {
      setError('Valid until must be on or after valid from.');
      return;
    }

    if (!bedId) {
      setError('Select a bed');
      return;
    }

    startTransition(async () => {
      try {
        const result = reissueDraft
          ? await reissueGuestStayAction({
              tenantSlug,
              stayId: reissueDraft.stayId,
              bedId,
              guestName: guestName.trim() || undefined,
              checkInDate,
              checkOutDate,
            })
          : await createGuestStayAction({
              tenantSlug,
              bedId,
              guestName: guestName.trim() || undefined,
              checkInDate,
              checkOutDate,
            });

        if (!result.ok) {
          setError(createErrorMessage(result.error));
          if (result.error === 'access_overlap') {
            await refreshStays();
          }
          return;
        }

        const stayWithLink: GuestStayRecordWithLink = {
          ...result.stay,
          magicLinkUrl: result.magicLinkUrl,
        };

        setStays((current) => {
          const withoutOld = reissueDraft
            ? current.filter((stay) => stay.id !== reissueDraft.stayId)
            : current;
          return [stayWithLink, ...withoutOld];
        });
        setExpandedStayId(result.stay.id);
        setDeskTab('access');
        setStayPins((current) => {
          const next = { ...current, [result.stay.id]: result.guestPin };
          if (reissueDraft) {
            delete next[reissueDraft.stayId];
          }
          return next;
        });

        if (reissueDraft) {
          clearReissueDraft();
        } else {
          setGuestName('');
          const nextAvailable = availableBedIds.filter((id) => id !== bedId);
          setBedId(nextAvailable[0] ?? '');
        }
      } catch {
        setError('Something went wrong. Try again or check the server logs.');
      }
    });
  };

  const handleRevoke = (stayId: string) => {
    setRevokeError(null);

    startTransition(async () => {
      const result = await revokeGuestStayAction({ tenantSlug, stayId });
      if (!result.ok) {
        setRevokeError(result.error);
        return;
      }

      setStays((current) => current.filter((stay) => stay.id !== stayId));
      setStayPins((current) => {
        const next = { ...current };
        delete next[stayId];
        return next;
      });
      if (expandedStayId === stayId) {
        setExpandedStayId(null);
      }
      if (reissueDraft?.stayId === stayId) {
        clearReissueDraft();
      }
      setPendingRevokeStayId(null);
    });
  };

  const focusStay = (stayId: string) => {
    setDeskTab('access');
    setExpandedStayId(stayId);
    requestAnimationFrame(() => {
      document.getElementById(`stay-${stayId}`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  };

  const focusStayFromAccessList = (stayId: string) => {
    setIssuedAccessFilter('all');
    focusStay(stayId);
  };

  const handleSelectFreeNight = (nextBedId: string, nightDate: string) => {
    if (reissueDraft) return;
    setMode('custom');
    setCheckInDate(nightDate);
    setCheckOutDate(addNights(nightDate, 1));
    setBedId(nextBedId);
    issueFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };

  const bedsAvailabilityHint = rangeValid
    ? availableBedIds.length === 0
      ? `No beds for ${formatDisplayDate(checkInDate)} – ${formatDisplayDate(checkOutDate)}`
      : `${availableBedIds.length} bed${availableBedIds.length === 1 ? '' : 's'} available for ${formatDisplayDate(checkInDate)} – ${formatDisplayDate(checkOutDate)}`
    : null;

  if (bedOptions.length === 0) {
    return (
      <p className="rounded-lg border border-dashed px-4 py-3 text-sm text-muted-foreground">
        Configure beds in Guest app modules before issuing guest access.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <header className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Reception desk</p>
          <h1 className="truncate text-xl font-semibold">{tenantName}</h1>
          <p className="text-xs text-muted-foreground">{deskStats}</p>
        </div>
        <form method="POST" action="/api/reception/logout">
          <button type="submit" className="text-sm text-muted-foreground hover:text-foreground">
            Sign out
          </button>
        </form>
      </header>

      <RevokeAccessDialog
        open={pendingRevokeStayId !== null}
        isPending={isPending}
        onKeep={() => setPendingRevokeStayId(null)}
        onConfirm={() => {
          if (pendingRevokeStayId) {
            handleRevoke(pendingRevokeStayId);
          }
        }}
      />

      <ReissueAccessDialog
        open={pendingReissueStay !== null}
        guestLabel={pendingReissueStay?.guest_name ?? undefined}
        isPending={isPending}
        onCancel={() => setPendingReissueStay(null)}
        onConfirm={() => {
          if (pendingReissueStay) {
            beginReissueDraft(pendingReissueStay);
            setPendingReissueStay(null);
          }
        }}
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(280px,360px)_minmax(0,1fr)] lg:items-start">
        <aside
          ref={issueFormRef}
          className="rounded-xl border bg-card p-4 lg:sticky lg:top-4"
        >
          <IssueGuestAccessForm
            mode={mode}
            onModeChange={handleModeChange}
            modeLocked={Boolean(reissueDraft)}
            guestName={guestName}
            onGuestNameChange={setGuestName}
            bedId={bedId}
            onBedIdChange={setBedId}
            bedsByRoom={bedsByRoom}
            checkInDate={checkInDate}
            checkOutDate={checkOutDate}
            onDatesChange={({ checkInDate: nextFrom, checkOutDate: nextUntil }) => {
              setCheckInDate(nextFrom);
              setCheckOutDate(nextUntil);
            }}
            reissueGuestLabel={reissueDraft?.guestName}
            onCancelReissue={reissueDraft ? clearReissueDraft : undefined}
            bedsAvailabilityHint={bedsAvailabilityHint}
            error={error}
            isPending={isPending}
            rangeValid={rangeValid}
            canSubmit={rangeValid && availableBedIds.length > 0 && Boolean(bedId)}
            isReissue={Boolean(reissueDraft)}
            onSubmit={handleSubmit}
          />
        </aside>

        <section className="min-w-0 rounded-xl border bg-card p-4">
          <Tabs value={deskTab} onValueChange={(value) => setDeskTab(value as DeskTab)}>
            <TabsList variant="line" className="mb-4 w-full justify-start">
              <TabsTrigger value="desk">Desk</TabsTrigger>
              <TabsTrigger value="plan">Plan</TabsTrigger>
              <TabsTrigger value="access">Access</TabsTrigger>
              <TabsTrigger value="issues">
                Issues{openIssueCount > 0 ? ` (${openIssueCount})` : ''}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="desk">
              <ReceptionHubView
                snapshot={hubSnapshot}
                resolveBedLabel={resolveBedLabel}
                onViewStay={focusStay}
              />
            </TabsContent>

            <TabsContent value="plan">
              <BedAccessCalendar
                embedded
                settings={tenantSettings}
                stays={stays}
                onViewStay={focusStay}
                onSelectFreeNight={handleSelectFreeNight}
              />
            </TabsContent>

            <TabsContent value="access">
              <IssuedAccessList
                stays={stays}
                filter={issuedAccessFilter}
                onFilterChange={setIssuedAccessFilter}
                expandedStayId={expandedStayId}
                onToggleExpanded={(stayId) =>
                  setExpandedStayId((current) => (current === stayId ? null : stayId))
                }
                onRevoke={(stayId) => setPendingRevokeStayId(stayId)}
                onChangeDates={(stay) => setPendingReissueStay(stay)}
                onFocusStay={focusStayFromAccessList}
                stayPins={stayPins}
                isPending={isPending}
                revokeError={revokeError}
                hostelName={tenantName}
                guestAccessMessageTemplate={guestAccessMessageTemplate}
                guestAccessPinMissingText={guestAccessPinMissingText}
                resolveBedLabel={resolveBedLabel}
                omitBedFromGuestMessage={omitBedFromGuestMessage}
                tourismRegistrationRequired={tourismRegistrationRequired}
                tenantSlug={tenantSlug}
                onTourismExportedAtChange={(stayId, tourismExportedAt) => {
                  setStays((current) =>
                    current.map((stay) =>
                      stay.id === stayId ? { ...stay, tourism_exported_at: tourismExportedAt } : stay
                    )
                  );
                }}
              />
            </TabsContent>

            <TabsContent value="issues">
              <IssuesList
                tenantSlug={tenantSlug}
                initialIssues={initialOpenIssues}
                onFocusStay={focusStay}
                isActive={deskTab === 'issues'}
                onOpenCountChange={setOpenIssueCount}
              />
            </TabsContent>
          </Tabs>
        </section>
      </div>
    </div>
  );
}
