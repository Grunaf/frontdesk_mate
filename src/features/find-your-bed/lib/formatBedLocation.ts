import type { GuestStayPlan } from '@/entities/tenant';

type BedLocationTranslate = (
  key: 'floorLabel' | 'roomLabel' | 'bedLabel' | 'bedWithTier' | 'bedTierUpper' | 'bedTierLower',
  values?: Record<string, string | number>
) => string;

function formatGuestBedValue(t: BedLocationTranslate, plan: GuestStayPlan): string {
  const slot = plan.bedSlot ?? plan.bedLabel ?? plan.bedId ?? '';

  if (plan.bedTier === 'upper') {
    return t('bedWithTier', { slot: String(slot), tier: t('bedTierUpper') });
  }

  if (plan.bedTier === 'lower') {
    return t('bedWithTier', { slot: String(slot), tier: t('bedTierLower') });
  }

  return String(slot);
}

export function formatBedLocationSegments(t: BedLocationTranslate, plan: GuestStayPlan): string[] {
  const segments: string[] = [];

  if (plan.floor?.label) {
    segments.push(t('floorLabel', { floor: plan.floor.label }));
  }

  if (plan.room?.label) {
    segments.push(t('roomLabel', { room: plan.room.label }));
  }

  if (plan.bedId) {
    segments.push(t('bedLabel', { bed: formatGuestBedValue(t, plan) }));
  }

  return segments;
}

export function formatBedLocationLine(t: BedLocationTranslate, plan: GuestStayPlan): string {
  return formatBedLocationSegments(t, plan).join(' · ');
}
