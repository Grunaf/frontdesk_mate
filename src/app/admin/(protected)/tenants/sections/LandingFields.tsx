'use client';

import { useMemo } from 'react';
import type { LandingRoomType, TenantLandingSettings, TenantSettings } from '@/entities/tenant';
import { needsLandingBookingEngine } from '@/entities/tenant/lib/resolveLandingBookingGap';
import { isTenantFieldMissing, type TenantReadinessInput } from '@/entities/tenant/lib/resolveTenantReadiness';
import { resolveLandingRooms } from '@/entities/tenant/lib/resolveLandingRooms';
import { resolveTenantCurrency } from '@/entities/tenant/lib/resolveHostelMoney';
import type { CurrencyCode } from '@/shared/lib/currency';
import type { AdminSectionId } from '../lib/adminSections';
import { AdminField, AdminFieldRow } from '../ui/AdminField';
import { AdminMoneyField } from '../ui/AdminField';
import { AdminImageField } from '../ui/AdminImageField';
import { AdminSectionAlert } from '../ui/AdminSectionAlert';
import { LandingRoomCardPreview } from '../ui/LandingRoomCardPreview';
import { mergeDraftSettings, useTenantFormDraft } from '../ui/TenantFormDraftContext';
import { shouldShowEngineRoomTypeId } from '../lib/tenantAdminFieldSpecs';

