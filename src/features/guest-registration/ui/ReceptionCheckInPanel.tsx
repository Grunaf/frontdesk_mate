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
  completeDeskCheckInAction,
  listActiveGuestStaysAction,
  reissueGuestStayAction,
  revokeGuestStayAction,
  updateGuestReservationAction,
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
import { ReceptionGuestStayDetail } from './ReceptionGuestStayDetail';
import { RevokeAccessDialog } from './RevokeAccessDialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui';

interface ReceptionCheckInPanelProps {
  tenantSlug: string;
  tenantName: string;
  settings?: TenantSettings;
  initialStays: GuestStayRecordWithLink[];
  initialOpenIssues: GuestIssueRecord[];
}

interface EditReservationDraft {
  stayId: string;
  guestName: string;
  bedId: string;
  checkInDate: string;
  checkOutDate: string;
  intent: 'changeDates' | 'moveBed';
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
  const [selectedStayId, setSelectedStayId] = useState<string | null>(null);
  const [stayPins, setStayPins] = useState<Record<string, string>>({});
  const [pendingRevokeStayId, setPendingRevokeStayId] = useState<string | null>(null);
  const [pendingReissueAccessStay, setPendingReissueAccessStay] =
    useState<GuestStayRecordWithLink | null>(null);
  const [markArrivedError, setMarkArrivedError] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<EditReservationDraft | null>(null);
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

  const selectedStay = useMemo(
    () => (selectedStayId ? stays.find((stay) => stay.id === selectedStayId) ?? null : null),
    [selectedStayId, stays]
  );

  const openStayDetail = useCallback((stayId: string) => {
    setMarkArrivedError(null);
    setSelectedStayId(stayId);
  }, []);

  const closeStayDetail = useCallback(() => {
    setSelectedStayId(null);
  }, []);

