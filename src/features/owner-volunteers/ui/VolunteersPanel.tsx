'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import type { VolunteerListItem, VolunteerSource } from '@/entities/volunteer';
import { formatVolunteerStaffLoginInstructions } from '@/entities/volunteer';
import type { GuestStayRecordWithLink } from '@/entities/guest-stay';
import { addStayCalendarDays, todayStayCalendarDay } from '@/entities/guest-stay';
import { getTenantPublicUrl } from '@/shared/config';
import {
  BedRoomGroupedSelect,
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  type BedRoomOptionGroup,
} from '@/shared/ui';

import {
  archiveVolunteerStayAction,
  createVolunteerStayAction,
} from '../api/volunteerActions';
import {
  filterBedsByRoomAvailable,
  listUnavailableVolunteerBedIds,
} from '../lib/volunteerBeds';

export type VolunteersPanelLabels = {
  title: string;
  subtitle: string;
  empty: string;
  addTitle: string;
  name: string;
  source: string;
  sourceDirect: string;
  sourceWorldpacker: string;
  checkIn: string;
  checkOut: string;
  bed: string;
  bedUnavailable: string;
  submit: string;
  archive: string;
  archiveConfirm: string;
  listTitle: string;
  openInPlan: string;
  staffAccess: string;
  setupAccessHint: string;
  instructionsCopied: string;
  instructionsCopyFailed: string;
  errors: {
    unauthorized: string;
    forbidden: string;
    invalid_name: string;
    invalid_source: string;
    bed_not_found: string;
    access_overlap: string;
    tenant_not_found: string;
    db_unavailable: string;
    not_found: string;
    already_archived: string;
    invalid_operational_day: string;
    staff_limit_reached: string;
    login_taken: string;
    unknown: string;
  };
};

type VolunteersPanelProps = {
  locale: string;
  tenantSlug: string;
  canEdit: boolean;
  volunteers: VolunteerListItem[];
  planStays: GuestStayRecordWithLink[];
  bedsByRoom: BedRoomOptionGroup[];
  operationalDate: string;
  staffAccessHref: string;
  labels: VolunteersPanelLabels;
};

function defaultDates() {
  const checkInDate = todayStayCalendarDay();
  return {
    checkInDate,
    checkOutDate: addStayCalendarDays(checkInDate, 7),
  };
}

function firstBedId(groups: BedRoomOptionGroup[]): string {
  return groups[0]?.beds[0]?.bedId ?? '';
}

