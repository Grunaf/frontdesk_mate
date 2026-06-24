export const GUEST_EXTRA_PRESET_IDS = [
  'laundry',
  'early_checkin',
  'late_checkout',
  'partner_transfer',
  'partner_tour',
  'partner_guide',
] as const;

export type GuestExtraPresetId = (typeof GUEST_EXTRA_PRESET_IDS)[number];

export type GuestExtraKind = 'ops' | 'partner';

export type GuestExtraTileVariant = 'highlight' | 'standard';

export interface GuestExtraConfig {
  presetId: GuestExtraPresetId;
  enabled: boolean;
  highlight?: boolean;
  /** HTTPS image for featured highlight tile. Required for visual highlight strip. */
  imageUrl?: string;
  priceLabel?: string;
  /** Scheduled partner offers only — not used for on-demand transfer. */
  scheduleLabel?: string;
  externalUrl?: string;
  whatsappEnabled?: boolean;
}

export interface ResolvedGuestExtra {
  presetId: GuestExtraPresetId;
  kind: GuestExtraKind;
  highlight: boolean;
  imageUrl: string | null;
  tileVariant: GuestExtraTileVariant;
  priceLabel: string | null;
  scheduleLabel: string | null;
  externalUrl: string | null;
  whatsappEnabled: boolean;
}

export interface GuestExtrasLayout {
  featured: ResolvedGuestExtra[];
  standard: ResolvedGuestExtra[];
}
