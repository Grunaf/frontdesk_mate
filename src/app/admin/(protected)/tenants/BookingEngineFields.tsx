'use client';

import { useMemo, useState } from 'react';
import type { TenantSettings } from '@/entities/tenant';
import {
  BOOKING_PROVIDER_LABELS,
  isBookingProvider,
  readBookingSettings,
  type BookingProvider,
} from '@/entities/tenant';
import { hasLandingRooms } from '@/entities/tenant/lib/resolveLandingRooms';
import { isTenantFieldMissing, type TenantReadinessInput } from '@/entities/tenant/lib/resolveTenantReadiness';
import { AdminField } from './ui/AdminField';
import { AdminSectionAlert } from './ui/AdminSectionAlert';

interface BookingEngineFieldsProps {
  settings?: TenantSettings;
  readinessInput: TenantReadinessInput;
}

export function BookingEngineFields({ settings, readinessInput }: BookingEngineFieldsProps) {
  const initial = useMemo(() => readBookingSettings(settings ?? {}), [settings]);
  const [provider, setProvider] = useState<BookingProvider>(initial.provider);
  const hasLandingRoomCards = hasLandingRooms(settings ?? {});
  const engineMissing =
    provider !== 'none' &&
    isTenantFieldMissing('bookingEngineId', readinessInput);

  return (
    <div className="space-y-4">
      {provider === 'none' && hasLandingRoomCards ? (
        <AdminSectionAlert>
          Landing shows room cards without online booking. Enable a provider or guests must contact
          reception.
        </AdminSectionAlert>
      ) : null}

      {engineMissing && hasLandingRoomCards ? (
        <AdminSectionAlert>
          Book buttons stay hidden until property ID or custom URL is set.
        </AdminSectionAlert>
      ) : null}

      <label className="block space-y-1.5">
        <span className="text-sm font-medium">Provider</span>
        <span className="block text-xs text-muted-foreground">
          Choose whether guests can book online and which PMS powers it.
        </span>
        <select
          name="bookingProvider"
          value={provider}
          onChange={(event) => {
            const next = event.target.value;
            if (isBookingProvider(next)) {
              setProvider(next);
            }
          }}
          className="w-full rounded-md border bg-background px-3 py-2 text-sm"
        >
          {(Object.keys(BOOKING_PROVIDER_LABELS) as BookingProvider[]).map((value) => (
            <option key={value} value={value}>
              {BOOKING_PROVIDER_LABELS[value]}
            </option>
          ))}
        </select>
      </label>

      {provider !== 'none' && (
        <>
          <AdminField
            label={provider === 'cloudbeds' ? 'Cloudbeds property ID' : 'Frontdesk Master property slug'}
            name="bookingEngineId"
            defaultValue={initial.engineId}
            placeholder={provider === 'cloudbeds' ? 'SFTNHx' : 'kotor-demo'}
            hint={
              provider === 'cloudbeds'
                ? 'Found in Cloudbeds → Distribution → Booking Engine.'
                : 'Usually the tenant slug or property ID in Frontdesk Master.'
            }
            missing={isTenantFieldMissing('bookingEngineId', readinessInput)}
            width="sm"
          />
          <AdminField
            label="Custom booking URL"
            name="bookingUrl"
            defaultValue={initial.url}
            placeholder="https://…"
            hint="When set, replaces the default provider URL. Query params are still appended automatically."
            width="lg"
          />
        </>
      )}
    </div>
  );
}
