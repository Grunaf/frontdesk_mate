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
  /** Admin tenant form vs owner portal — picks gated download URL. */
  surface?: 'platform' | 'owner';
}

function emptyPlatform(index: number): BookingPlatformOption {
  return { id: `platform-${index + 1}`, label: '' };
}

function extensionDownloadHref(surface: 'platform' | 'owner'): string {
  return surface === 'owner'
    ? '/api/owner/extensions/booking-com-sync'
    : '/admin/downloads/booking-com-sync';
}

export function ReceptionBookingPlatformsFields({
  settings,
  surface = 'platform',
}: ReceptionBookingPlatformsFieldsProps) {
  const { updateDraft } = useTenantFormDraft();
  const platforms = useMemo(
    () => settings?.receptionBooking?.platforms ?? [],
    [settings?.receptionBooking?.platforms]
  );
  const bookingComHotelId = settings?.receptionBooking?.bookingComHotelId ?? '';
  const hostelworldBookingPrefix = settings?.receptionBooking?.hostelworldBookingPrefix ?? '';
  const downloadHref = extensionDownloadHref(surface);

  const patchReceptionBooking = (next: {
    platforms?: BookingPlatformOption[];
    bookingComHotelId?: string;
    hostelworldBookingPrefix?: string;
  }) => {
    const nextPlatforms = next.platforms ?? platforms;
    const nextHotelId =
      next.bookingComHotelId !== undefined ? next.bookingComHotelId : bookingComHotelId;
    const nextHwPrefix =
      next.hostelworldBookingPrefix !== undefined
        ? next.hostelworldBookingPrefix
        : hostelworldBookingPrefix;

    updateDraft({
      receptionBooking: {
        platforms: nextPlatforms,
        ...(nextHotelId.trim() ? { bookingComHotelId: nextHotelId } : {}),
        ...(nextHwPrefix.trim() ? { hostelworldBookingPrefix: nextHwPrefix.trim() } : {}),
      },
    });
  };

  const setPlatforms = (next: BookingPlatformOption[]) => {
    patchReceptionBooking({ platforms: next });
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

      <label className="block space-y-1">
        <span className="text-sm font-medium">Booking.com hotel ID</span>
        <p className="text-xs text-muted-foreground">
          Used by reception to open reservations in Booking.com extranet, and to map Chrome
          extension sync (webhook resolves tenant by this hotel ID).
        </p>
        <input
          value={bookingComHotelId}
          onChange={(event) => patchReceptionBooking({ bookingComHotelId: event.target.value })}
          placeholder="e.g. 123456"
          inputMode="numeric"
          autoComplete="off"
          className="w-full max-w-xs rounded-md border px-2.5 py-1.5 font-mono text-sm"
        />
      </label>

      <div className="space-y-2 rounded-md border bg-background px-3 py-2.5">
        <p className="text-sm font-medium">Booking.com Chrome extension</p>
        <p className="text-xs text-muted-foreground">
          Private package (not Chrome Web Store). Download ZIP → unzip → Chrome → Extensions →
          Load unpacked. In the popup set webhook{' '}
          <code className="text-[11px]">/api/integrations/booking-com/webhook</code> on this app
          host and the server <code className="text-[11px]">BOOKING_COM_SYNC_SECRET</code>.
        </p>
        <a
          href={downloadHref}
          className="inline-flex rounded-md border bg-background px-3 py-1.5 text-xs font-medium hover:bg-muted/50"
        >
          Download extension ZIP
        </a>
      </div>

      <label className="block space-y-1">
        <span className="text-sm font-medium">Hostelworld booking prefix</span>
        <p className="text-xs text-muted-foreground">
          Leading 6 digits shared by this property. Reception stores only the unique booking suffix;
          Inbox links use the unique part.
        </p>
        <input
          value={hostelworldBookingPrefix}
          onChange={(event) =>
            patchReceptionBooking({
              hostelworldBookingPrefix: event.target.value.replace(/\D/g, '').slice(0, 6),
            })
          }
          placeholder="e.g. 123456"
          inputMode="numeric"
          maxLength={6}
          autoComplete="off"
          className="w-full max-w-xs rounded-md border px-2.5 py-1.5 font-mono text-sm"
        />
      </label>

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
