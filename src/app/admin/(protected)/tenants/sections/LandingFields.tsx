'use client';

import { useMemo } from 'react';
import type {
  LandingRoomCard,
  LandingRoomType,
  StayOffer,
  TenantLandingSettings,
  TenantSettings,
} from '@/entities/tenant';
import {
  listStayOffersForAdmin,
  mergeOfferIntoLandingRoomType,
  normalizeStayOffersOnRead,
} from '@/entities/tenant/lib/normalizeStayOffers';
import { needsLandingBookingEngine } from '@/entities/tenant/lib/resolveLandingBookingGap';
import { isTenantFieldMissing, type TenantReadinessInput } from '@/entities/tenant/lib/resolveTenantReadiness';
import { resolveTenantCurrency } from '@/entities/tenant/lib/resolveHostelMoney';
import type { CurrencyCode } from '@/shared/lib/currency';
import type { AdminSectionId } from '../lib/adminSections';
import { AdminField, AdminFieldRow } from '../ui/AdminField';
import { AdminMoneyField } from '../ui/AdminField';
import { AdminImageField } from '../ui/AdminImageField';
import { AdminSectionAlert } from '../ui/AdminSectionAlert';
import { LandingRoomCardPreview } from '../ui/LandingRoomCardPreview';
import { mergeDraftSettings, useTenantFormDraft } from '../ui/TenantFormDraftContext';

interface LandingFieldsProps {
  tenantSlug: string;
  settings?: TenantSettings;
  readinessInput: TenantReadinessInput;
  onJumpToSection?: (sectionId: AdminSectionId) => void;
  scope?: 'full' | 'launch-hero' | 'launch-rooms';
}

function emptyCard(offerId: string): LandingRoomCard {
  return {
    offerId,
    description: '',
    imageUrl: '',
  };
}

function slugifyOfferId(title: string, index: number, existingIds: Set<string>): string {
  const base =
    title
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || `offer-${index + 1}`;
  let candidate = base;
  let suffix = 2;
  while (existingIds.has(candidate)) {
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }
  return candidate;
}

