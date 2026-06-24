import type { GuestExtraKind, GuestExtraPresetId } from '../model/types';

export interface GuestExtraPresetMeta {
  kind: GuestExtraKind;
  /** Show schedule field in admin and sheet (tours/guides — not on-demand transfer). */
  supportsSchedule: boolean;
}

export const GUEST_EXTRA_PRESET_META: Record<GuestExtraPresetId, GuestExtraPresetMeta> = {
  laundry: { kind: 'ops', supportsSchedule: false },
  early_checkin: { kind: 'ops', supportsSchedule: false },
  late_checkout: { kind: 'ops', supportsSchedule: false },
  partner_transfer: { kind: 'partner', supportsSchedule: false },
  partner_tour: { kind: 'partner', supportsSchedule: true },
  partner_guide: { kind: 'partner', supportsSchedule: true },
};

export function guestExtraKind(presetId: GuestExtraPresetId): GuestExtraKind {
  return GUEST_EXTRA_PRESET_META[presetId].kind;
}

export function guestExtraSupportsSchedule(presetId: GuestExtraPresetId): boolean {
  return GUEST_EXTRA_PRESET_META[presetId].supportsSchedule;
}
