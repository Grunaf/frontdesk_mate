'use client';

import {
  addNights,
  countAccessNights,
  defaultWalkInDates,
  formatAccessNightsLabel,
  isValidAccessRange,
  todayUtcDate,
} from '../lib/guestAccessDates';
import { Button, Input, Label } from '@/shared/ui';

interface GuestAccessDateRangeProps {
  checkInDate: string;
  checkOutDate: string;
  onChange: (next: { checkInDate: string; checkOutDate: string }) => void;
}

export function GuestAccessDateRange({
  checkInDate,
  checkOutDate,
  onChange,
}: GuestAccessDateRangeProps) {
  const nights = countAccessNights(checkInDate, checkOutDate);
  const rangeValid = isValidAccessRange(checkInDate, checkOutDate);

  const handleFromChange = (nextFrom: string) => {
    if (!nextFrom) return;
    const nextNights = Math.max(1, countAccessNights(checkInDate, checkOutDate) || 1);
    onChange({
      checkInDate: nextFrom,
      checkOutDate: addNights(nextFrom, nextNights),
    });
  };

  const handleUntilChange = (nextUntil: string) => {
    if (!nextUntil) return;
    onChange({ checkInDate, checkOutDate: nextUntil });
  };

  const applyPreset = (presetNights: number) => {
    const from = checkInDate || todayUtcDate();
    onChange({
      checkInDate: from,
      checkOutDate: addNights(from, presetNights),
    });
  };

  const applyTonight = () => {
    const { checkInDate: from, checkOutDate: until } = defaultWalkInDates();
    onChange({ checkInDate: from, checkOutDate: until });
  };

  return (
    <div className="space-y-3 sm:col-span-2">
      <div className="grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <div className="space-y-1.5">
          <Label htmlFor="check-in-date">Valid from</Label>
          <Input
            id="check-in-date"
            type="date"
            value={checkInDate}
            onChange={(event) => handleFromChange(event.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="check-out-date">Valid until</Label>
          <Input
            id="check-out-date"
            type="date"
            value={checkOutDate}
            onChange={(event) => handleUntilChange(event.target.value)}
          />
        </div>

        <p className="text-sm text-muted-foreground sm:pb-2">
          {rangeValid ? formatAccessNightsLabel(nights) : '—'}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" variant="outline" onClick={applyTonight}>
          Tonight
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={() => applyPreset(3)}>
          3 nights
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={() => applyPreset(7)}>
          7 nights
        </Button>
      </div>

      {!rangeValid ? (
        <p className="text-xs text-destructive">Valid until must be on or after valid from.</p>
      ) : (
        <p className="text-xs text-muted-foreground">
          Valid until is the guest&apos;s last night — app access works through checkout day.
        </p>
      )}
    </div>
  );
}
