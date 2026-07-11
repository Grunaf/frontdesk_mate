import { describe, expect, it } from 'vitest';
import { isHubCategory } from './isHubCategory';
import { isHubTransferDirection } from './isHubTransferDirection';

describe('isHubCategory', () => {
  it('accepts airport, bus, train', () => {
    expect(isHubCategory('airport')).toBe(true);
    expect(isHubCategory('bus')).toBe(true);
    expect(isHubCategory('train')).toBe(true);
  });

  it('rejects unknown values', () => {
    expect(isHubCategory('ferry')).toBe(false);
    expect(isHubCategory('')).toBe(false);
  });
});

describe('isHubTransferDirection', () => {
  it('accepts to_hostel and from_hostel', () => {
    expect(isHubTransferDirection('to_hostel')).toBe(true);
    expect(isHubTransferDirection('from_hostel')).toBe(true);
  });

  it('rejects unknown values', () => {
    expect(isHubTransferDirection('to_airport')).toBe(false);
    expect(isHubTransferDirection('')).toBe(false);
  });
});
