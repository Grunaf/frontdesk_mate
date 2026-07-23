'use client';

import { useMemo } from 'react';
import type { StayOffer, TenantSettings } from '@/entities/tenant';
import { listStayOffersForAdmin } from '@/entities/tenant';
import { shouldShowEngineRoomTypeId } from '../lib/tenantAdminFieldSpecs';
import { mergeDraftSettings, useTenantFormDraft } from '../ui/TenantFormDraftContext';

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

function emptyOffer(index: number, existingIds: Set<string>): StayOffer {
  const id = slugifyOfferId(`offer-${index + 1}`, index, existingIds);
  return { id, title: '', sortOrder: index };
}

interface StayOffersFieldsProps {
  settings?: TenantSettings;
}

export function StayOffersFields({ settings }: StayOffersFieldsProps) {
  const { draft, updateDraft } = useTenantFormDraft();
  const mergedSettings = useMemo(
    () => mergeDraftSettings(settings ?? {}, draft),
    [settings, draft]
  );
  const offers = listStayOffersForAdmin(mergedSettings);
  const showEngineId = shouldShowEngineRoomTypeId(mergedSettings);

  const syncOffers = (next: StayOffer[]) => {
    updateDraft({
      stayOffers: next.map((offer, index) => ({ ...offer, sortOrder: index })),
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium">Stay offers</p>
          <p className="text-xs text-muted-foreground">
            Sellable groups (e.g. female dorm). Link physical rooms in Room map; show cards on
            Landing.
          </p>
        </div>
        <button
          type="button"
          className="shrink-0 text-xs text-primary hover:underline"
          onClick={() => {
            const ids = new Set(offers.map((offer) => offer.id));
            syncOffers([...offers, emptyOffer(offers.length, ids)]);
          }}
        >
          Add offer
        </button>
      </div>

      {offers.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          Create offers first, then assign rooms and landing cards to them.
        </p>
      ) : null}

      {offers.map((offer, index) => (
        <div key={offer.id} className="space-y-3 rounded-lg border bg-muted/20 p-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Offer {index + 1}
            </p>
            <button
              type="button"
              className="text-xs text-muted-foreground hover:text-destructive"
              onClick={() => syncOffers(offers.filter((_, i) => i !== index))}
            >
              Remove
            </button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block space-y-1.5 sm:col-span-2">
              <span className="text-sm font-medium">Title</span>
              <input
                value={offer.title}
                onChange={(event) => {
                  const title = event.target.value;
                  syncOffers(
                    offers.map((item, i) => (i === index ? { ...item, title } : item))
                  );
                }}
                placeholder="Bed in female dorm"
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              />
            </label>
            {showEngineId ? (
              <label className="block space-y-1.5 sm:col-span-2">
                <span className="text-sm font-medium">Booking engine room type ID</span>
                <input
                  value={offer.engineRoomTypeId ?? ''}
                  onChange={(event) => {
                    const engineRoomTypeId = event.target.value;
                    syncOffers(
                      offers.map((item, i) =>
                        i === index
                          ? {
                              ...item,
                              engineRoomTypeId: engineRoomTypeId.trim() || undefined,
                            }
                          : item
                      )
                    );
                  }}
                  placeholder="DORM8"
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                />
              </label>
            ) : null}
            <p className="text-[11px] text-muted-foreground sm:col-span-2">ID: {offer.id}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
