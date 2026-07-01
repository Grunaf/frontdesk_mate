'use client';

import { useMemo, useState } from 'react';
import {
  GUEST_EXTRA_PRESET_IDS,
  guestExtraSupportsSchedule,
  type GuestExtraConfig,
  type GuestExtraPresetId,
} from '@/entities/guest-extra';
import type { TenantSettings } from '@/entities/tenant';
import { getHouseRules } from '@/entities/house-rules';
import { mergeDraftSettings, useTenantFormDraft } from '../ui/TenantFormDraftContext';
import { AdminImageField } from '../ui/AdminImageField';
import { isGuestExtraHighlightTileImageMissing } from '../lib/tenantAdminFieldSpecs';

interface GuestExtrasFieldsProps {
  settings?: TenantSettings;
  tenantSlug: string;
}

const PRESET_LABELS: Record<GuestExtraPresetId, string> = {
  laundry: 'Laundry',
  early_checkin: 'Early check-in',
  late_checkout: 'Late checkout',
  partner_transfer: 'Transfer (on call)',
  partner_tour: 'Partner tour',
  partner_guide: 'Paid local guide',
};

function readLaundryRulePrice(settings: TenantSettings): string | undefined {
  const rawRules = settings.houseRules ?? [];
  const laundryRule = rawRules.find(
    (rule) => rule.enabled && String(rule.templateId) === 'laundry'
  );
  if (laundryRule && 'params' in laundryRule) {
    return laundryRule.params?.cost?.trim() || undefined;
  }

  return undefined;
}

function buildInitialGuestExtras(settings: TenantSettings): GuestExtraConfig[] {
  if (settings.guestExtras) {
    return GUEST_EXTRA_PRESET_IDS.map((presetId) => {
      const existing = settings.guestExtras?.find((entry) => entry.presetId === presetId);
      return existing ?? { presetId, enabled: false };
    });
  }

  return GUEST_EXTRA_PRESET_IDS.map((presetId) => {
    const config: GuestExtraConfig = { presetId, enabled: false };

    if (presetId === 'laundry') {
      const price = settings.laundryCost?.trim() || readLaundryRulePrice(settings);
      if (price) {
        config.enabled = true;
        config.priceLabel = price;
      }
    }

    if (presetId === 'late_checkout' && settings.checkOutTime?.trim()) {
      config.enabled = true;
    }

    return config;
  });
}

