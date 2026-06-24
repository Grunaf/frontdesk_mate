'use client';

import { useMemo, useState } from 'react';
import type { LandingRoomType, TenantSettings } from '@/entities/tenant';
import { needsLandingBookingEngine } from '@/entities/tenant/lib/resolveLandingBookingGap';
import { isTenantFieldMissing, type TenantReadinessInput } from '@/entities/tenant/lib/resolveTenantReadiness';
import { resolveLandingRooms } from '@/entities/tenant/lib/resolveLandingRooms';
import type { AdminSectionId } from '../lib/adminSections';
import { AdminField } from '../ui/AdminField';
import { AdminSectionAlert } from '../ui/AdminSectionAlert';

interface LandingFieldsProps {
  settings?: TenantSettings;
  readinessInput: TenantReadinessInput;
  onJumpToSection?: (sectionId: AdminSectionId) => void;
  scope?: 'full' | 'launch-hero' | 'launch-rooms';
  /** When false, launch-hero omits landingJson (WA path uses launch-rooms instead). */
  includeLandingJson?: boolean;
}

function emptyRoom(index: number): LandingRoomType {
  return {
    id: `room-${index + 1}`,
    engineRoomTypeId: '',
    title: '',
    description: '',
    imageUrl: '',
  };
}

export function LandingFields({
  settings,
  readinessInput,
  onJumpToSection,
  scope = 'full',
  includeLandingJson = true,
}: LandingFieldsProps) {
  const initial = useMemo(() => resolveLandingRooms(settings ?? {}), [settings]);
  const [roomTypes, setRoomTypes] = useState<LandingRoomType[]>(
    initial.roomTypes.length > 0 ? initial.roomTypes : []
  );
  const showBookingGap = needsLandingBookingEngine(settings ?? {});

  const landingJson = JSON.stringify({
    roomsSectionTitle: settings?.landing?.roomsSectionTitle,
    roomsSectionSubtitle: settings?.landing?.roomsSectionSubtitle,
    roomTypes,
  });

  if (scope === 'launch-hero') {
    return (
      <div className="space-y-4">
        <AdminField
          label="Hero image URL"
          name="heroBgUrl"
          defaultValue={settings?.heroBgUrl}
          placeholder="images/room.jpg"
          hint="Background on the public landing page."
          missing={isTenantFieldMissing('heroBgUrl', readinessInput)}
        />
        <AdminField
          label="Check-in time"
          name="checkInTime"
          defaultValue={settings?.checkInTime}
          placeholder="14:00"
          missing={isTenantFieldMissing('checkInTime', readinessInput)}
        />
        {includeLandingJson ? <input type="hidden" name="landingJson" value={landingJson} /> : null}
      </div>
    );
  }

  if (scope === 'launch-rooms') {
    return (
      <div className="space-y-4">
        {showBookingGap ? (
          <AdminSectionAlert>
            Room cards use WhatsApp booking — reception phone from step 2 is the default contact.
          </AdminSectionAlert>
        ) : null}
        <input type="hidden" name="landingJson" value={landingJson} />
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium">Room types</p>
            <button
              type="button"
              className="text-xs text-primary hover:underline"
              onClick={() => setRoomTypes((current) => [...current, emptyRoom(current.length)])}
            >
              Add room type
            </button>
          </div>
          {roomTypes.length === 0 && (
            <p className="text-xs text-muted-foreground">
              Add at least one room card so guests can pick a stay before WhatsApp.
            </p>
          )}
          {roomTypes.map((room, index) => (
            <div key={`${room.id}-${index}`} className="space-y-3 rounded-lg border bg-muted/20 p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Room {index + 1}
                </p>
                <button
                  type="button"
                  className="text-xs text-muted-foreground hover:text-destructive"
                  onClick={() => setRoomTypes((current) => current.filter((_, i) => i !== index))}
                >
                  Remove
                </button>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block space-y-1.5 sm:col-span-2">
                  <span className="text-sm font-medium">Title</span>
                  <input
                    value={room.title}
                    onChange={(event) =>
                      setRoomTypes((current) =>
                        current.map((item, i) =>
                          i === index ? { ...item, title: event.target.value } : item
                        )
                      )
                    }
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  />
                </label>
                <label className="block space-y-1.5">
                  <span className="text-sm font-medium">Image URL</span>
                  <input
                    value={room.imageUrl}
                    onChange={(event) =>
                      setRoomTypes((current) =>
                        current.map((item, i) =>
                          i === index ? { ...item, imageUrl: event.target.value } : item
                        )
                      )
                    }
                    placeholder="/images/rooms/single-dorm.jpg"
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  />
                </label>
                <label className="block space-y-1.5">
                  <span className="text-sm font-medium">Internal ID</span>
                  <input
                    value={room.id}
                    onChange={(event) =>
                      setRoomTypes((current) =>
                        current.map((item, i) =>
                          i === index ? { ...item, id: event.target.value } : item
                        )
                      )
                    }
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  />
                </label>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {showBookingGap ? (
        <AdminSectionAlert
          actionLabel="Open Booking engine"
          onAction={onJumpToSection ? () => onJumpToSection('booking') : undefined}
        >
          Room cards are visible, but Book buttons need Booking engine (provider + property ID).
        </AdminSectionAlert>
      ) : null}
      <AdminField
        label="Hero image URL"
        name="heroBgUrl"
        defaultValue={settings?.heroBgUrl}
        placeholder="images/room.jpg"
        hint="Background on the public landing page. Required with room types or hero to show the landing instead of «coming soon»."
        missing={isTenantFieldMissing('heroBgUrl', readinessInput)}
      />
      <AdminField
        label="Rooms section title"
        name="landingRoomsSectionTitle"
        defaultValue={settings?.landing?.roomsSectionTitle}
        placeholder="Choose your stay"
      />
      <AdminField
        label="Rooms section subtitle"
        name="landingRoomsSectionSubtitle"
        defaultValue={settings?.landing?.roomsSectionSubtitle}
        placeholder="Select between dorm beds and private rooms"
      />

      <input type="hidden" name="landingJson" value={landingJson} />

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium">Room types</p>
          <button
            type="button"
            className="text-xs text-primary hover:underline"
            onClick={() => setRoomTypes((current) => [...current, emptyRoom(current.length)])}
          >
            Add room type
          </button>
        </div>

        {roomTypes.length === 0 && (
          <p className="text-xs text-muted-foreground">
            No room cards on the landing yet. Add types with booking engine room IDs (e.g. Cloudbeds
            DORM8).
          </p>
        )}

        {roomTypes.map((room, index) => (
          <div key={`${room.id}-${index}`} className="space-y-3 rounded-lg border bg-muted/20 p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Room {index + 1}
              </p>
              <button
                type="button"
                className="text-xs text-muted-foreground hover:text-destructive"
                onClick={() => setRoomTypes((current) => current.filter((_, i) => i !== index))}
              >
                Remove
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block space-y-1.5 sm:col-span-2">
                <span className="text-sm font-medium">Internal ID</span>
                <input
                  value={room.id}
                  onChange={(event) =>
                    setRoomTypes((current) =>
                      current.map((item, i) =>
                        i === index ? { ...item, id: event.target.value } : item
                      )
                    )
                  }
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                />
              </label>
              <label className="block space-y-1.5 sm:col-span-2">
                <span className="text-sm font-medium">Booking engine room type ID</span>
                <input
                  value={room.engineRoomTypeId}
                  onChange={(event) =>
                    setRoomTypes((current) =>
                      current.map((item, i) =>
                        i === index ? { ...item, engineRoomTypeId: event.target.value } : item
                      )
                    )
                  }
                  placeholder="DORM8"
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                />
              </label>
              <label className="block space-y-1.5 sm:col-span-2">
                <span className="text-sm font-medium">Title</span>
                <input
                  value={room.title}
                  onChange={(event) =>
                    setRoomTypes((current) =>
                      current.map((item, i) =>
                        i === index ? { ...item, title: event.target.value } : item
                      )
                    )
                  }
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                />
              </label>
              <label className="block space-y-1.5 sm:col-span-2">
                <span className="text-sm font-medium">Description</span>
                <textarea
                  value={room.description}
                  onChange={(event) =>
                    setRoomTypes((current) =>
                      current.map((item, i) =>
                        i === index ? { ...item, description: event.target.value } : item
                      )
                    )
                  }
                  rows={3}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                />
              </label>
              <label className="block space-y-1.5">
                <span className="text-sm font-medium">Price from (EUR)</span>
                <input
                  type="number"
                  min={0}
                  value={room.priceFromEur ?? ''}
                  onChange={(event) =>
                    setRoomTypes((current) =>
                      current.map((item, i) =>
                        i === index
                          ? {
                              ...item,
                              priceFromEur: event.target.value
                                ? Number(event.target.value)
                                : undefined,
                            }
                          : item
                      )
                    )
                  }
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                />
              </label>
              <label className="block space-y-1.5">
                <span className="text-sm font-medium">Image URL</span>
                <input
                  value={room.imageUrl}
                  onChange={(event) =>
                    setRoomTypes((current) =>
                      current.map((item, i) =>
                        i === index ? { ...item, imageUrl: event.target.value } : item
                      )
                    )
                  }
                  placeholder="/images/rooms/single-dorm.jpg"
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                />
              </label>
              <label className="flex items-center gap-2 sm:col-span-2">
                <input
                  type="checkbox"
                  checked={room.requiresChatUpgrade === true}
                  onChange={(event) =>
                    setRoomTypes((current) =>
                      current.map((item, i) =>
                        i === index
                          ? { ...item, requiresChatUpgrade: event.target.checked }
                          : item
                      )
                    )
                  }
                />
                <span className="text-sm">Requires chat upgrade flow (dorm beds)</span>
              </label>
            </div>
          </div>
        ))}
      </div>

      <AdminField
        label="Check-in time"
        name="checkInTime"
        defaultValue={settings?.checkInTime}
        placeholder="14:00"
        missing={isTenantFieldMissing('checkInTime', readinessInput)}
      />
      <AdminField label="Check-out time" name="checkOutTime" defaultValue={settings?.checkOutTime} placeholder="10:00" />
      <AdminField label="City tax" name="cityTax" defaultValue={settings?.cityTax} placeholder="10.00" />
      <AdminField
        label="Self check-in after"
        name="selfCheckInTimeAfter"
        defaultValue={settings?.selfCheckInTimeAfter}
        placeholder="23:00"
      />
    </div>
  );
}