export function VolunteersPanel({
  locale,
  tenantSlug,
  canEdit,
  volunteers,
  planStays,
  bedsByRoom,
  operationalDate,
  staffAccessHref,
  labels,
}: VolunteersPanelProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const initialDates = defaultDates();
  const [displayName, setDisplayName] = useState('');
  const [source, setSource] = useState<VolunteerSource>('direct');
  const [checkInDate, setCheckInDate] = useState(initialDates.checkInDate);
  const [checkOutDate, setCheckOutDate] = useState(initialDates.checkOutDate);
  const [bedId, setBedId] = useState(() => firstBedId(bedsByRoom));
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const allBedIds = useMemo(
    () => bedsByRoom.flatMap((group) => group.beds.map((bed) => bed.bedId)),
    [bedsByRoom]
  );

  const unavailableBedIds = useMemo(
    () =>
      listUnavailableVolunteerBedIds({
        planStays,
        bedIds: allBedIds,
        checkInDate,
        checkOutDate,
      }),
    [allBedIds, checkInDate, checkOutDate, planStays]
  );

  const availableBedsByRoom = useMemo(
    () => filterBedsByRoomAvailable(bedsByRoom, unavailableBedIds),
    [bedsByRoom, unavailableBedIds]
  );

  useEffect(() => {
    const availableIds = availableBedsByRoom.flatMap((group) =>
      group.beds.map((bed) => bed.bedId)
    );
    if (bedId && availableIds.includes(bedId)) return;
    setBedId(firstBedId(availableBedsByRoom));
  }, [availableBedsByRoom, bedId]);

  const rangeValid = Boolean(checkInDate && checkOutDate && checkInDate < checkOutDate);
  const hasAvailableBeds = availableBedsByRoom.length > 0;

  const resolveError = (code: string) =>
    labels.errors[code as keyof VolunteersPanelLabels['errors']] ?? labels.errors.unknown;

  const receptionLoginUrl = getTenantPublicUrl(tenantSlug, 'reception', locale, '/login');

  const handleSubmit = () => {
    if (!canEdit || !rangeValid || !bedId || unavailableBedIds.has(bedId)) return;
    setError(null);
    setStatusMessage(null);
    startTransition(async () => {
      const result = await createVolunteerStayAction({
        locale,
        displayName,
        source,
        bedId,
        checkInDate,
        checkOutDate,
      });
      if (!result.ok) {
        setError(resolveError(result.error));
        return;
      }

      const instructions = formatVolunteerStaffLoginInstructions({
        receptionLoginUrl,
        login: result.staffLogin,
        pin: result.staffPin,
      });
      try {
        await navigator.clipboard.writeText(instructions);
        setStatusMessage(labels.instructionsCopied);
      } catch {
        setStatusMessage(labels.instructionsCopyFailed);
      }

      setDisplayName('');
      const nextDates = defaultDates();
      setCheckInDate(nextDates.checkInDate);
      setCheckOutDate(nextDates.checkOutDate);
      router.refresh();
    });
  };

  const handleArchive = (volunteerId: string) => {
    if (!canEdit) return;
    if (!window.confirm(labels.archiveConfirm)) return;
    setError(null);
    startTransition(async () => {
      const result = await archiveVolunteerStayAction({
        locale,
        volunteerId,
        operationalDate,
      });
      if (!result.ok) {
        setError(resolveError(result.error));
        return;
      }
      router.refresh();
    });
  };

  const planStayUrl = (reservationId: string) =>
    getTenantPublicUrl(tenantSlug, 'reception', locale, `/?tab=plan&stayId=${reservationId}`);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">{labels.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{labels.subtitle}</p>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {statusMessage ? <p className="text-sm text-muted-foreground">{statusMessage}</p> : null}

      <section className="space-y-4 rounded-md border border-border p-4">
        <h2 className="text-sm font-semibold">{labels.addTitle}</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="volunteer-name">{labels.name}</Label>
            <Input
              id="volunteer-name"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              disabled={!canEdit || isPending}
            />
          </div>

          <div className="space-y-1.5">
            <Label>{labels.source}</Label>
            <Select
              value={source}
              onValueChange={(value) => setSource(value as VolunteerSource)}
              disabled={!canEdit || isPending}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="direct">{labels.sourceDirect}</SelectItem>
                <SelectItem value="worldpacker">{labels.sourceWorldpacker}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="sm:col-span-2">
            <BedRoomGroupedSelect
              id="volunteer-bed-id"
              label={labels.bed}
              bedId={bedId}
              onBedIdChange={setBedId}
              bedsByRoom={availableBedsByRoom}
              emptyLabel={labels.bedUnavailable}
              disabled={!canEdit || isPending || !hasAvailableBeds}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="volunteer-check-in">{labels.checkIn}</Label>
            <Input
              id="volunteer-check-in"
              type="date"
              value={checkInDate}
              onChange={(event) => setCheckInDate(event.target.value)}
              disabled={!canEdit || isPending}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="volunteer-check-out">{labels.checkOut}</Label>
            <Input
              id="volunteer-check-out"
              type="date"
              value={checkOutDate}
              onChange={(event) => setCheckOutDate(event.target.value)}
              disabled={!canEdit || isPending}
            />
          </div>
        </div>

        <Button
          type="button"
          disabled={
            !canEdit ||
            isPending ||
            !rangeValid ||
            !displayName.trim() ||
            !bedId ||
            unavailableBedIds.has(bedId) ||
            !hasAvailableBeds
          }
          onClick={handleSubmit}
        >
          {labels.submit}
        </Button>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold">{labels.listTitle}</h2>
        {volunteers.length === 0 ? (
          <p className="text-sm text-muted-foreground">{labels.empty}</p>
        ) : (
          <ul className="divide-y divide-border rounded-md border border-border">
            {volunteers.map((volunteer) => (
              <li
                key={volunteer.id}
                className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="space-y-1 text-sm">
                  <p className="font-medium">{volunteer.display_name}</p>
                  <p className="text-muted-foreground">
                    {volunteer.check_in_date} → {volunteer.check_out_date}
                  </p>
                  {volunteer.reception_user_id ? (
                    <p className="text-muted-foreground">{labels.setupAccessHint}</p>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="outline" size="sm" asChild>
                    <a
                      href={planStayUrl(volunteer.reservation_id)}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {labels.openInPlan}
                    </a>
                  </Button>
                  <Button type="button" variant="outline" size="sm" asChild>
                    <Link href={staffAccessHref}>{labels.staffAccess}</Link>
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    disabled={!canEdit || isPending}
                    onClick={() => handleArchive(volunteer.id)}
                  >
                    {labels.archive}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