export function GuestExtrasFields({ settings, tenantSlug }: GuestExtrasFieldsProps) {
  const { draft, updateDraft } = useTenantFormDraft();
  const merged = useMemo(
    () => mergeDraftSettings(settings ?? {}, draft),
    [settings, draft]
  );
  const [extras, setExtras] = useState<GuestExtraConfig[]>(() => buildInitialGuestExtras(merged));

  const syncExtras = (next: GuestExtraConfig[]) => {
    setExtras(next);
    updateDraft({ guestExtras: next });
  };

  const updateExtra = (presetId: GuestExtraPresetId, patch: Partial<GuestExtraConfig>) => {
    syncExtras(
      extras.map((entry) => (entry.presetId === presetId ? { ...entry, ...patch } : entry))
    );
  };

  const highlightVisualCount = extras.filter(
    (entry) => entry.enabled && entry.highlight && entry.imageUrl?.trim()
  ).length;

  return (
    <div className="space-y-4 rounded-xl border bg-muted/20 p-4">
      <div>
        <p className="text-sm font-medium">Concierge extras</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Featured strip (horizontal scroll) for highlighted extras with a photo. Standard tiles stay
          in a 2×2 grid below. On-demand transfer has no schedule — use schedule only for tours and
          guides.
        </p>
      </div>

      <div className="space-y-3">
        {extras.map((extra) => {
          const supportsSchedule = guestExtraSupportsSchedule(extra.presetId);

          return (
            <div key={extra.presetId} className="space-y-3 rounded-lg border bg-background p-3">
              <label className="flex items-center justify-between gap-3 text-sm">
                <span className="font-medium">{PRESET_LABELS[extra.presetId]}</span>
                <input
                  type="checkbox"
                  checked={extra.enabled}
                  onChange={(event) => updateExtra(extra.presetId, { enabled: event.target.checked })}
                />
              </label>

              {extra.enabled ? (
                <div className="grid gap-2 sm:grid-cols-2">
                  <label className="block space-y-1 text-xs">
                    <span>Price label *</span>
                    <input
                      value={extra.priceLabel ?? ''}
                      onChange={(event) =>
                        updateExtra(extra.presetId, { priceLabel: event.target.value })
                      }
                      placeholder="30€"
                      className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                    />
                  </label>

                  <label className="flex items-end gap-2 pb-2 text-xs">
                    <input
                      type="checkbox"
                      checked={Boolean(extra.highlight)}
                      onChange={(event) =>
                        updateExtra(extra.presetId, { highlight: event.target.checked })
                      }
                    />
                    <span>Highlight (featured strip)</span>
                  </label>

                  {extra.highlight ? (
                    <div className="sm:col-span-2">
                      <AdminImageField
                        label="Tile image"
                        tenantSlug={tenantSlug}
                        kind="misc"
                        value={extra.imageUrl ?? ''}
                        onChange={(imageUrl) => updateExtra(extra.presetId, { imageUrl })}
                        placeholder="https://..."
                        hint="Square photo for the featured strip. Highlight without an image stays in the standard grid."
                        previewAlt={PRESET_LABELS[extra.presetId]}
                      />
                      {isGuestExtraHighlightTileImageMissing(extra) ? (
                        <p className="mt-1 text-xs text-amber-700">
                          Add a photo to show this extra in the featured strip.
                        </p>
                      ) : null}
                    </div>
                  ) : null}

                  {supportsSchedule ? (
                    <label className="block space-y-1 text-xs sm:col-span-2">
                      <span>Schedule label</span>
                      <input
                        value={extra.scheduleLabel ?? ''}
                        onChange={(event) =>
                          updateExtra(extra.presetId, { scheduleLabel: event.target.value })
                        }
                        placeholder="Daily at 10:00"
                        className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                      />
                    </label>
                  ) : null}

                  {extra.presetId.startsWith('partner_') ? (
                    <>
                      <label className="block space-y-1 text-xs sm:col-span-2">
                        <span>External link</span>
                        <input
                          value={extra.externalUrl ?? ''}
                          onChange={(event) =>
                            updateExtra(extra.presetId, { externalUrl: event.target.value })
                          }
                          placeholder="https://..."
                          className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                        />
                      </label>
                      <label className="flex items-center gap-2 text-xs sm:col-span-2">
                        <input
                          type="checkbox"
                          checked={extra.whatsappEnabled !== false}
                          onChange={(event) =>
                            updateExtra(extra.presetId, { whatsappEnabled: event.target.checked })
                          }
                        />
                        <span>Show WhatsApp button</span>
                      </label>
                    </>
                  ) : (
                    <label className="flex items-center gap-2 text-xs sm:col-span-2">
                      <input
                        type="checkbox"
                        checked={extra.whatsappEnabled !== false}
                        onChange={(event) =>
                          updateExtra(extra.presetId, { whatsappEnabled: event.target.checked })
                        }
                      />
                      <span>Show WhatsApp button</span>
                    </label>
                  )}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      {highlightVisualCount > 4 ? (
        <p className="text-xs text-amber-700">
          Only the first 4 highlighted extras with a photo appear in the featured strip.
        </p>
      ) : null}

      {getHouseRules(merged).length === 0 ? null : (
        <p className="text-xs text-muted-foreground">
          Legacy laundry house rules are ignored — configure laundry here instead.
        </p>
      )}
    </div>
  );
}