function RoomCardEditor({
  card,
  offer,
  offers,
  index,
  onChange,
  onRemove,
  showDescription = true,
  settings,
  primaryCurrency,
  tenantSlug,
}: {
  card: LandingRoomCard;
  offer: StayOffer | undefined;
  offers: StayOffer[];
  index: number;
  onChange: (next: LandingRoomCard) => void;
  onRemove: () => void;
  showDescription?: boolean;
  settings?: TenantSettings;
  primaryCurrency: CurrencyCode;
  tenantSlug: string;
}) {
  const previewRoom: LandingRoomType = offer
    ? mergeOfferIntoLandingRoomType(offer, card)
    : {
        id: card.offerId || `card-${index + 1}`,
        engineRoomTypeId: '',
        title: card.title?.trim() || '',
        description: card.description?.trim() || '',
        priceFromEur: card.priceFromEur,
        imageUrl: card.imageUrl?.trim() || '',
        requiresChatUpgrade: card.requiresChatUpgrade === true,
      };

  return (
    <div className="space-y-3 rounded-lg border bg-muted/20 p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Card {index + 1}
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
          <span className="text-sm font-medium">Stay offer</span>
          <select
            value={card.offerId}
            onChange={(event) => onChange({ ...card, offerId: event.target.value })}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
          >
            {offers.length === 0 ? <option value="">Create an offer first</option> : null}
            {offers.map((item) => (
              <option key={item.id} value={item.id}>
                {item.title || item.id}
              </option>
            ))}
          </select>
          <span className="block text-xs text-muted-foreground">
            Offers are managed in Guest app → Stay offers.
          </span>
        </label>
        <label className="block space-y-1.5 sm:col-span-2">
          <span className="text-sm font-medium">Title override</span>
          <input
            value={card.title ?? ''}
            onChange={(event) =>
              onChange({ ...card, title: event.target.value.trim() || undefined })
            }
            placeholder={offer?.title || 'Uses offer title'}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
          />
        </label>
        {showDescription ? (
          <label className="block space-y-1.5 sm:col-span-2">
            <span className="text-sm font-medium">Description</span>
            <span className="block text-xs text-muted-foreground">
              Leave empty to show photo, title, and book button only on the landing.
            </span>
            <textarea
              value={card.description ?? ''}
              onChange={(event) => onChange({ ...card, description: event.target.value })}
              rows={2}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            />
          </label>
        ) : null}
        <div className="sm:col-span-2">
          <AdminFieldRow>
            <AdminMoneyField
              label="Price from (per night)"
              value={card.priceFromEur ?? ''}
              onChange={(value) =>
                onChange({
                  ...card,
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
              value={card.imageUrl ?? ''}
              onChange={(imageUrl) => onChange({ ...card, imageUrl })}
              placeholder="/images/rooms/single-dorm.jpg"
              previewAlt={previewRoom.title || `Room ${index + 1}`}
            />
          </AdminFieldRow>
        </div>
        {showDescription ? (
          <label className="flex items-center gap-2 sm:col-span-2">
            <input
              type="checkbox"
              checked={card.requiresChatUpgrade === true}
              onChange={(event) =>
                onChange({ ...card, requiresChatUpgrade: event.target.checked })
              }
            />
            <span className="text-sm">Requires chat upgrade flow (dorm beds)</span>
          </label>
        ) : null}
      </div>
      <LandingRoomCardPreview room={previewRoom} settings={settings} />
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
  const migratedSettings = useMemo(
    () => normalizeStayOffersOnRead(mergedSettings),
    [mergedSettings]
  );
  const heroBgUrl = mergedSettings.heroBgUrl ?? '';
  const offers = listStayOffersForAdmin(mergedSettings);
  const roomCards =
    mergedSettings.landing?.roomCards ?? migratedSettings.landing?.roomCards ?? [];

  const patchLanding = (patch: Partial<TenantLandingSettings>) => {
    updateDraft({
      landing: {
        ...mergedSettings.landing,
        roomCards: mergedSettings.landing?.roomCards ?? [],
        ...patch,
      },
    });
  };

  const syncCards = (nextCards: LandingRoomCard[]) => {
    patchLanding({ roomCards: nextCards });
  };

  const addCard = () => {
    if (offers.length > 0) {
      const used = new Set(roomCards.map((card) => card.offerId));
      const nextOffer = offers.find((offer) => !used.has(offer.id)) ?? offers[0];
      syncCards([...roomCards, emptyCard(nextOffer.id)]);
      return;
    }

    const ids = new Set(offers.map((offer) => offer.id));
    const id = slugifyOfferId(`offer-${offers.length + 1}`, offers.length, ids);
    const offer: StayOffer = { id, title: '', sortOrder: offers.length };
    updateDraft({
      stayOffers: [...offers, offer],
      landing: {
        ...mergedSettings.landing,
        roomCards: [...roomCards, emptyCard(id)],
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
          : 'Required with room cards to show the landing instead of «coming soon».'
      }
      missing={isTenantFieldMissing('heroBgUrl', readinessInput)}
    />
  );

  const primaryCurrency = useMemo(
    () => resolveTenantCurrency(mergedSettings).primary,
    [mergedSettings]
  );
  const showBookingGap = needsLandingBookingEngine(mergedSettings);
  const offerById = useMemo(() => new Map(offers.map((offer) => [offer.id, offer])), [offers]);

  if (scope === 'launch-hero') {
    return <div className="space-y-4">{heroField}</div>;
  }

  const roomList = (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium">Landing room cards</p>
        <button type="button" className="text-xs text-primary hover:underline" onClick={addCard}>
          Add card
        </button>
      </div>
      {roomCards.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          Pick stay offers to show on the public landing. Create offers in Guest app → Stay offers,
          or add a card to create one.
        </p>
      ) : null}
      {roomCards.map((card, index) => (
        <RoomCardEditor
          key={`${card.offerId}-${index}`}
          card={card}
          offer={offerById.get(card.offerId)}
          offers={offers}
          index={index}
          settings={mergedSettings}
          primaryCurrency={primaryCurrency}
          showDescription={scope === 'full'}
          tenantSlug={tenantSlug}
          onChange={(next) => syncCards(roomCards.map((item, i) => (i === index ? next : item)))}
          onRemove={() => syncCards(roomCards.filter((_, i) => i !== index))}
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