  const overlappingBedIds = useMemo(() => {
    const ids = new Set<string>();
    for (const bedId of bedOptions) {
      const overlaps = stays.some((stay) => {
        if (editDraft?.stayId === stay.id) return false;
        return stayOverlapsBedNightRange(stay, bedId, accessPeriod.checkInAt, accessPeriod.checkOutAt);
      });
      if (overlaps) ids.add(bedId);
    }
    return ids;
  }, [accessPeriod.checkInAt, accessPeriod.checkOutAt, bedOptions, editDraft?.stayId, stays]);

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
    if (editDraft) return;
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
      case 'already_revoked':
        return 'Access was revoked — cannot mark arrival.';
      case 'db_unavailable':
        return 'Database unavailable. Run migrations and check SUPABASE_SECRET_KEY.';
      case 'unknown':
        return 'Something went wrong. Try again or check the server logs.';
      default:
        return code;
    }
  };

  const clearEditDraft = () => {
    setEditDraft(null);
    setError(null);
    const nextDates = defaultWalkInDates();
    setMode('walk-in');
    setCheckInDate(nextDates.checkInDate);
    setCheckOutDate(nextDates.checkOutDate);
    setGuestName('');
    setBedId(pickDefaultBedId(bedOptions, overlappingBedIds));
  };

  const beginEditDraft = (
    stay: GuestStayRecordWithLink,
    intent: EditReservationDraft['intent']
  ) => {
    setEditDraft({
      stayId: stay.id,
      guestName: stay.guest_name ?? '',
      bedId: stay.bed_id,
      checkInDate: toDateInput(stay.check_in_at),
      checkOutDate: toDateInput(stay.check_out_at),
      intent,
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

    if (editDraft?.intent === 'moveBed' && bedId === editDraft.bedId) {
      setError('Choose a different bed to move this guest.');
      return;
    }

    startTransition(async () => {
      try {
        if (editDraft) {
          const result = await updateGuestReservationAction({
            tenantSlug,
            stayId: editDraft.stayId,
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

          setStays((current) =>
            current.map((stay) =>
              stay.id === result.stay.id
                ? {
                    ...result.stay,
                    magicLinkUrl: stay.magicLinkUrl,
                  }
                : stay
            )
          );
          openStayDetail(result.stay.id);
          clearEditDraft();
          return;
        }

        const result = await createGuestStayAction({
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

        setStays((current) => [stayWithLink, ...current]);
        openStayDetail(result.stay.id);
        setStayPins((current) => ({ ...current, [result.stay.id]: result.guestPin }));
        setGuestName('');
        const nextAvailable = availableBedIds.filter((id) => id !== bedId);
        setBedId(nextAvailable[0] ?? '');
      } catch {
        setError('Something went wrong. Try again or check the server logs.');
      }
    });
  };

  const handleReissueAccess = (stayId: string) => {
    setError(null);

    startTransition(async () => {
      const result = await reissueGuestStayAction({ tenantSlug, stayId });
      if (!result.ok) {
        setError(createErrorMessage(result.error));
        return;
      }

      const stayWithLink: GuestStayRecordWithLink = {
        ...result.stay,
        magicLinkUrl: result.magicLinkUrl,
      };

      setStays((current) =>
        current.map((stay) => (stay.id === stayId ? stayWithLink : stay))
      );
      openStayDetail(stayId);
      setStayPins((current) => ({ ...current, [stayId]: result.guestPin }));
      setPendingReissueAccessStay(null);
    });
  };

  const handleMarkArrived = ({ stayId, keyIssued }: { stayId: string; keyIssued: boolean }) => {
    setMarkArrivedError(null);

    startTransition(async () => {
      const result = await completeDeskCheckInAction({ tenantSlug, stayId, keyIssued });
      if (!result.ok) {
        setMarkArrivedError(createErrorMessage(result.error));
        return;
      }

      setStays((current) =>
        current.map((stay) =>
          stay.id === stayId
            ? {
                ...stay,
                desk_checked_in_at: result.stay.desk_checked_in_at,
                key_issued_at: result.stay.key_issued_at,
              }
            : stay
        )
      );
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
      if (selectedStayId === stayId) {
        closeStayDetail();
      }
      if (editDraft?.stayId === stayId) {
        clearEditDraft();
      }
      setPendingRevokeStayId(null);
    });
  };

  const openStayDetailFromRefSearch = (stayId: string) => {
    setIssuedAccessFilter('all');
    openStayDetail(stayId);
  };

  const handleSelectFreeNight = (nextBedId: string, nightDate: string) => {
    if (editDraft) return;
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
        open={pendingReissueAccessStay !== null}
        guestLabel={pendingReissueAccessStay?.guest_name ?? undefined}
        isPending={isPending}
        onCancel={() => setPendingReissueAccessStay(null)}
        onConfirm={() => {
          if (pendingReissueAccessStay) {
            handleReissueAccess(pendingReissueAccessStay.id);
          }
        }}
      />

      {selectedStay ? (
        <ReceptionGuestStayDetail
          open={selectedStay !== null}
          onClose={closeStayDetail}
          stay={selectedStay}
          stayPins={stayPins}
          isPending={isPending}
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
          onRevoke={(stayId) => {
            setPendingRevokeStayId(stayId);
          }}
          onChangeDates={(stay) => {
            closeStayDetail();
            beginEditDraft(stay, 'changeDates');
          }}
          onMoveBed={(stay) => {
            closeStayDetail();
            beginEditDraft(stay, 'moveBed');
          }}
          onReissueAccess={(stay) => {
            setPendingReissueAccessStay(stay);
          }}
          onMarkArrived={handleMarkArrived}
          markArrivedError={markArrivedError}
        />
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[minmax(280px,360px)_minmax(0,1fr)] lg:items-start">
        <aside
          ref={issueFormRef}
          className="rounded-xl border bg-card p-4 lg:sticky lg:top-4"
        >
          <IssueGuestAccessForm
            mode={mode}
            onModeChange={handleModeChange}
            modeLocked={Boolean(editDraft)}
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
            reissueGuestLabel={editDraft?.guestName}
            editIntent={editDraft?.intent}
            onCancelReissue={editDraft ? clearEditDraft : undefined}
            bedsAvailabilityHint={bedsAvailabilityHint}
            error={error}
            isPending={isPending}
            rangeValid={rangeValid}
            canSubmit={rangeValid && availableBedIds.length > 0 && Boolean(bedId)}
            isReissue={false}
            isEditingReservation={Boolean(editDraft)}
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
                onViewStay={openStayDetail}
              />
            </TabsContent>

            <TabsContent value="plan">
              <BedAccessCalendar
                embedded
                settings={tenantSettings}
                stays={stays}
                onViewStay={openStayDetail}
                onSelectFreeNight={handleSelectFreeNight}
              />
            </TabsContent>

            <TabsContent value="access">
              <IssuedAccessList
                stays={stays}
                filter={issuedAccessFilter}
                onFilterChange={setIssuedAccessFilter}
                onOpenStayDetail={openStayDetail}
                onFindStayByRef={openStayDetailFromRefSearch}
                revokeError={revokeError}
                resolveBedLabel={resolveBedLabel}
              />
            </TabsContent>

            <TabsContent value="issues">
              <IssuesList
                tenantSlug={tenantSlug}
                initialIssues={initialOpenIssues}
                onFocusStay={openStayDetail}
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
