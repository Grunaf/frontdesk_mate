import type { TenantSettings } from '@/entities/tenant';
import type { HouseRule } from '@/entities/house-rules';
import { guestExtraKind, guestExtraSupportsSchedule } from './guestExtraPresets';
import type {
  GuestExtraConfig,
  GuestExtraPresetId,
  GuestExtrasLayout,
  ResolvedGuestExtra,
} from '../model/types';
import { GUEST_EXTRA_PRESET_IDS } from '../model/types';

export const MAX_FEATURED_GUEST_EXTRAS = 4;
export const MAX_STANDARD_GUEST_EXTRAS = 4;

function isPresetId(value: string): value is GuestExtraPresetId {
  return (GUEST_EXTRA_PRESET_IDS as readonly string[]).includes(value);
}

function readRawHouseRules(settings: TenantSettings): HouseRule[] {
  if (settings.houseRules !== undefined) {
    return settings.houseRules;
  }

  return [];
}

function legacyLaundryPrice(settings: TenantSettings): string | null {
  const fromSettings = settings.laundryCost?.trim();
  if (fromSettings) {
    return fromSettings;
  }

  const laundryRule = readRawHouseRules(settings).find(
    (rule) => rule.enabled && String(rule.templateId) === 'laundry'
  );

  if (laundryRule && 'params' in laundryRule) {
    return laundryRule.params?.cost?.trim() || null;
  }

  return null;
}

function legacyLaundryConfig(settings: TenantSettings): GuestExtraConfig | null {
  const price = legacyLaundryPrice(settings);
  if (!price) {
    return null;
  }

  return {
    presetId: 'laundry',
    enabled: true,
    priceLabel: price,
  };
}

function mergeConfigs(settings: TenantSettings): GuestExtraConfig[] {
  if (settings.guestExtras !== undefined) {
    return settings.guestExtras.filter((entry) => isPresetId(entry.presetId));
  }

  const configs: GuestExtraConfig[] = [];
  const laundry = legacyLaundryConfig(settings);
  if (laundry) {
    configs.push(laundry);
  }

  if (settings.checkOutTime?.trim()) {
    configs.push({ presetId: 'late_checkout', enabled: true });
  }

  return configs;
}

function resolveConfigEntry(entry: GuestExtraConfig): ResolvedGuestExtra | null {
  if (!entry.enabled) {
    return null;
  }

  const imageUrl = entry.imageUrl?.trim() || null;
  const highlight = Boolean(entry.highlight);
  const tileVariant = highlight && imageUrl ? 'highlight' : 'standard';

  const scheduleLabel =
    guestExtraSupportsSchedule(entry.presetId) && entry.scheduleLabel?.trim()
      ? entry.scheduleLabel.trim()
      : null;

  return {
    presetId: entry.presetId,
    kind: guestExtraKind(entry.presetId),
    highlight,
    imageUrl,
    tileVariant,
    priceLabel: entry.priceLabel?.trim() || null,
    scheduleLabel,
    externalUrl: entry.externalUrl?.trim() || null,
    whatsappEnabled: entry.whatsappEnabled !== false,
  };
}

export function resolveGuestExtras(settings: TenantSettings): ResolvedGuestExtra[] {
  return mergeConfigs(settings)
    .map(resolveConfigEntry)
    .filter((entry): entry is ResolvedGuestExtra => entry !== null);
}

export function resolveGuestExtrasForGuest(
  settings: TenantSettings,
  isRegistered: boolean
): ResolvedGuestExtra[] {
  return resolveGuestExtras(settings).filter((extra) => {
    if (extra.kind === 'partner') {
      return true;
    }

    return isRegistered;
  });
}

export function resolveGuestExtrasLayout(
  settings: TenantSettings,
  isRegistered: boolean
): GuestExtrasLayout {
  const visible = resolveGuestExtrasForGuest(settings, isRegistered);

  const featured = visible
    .filter((extra) => extra.tileVariant === 'highlight')
    .slice(0, MAX_FEATURED_GUEST_EXTRAS);

  const standard = visible
    .filter((extra) => extra.tileVariant === 'standard')
    .slice(0, MAX_STANDARD_GUEST_EXTRAS);

  return { featured, standard };
}

/** @deprecated Use resolveGuestExtrasLayout */
export function resolveGuestExtrasBento(
  settings: TenantSettings,
  isRegistered: boolean
): ResolvedGuestExtra[] {
  const { featured, standard } = resolveGuestExtrasLayout(settings, isRegistered);
  return [...featured, ...standard];
}
