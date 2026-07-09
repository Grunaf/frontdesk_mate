'use client';

import { useMemo } from 'react';
import type { BookingPlatformOption, TenantSettings } from '@/entities/tenant';
import {
  SUGGESTED_RECEPTION_BOOKING_PLATFORMS,
  slugifyBookingPlatformId,
} from '@/entities/tenant';
import { useTenantFormDraft } from '../ui/TenantFormDraftContext';

interface ReceptionBookingPlatformsFieldsProps {
  settings?: TenantSettings;
}

function emptyPlatform(index: number): BookingPlatformOption {
  return { id: `platform-${index + 1}`, label: '' };
}

export function ReceptionBookingPlatformsFields({ settings }: ReceptionBookingPlatformsFieldsProps) {
  const { updateDraft } = useTenantFormDraft();
  const platforms = useMemo(
    () => settings?.receptionBooking?.platforms ?? [],
    [settings?.receptionBooking?.platforms]
  );

  const setPlatforms = (next: BookingPlatformOption[]) => {
    updateDraft({
      receptionBooking: next.length > 0 ? { platforms: next } : { platforms: [] },
    });
  };

  const updatePlatform = (index: number, patch: Partial<BookingPlatformOption>) => {
    const next = platforms.map((entry, i) => (i === index ? { ...entry, ...patch } : entry));
    setPlatforms(next);
  };

  const removePlatform = (index: number) => {
    setPlatforms(platforms.filter((_, i) => i !== index));
  };

  const addPlatform = () => {
    setPlatforms([...platforms, emptyPlatform(platforms.length)]);
  };

  const addSuggested = () => {
    const existingIds = new Set(platforms.map((entry) => entry.id));
    const toAdd = SUGGESTED_RECEPTION_BOOKING_PLATFORMS.filter(
      (entry) => !existingIds.has(entry.id)
    );
    if (toAdd.length === 0) {
      return;
    }
    setPlatforms([...platforms, ...toAdd]);
  };

  return (
    <div className="space-y-3 rounded-lg border bg-muted/10 px-4 py-3">
      <div className="space-y-1">
        <p className="text-sm font-medium">Reception booking platforms</p>
        <p className="text-xs text-muted-foreground">
          Used on reception desk when issuing access. Not the website booking engine (
          <span className="font-medium text-foreground">Booking engine</span> in Guest app settings).
        </p>
      </div>

      {platforms.length === 0 ? (
        <p className="text-xs text-muted-foreground">No platforms — reception hides booking source fields.</p>
      ) : (
        <ul className="space-y-3">
          {platforms.map((platform, index) => (
            <li key={`${platform.id}-${index}`} className="space-y-2 rounded-md border bg-background p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-muted-foreground">Platform {index + 1}</span>
                <button
                  type="button"
                  className="text-xs text-destructive hover:underline"
                  onClick={() => removePlatform(index)}
                >
                  Remove
                </button>
              </div>
              <label className="block space-y-1">
                <span className="text-[11px] text-muted-foreground">Label (EN)</span>
                <input
                  value={platform.label}
                  onChange={(event) => {
                    const label = event.target.value;
                    const patch: Partial<BookingPlatformOption> = { label };
                    if (!platform.label.trim() || platform.id.startsWith('platform-')) {
                      patch.id = slugifyBookingPlatformId(label || `platform-${index + 1}`);
                    }
                    updatePlatform(index, patch);
                  }}
                  placeholder="Booking.com"
                  className="w-full rounded-md border px-2.5 py-1.5 text-sm"
                />
              </label>
              <label className="block space-y-1">
                <span className="text-[11px] text-muted-foreground">Id (slug)</span>
                <input
                  value={platform.id}
                  onChange={(event) =>
                    updatePlatform(index, { id: event.target.value.trim().toLowerCase() })
                  }
                  placeholder="booking-com"
                  className="w-full rounded-md border px-2.5 py-1.5 font-mono text-sm"
                />
              </label>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={addPlatform}
          className="rounded-md border bg-background px-3 py-1.5 text-xs font-medium hover:bg-muted/50"
        >
          Add platform
        </button>
        <button
          type="button"
          onClick={addSuggested}
          className="rounded-md border border-dashed bg-background px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted/50"
        >
          Add suggested (Walk-in, Direct, Booking.com, Hostelworld)
        </button>
      </div>
    </div>
  );
}
