import { describe, expect, it } from 'vitest';
import { applyBedUnitType, resolveBedUnitType } from './bed-type';

describe('bed-type', () => {
  it('defaults to single when bedType is missing', () => {
    expect(resolveBedUnitType({})).toBe('single');
  });

  it('applies bunk tier ids from unit id', () => {
    expect(applyBedUnitType({ id: '4A' }, 'bunk')).toEqual({
      bedType: 'bunk',
      topId: '4A-Top',
      bottomId: '4A-Bot',
    });
  });

  it('clears bunk fields for single and double types', () => {
    expect(applyBedUnitType({ id: '4B', topId: 'x', bottomId: 'y' }, 'single')).toEqual({
      bedType: 'single',
      topId: undefined,
      bottomId: undefined,
    });
  });
});
