export type BedUnitType = 'single' | 'bunk' | 'double';

export const BED_UNIT_TYPES: { value: BedUnitType; label: string; hint: string }[] = [
  { value: 'single', label: 'Single', hint: 'One bed — guest ID is the bed ID' },
  { value: 'bunk', label: 'Bunk (upper + lower)', hint: 'Two tiers with separate guest IDs' },
  { value: 'double', label: 'Double (side by side)', hint: 'Two berths on one mattress — side by side' },
];

export function resolveBedUnitType(bed: { bedType?: BedUnitType }): BedUnitType {
  return bed.bedType ?? 'single';
}

export function applyBedUnitType(
  bed: { id: string; bedType?: BedUnitType; topId?: string; bottomId?: string },
  type: BedUnitType
): { bedType: BedUnitType; topId?: string; bottomId?: string } {
  const baseId = bed.id.trim() || 'bed';

  switch (type) {
    case 'bunk':
      return {
        bedType: 'bunk',
        topId: bed.topId?.trim() || `${baseId}-Top`,
        bottomId: bed.bottomId?.trim() || `${baseId}-Bot`,
      };
    case 'double':
      return { bedType: 'double', topId: undefined, bottomId: undefined };
    default:
      return { bedType: 'single', topId: undefined, bottomId: undefined };
  }
}

export function isDoubleBed(type: BedUnitType): boolean {
  return type === 'double';
}