interface LandingFieldsProps {
  tenantSlug: string;
  settings?: TenantSettings;
  readinessInput: TenantReadinessInput;
  onJumpToSection?: (sectionId: AdminSectionId) => void;
  scope?: 'full' | 'launch-hero' | 'launch-rooms';
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

function RoomTypeEditor({
  room,
  index,
  onChange,
  onRemove,
  showEngineId = true,
  showDescription = true,
  settings,
  primaryCurrency,
  tenantSlug,
}: {
  room: LandingRoomType;
  index: number;
  onChange: (next: LandingRoomType) => void;
  onRemove: () => void;
  showEngineId?: boolean;
  showDescription?: boolean;
  settings?: TenantSettings;
  primaryCurrency: CurrencyCode;
  tenantSlug: string;
}) {
  return (
    <div className="space-y-3 rounded-lg border bg-muted/20 p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Room {index + 1}
        </p>
        <button
          type="button"
          className="text-xs text-muted-foreground hover:text-destructive"
          onClick={onRemove}
        >
          Remove
        </button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block space-y-1.5 sm:col-span-2">
          <span className="text-sm font-medium">Title</span>
          <input
            value={room.title}
            onChange={(event) => onChange({ ...room, title: event.target.value })}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
          />
        </label>
        {showEngineId ? (
          <label className="block space-y-1.5 sm:col-span-2">
            <span className="text-sm font-medium">Booking engine room type ID</span>
            <input
              value={room.engineRoomTypeId}
              onChange={(event) => onChange({ ...room, engineRoomTypeId: event.target.value })}
              placeholder="DORM8"
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            />
          </label>
        ) : null}
        {showDescription ? (
          <label className="block space-y-1.5 sm:col-span-2">
            <span className="text-sm font-medium">Description</span>
            <span className="block text-xs text-muted-foreground">
              Leave empty to show photo, title, and book button only on the landing.
            </span>
            <textarea
              value={room.description}
              onChange={(event) => onChange({ ...room, description: event.target.value })}
              rows={2}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            />
          </label>
        ) : null}
        <div className="sm:col-span-2">
          <AdminFieldRow>
            <AdminMoneyField
              label="Price from (per night)"
              value={room.priceFromEur ?? ''}
              onChange={(value) =>
                onChange({
                  ...room,
                  priceFromEur: value ? Number(value) : undefined,
                })
              }
              currencyCode={primaryCurrency}
              amountHint="Shown on the room card price badge."
            />
            <AdminImageField
              label="Room photo"
              tenantSlug={tenantSlug}
              kind="misc"
              value={room.imageUrl}
              onChange={(imageUrl) => onChange({ ...room, imageUrl })}
              placeholder="/images/rooms/single-dorm.jpg"
              previewAlt={room.title || `Room ${index + 1}`}
            />
          </AdminFieldRow>
        </div>
        <label className="block space-y-1.5 sm:col-span-2 sm:max-w-[12rem]">
          <span className="text-sm font-medium">Internal ID</span>
          <input
            value={room.id}
            onChange={(event) => onChange({ ...room, id: event.target.value })}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
          />
        </label>
        {showDescription ? (
          <label className="flex items-center gap-2 sm:col-span-2">
            <input
              type="checkbox"
              checked={room.requiresChatUpgrade === true}
              onChange={(event) =>
                onChange({ ...room, requiresChatUpgrade: event.target.checked })
              }
            />
            <span className="text-sm">Requires chat upgrade flow (dorm beds)</span>
          </label>
        ) : null}
      </div>
      <LandingRoomCardPreview room={room} settings={settings} />
    </div>
  );
}

export function LandingFields({
  tenantSlug,
  settings,
  readinessInput,
  onJumpToSection,
  scope = 'full',
}: LandingFieldsProps) {
  const { draft, updateDraft } = useTenantFormDraft();
  const mergedSettings = useMemo(
    () => mergeDraftSettings(settings ?? {}, draft),
    [settings, draft]
  );
  const heroBgUrl = mergedSettings.heroBgUrl ?? '';

  const patchLanding = (patch: Partial<TenantLandingSettings>) => {
    updateDraft({
      landing: {
        ...mergedSettings.landing,
        roomTypes: mergedSettings.landing?.roomTypes ?? [],
        ...patch,
      },
    });
  };

  const heroField = (
    <AdminImageField
      label="Hero image"
      tenantSlug={tenantSlug}
      kind="hero"
      value={heroBgUrl}
      onChange={(next) => updateDraft({ heroBgUrl: next })}
      placeholder="images/room.jpg"
      hint={
        scope === 'launch-hero'
          ? 'Background on the public landing page.'
          : 'Required with room types to show the landing instead of «coming soon».'
      }
      missing={isTenantFieldMissing('heroBgUrl', readinessInput)}
    />
  );

  const primaryCurrency = useMemo(
    () => resolveTenantCurrency(mergedSettings).primary,
    [mergedSettings]
  );
  const fallbackRooms = useMemo(() => resolveLandingRooms(mergedSettings), [mergedSettings]);
  const roomTypes =
    mergedSettings.landing?.roomTypes ??
    (fallbackRooms.roomTypes.length > 0 ? fallbackRooms.roomTypes : []);
  const showEngineId = shouldShowEngineRoomTypeId(mergedSettings);
  const showBookingGap = needsLandingBookingEngine(mergedSettings);

  const syncRoomTypes = (nextRooms: LandingRoomType[]) => {
    patchLanding({ roomTypes: nextRooms });
  };

  if (scope === 'launch-hero') {
    return <div className="space-y-4">{heroField}</div>;
  }

  const roomList = (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium">Room types</p>
        <button
          type="button"
          className="text-xs text-primary hover:underline"
          onClick={() => syncRoomTypes([...roomTypes, emptyRoom(roomTypes.length)])}
        >
          Add room type
        </button>
      </div>
      {roomTypes.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          Add room cards for the public landing. Fill title, image, and internal ID at minimum.
        </p>
      ) : null}
      {roomTypes.map((room, index) => (
        <RoomTypeEditor
          key={`${room.id}-${index}`}
          room={room}
          index={index}
          settings={mergedSettings}
          primaryCurrency={primaryCurrency}
          showEngineId={showEngineId}
          showDescription={scope === 'full'}
          tenantSlug={tenantSlug}
          onChange={(next) =>
            syncRoomTypes(roomTypes.map((item, i) => (i === index ? next : item)))
          }
          onRemove={() => syncRoomTypes(roomTypes.filter((_, i) => i !== index))}
        />
      ))}
    </div>
  );

  if (scope === 'launch-rooms') {
    return (
      <div className="space-y-4">
        {showBookingGap ? (
          <AdminSectionAlert>
            Room cards use WhatsApp booking — reception phone is in Reception & hostel.
          </AdminSectionAlert>
        ) : null}
        {roomList}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {showBookingGap ? (
        <AdminSectionAlert
          actionLabel="Open Booking"
          onAction={onJumpToSection ? () => onJumpToSection('booking') : undefined}
        >
          Room cards are visible, but Book buttons need a booking provider and property ID.
        </AdminSectionAlert>
      ) : null}
      {heroField}
      <AdminField
        label="Rooms section title"
        value={mergedSettings.landing?.roomsSectionTitle ?? ''}
        onChange={(value) => patchLanding({ roomsSectionTitle: value || undefined })}
        placeholder="Choose your stay"
      />
      <AdminField
        label="Rooms section subtitle"
        value={mergedSettings.landing?.roomsSectionSubtitle ?? ''}
        onChange={(value) => patchLanding({ roomsSectionSubtitle: value || undefined })}
        placeholder="Select between dorm beds and private rooms"
      />
      {roomList}
    </div>
  );
}
