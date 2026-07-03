import { describe, expect, it } from 'vitest';
import {
  finalizeGuestStayForSave,
  normalizeGuestStayComplianceOnRead,
  resolveTourismRegistrationRequired,
} from './normalizeGuestStaySettings';

describe('resolveTourismRegistrationRequired', () => {
  it('defaults to false when missing', () => {
    expect(resolveTourismRegistrationRequired(undefined)).toBe(false);
    expect(resolveTourismRegistrationRequired({})).toBe(false);
    expect(resolveTourismRegistrationRequired({ guestStay: {} })).toBe(false);
  });

  it('is true only when explicitly set', () => {
    expect(
      resolveTourismRegistrationRequired({
        guestStay: { tourismRegistrationRequired: true },
      })
    ).toBe(true);
  });
});

describe('finalizeGuestStayForSave', () => {
  it('keeps compliance flag without room map data', () => {
    expect(
      finalizeGuestStayForSave({
        roomMapEnabled: false,
        guestStay: undefined,
        tourismRegistrationRequired: true,
      })
    ).toEqual({ tourismRegistrationRequired: true });
  });

  it('merges flag into room map guest stay', () => {
    const guestStay = {
      floors: [{ id: '1' }],
      rooms: [{ id: 'r1', label: 'A', floorId: '1' }],
      beds: [{ id: 'b1', roomId: 'r1' }],
    };

    expect(
      finalizeGuestStayForSave({
        roomMapEnabled: true,
        guestStay,
        tourismRegistrationRequired: true,
      })
    ).toMatchObject({ tourismRegistrationRequired: true, beds: guestStay.beds });
  });
});

describe('normalizeGuestStayComplianceOnRead', () => {
  it('strips false flag and empty shells', () => {
    expect(
      normalizeGuestStayComplianceOnRead({ tourismRegistrationRequired: false })
    ).toBeUndefined();
  });
});
