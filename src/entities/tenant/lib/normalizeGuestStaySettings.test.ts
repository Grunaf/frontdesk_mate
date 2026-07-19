import { describe, expect, it } from 'vitest';
import {
  finalizeGuestStayForSave,
  normalizeGuestStayComplianceOnRead,
  resolvePlanStayStatusEnabled,
  resolveTourismRegistrationConfig,
  resolveTourismRegistrationProfile,
  resolveTourismRegistrationRequired,
} from './normalizeGuestStaySettings';

describe('resolveTourismRegistrationRequired', () => {
  it('defaults to false when missing', () => {
    expect(resolveTourismRegistrationRequired(undefined)).toBe(false);
    expect(resolveTourismRegistrationRequired({})).toBe(false);
    expect(resolveTourismRegistrationRequired({ guestStay: {} })).toBe(false);
  });

  it('is true with legacy boolean flag', () => {
    expect(
      resolveTourismRegistrationRequired({
        guestStay: { tourismRegistrationRequired: true },
      })
    ).toBe(true);
  });

  it('is true with new tourismRegistration object', () => {
    expect(
      resolveTourismRegistrationRequired({
        guestStay: { tourismRegistration: { enabled: true, profileId: 'me' } },
      })
    ).toBe(true);
  });

  it('is false when tourismRegistration.enabled is false', () => {
    expect(
      resolveTourismRegistrationRequired({
        guestStay: { tourismRegistration: { enabled: false, profileId: 'me' } },
      })
    ).toBe(false);
  });
});

describe('resolveTourismRegistrationConfig', () => {
  it('returns undefined when no tourism config', () => {
    expect(resolveTourismRegistrationConfig(undefined)).toBeUndefined();
    expect(resolveTourismRegistrationConfig({})).toBeUndefined();
  });

  it('maps legacy boolean to config with default profile', () => {
    const config = resolveTourismRegistrationConfig({
      guestStay: { tourismRegistrationRequired: true },
    });
    expect(config).toEqual({ enabled: true, profileId: 'me' });
  });

  it('returns new config object directly', () => {
    const config = resolveTourismRegistrationConfig({
      guestStay: { tourismRegistration: { enabled: true, profileId: 'me' } },
    });
    expect(config).toEqual({ enabled: true, profileId: 'me' });
  });

  it('prefers tourismRegistration over legacy boolean', () => {
    const config = resolveTourismRegistrationConfig({
      guestStay: {
        tourismRegistrationRequired: true,
        tourismRegistration: { enabled: true, profileId: 'me' },
      },
    });
    expect(config).toEqual({ enabled: true, profileId: 'me' });
  });
});

describe('resolveTourismRegistrationProfile', () => {
  it('returns undefined when disabled', () => {
    expect(resolveTourismRegistrationProfile(undefined)).toBeUndefined();
  });

  it('returns me profile for legacy boolean', () => {
    const profile = resolveTourismRegistrationProfile({
      guestStay: { tourismRegistrationRequired: true },
    });
    expect(profile).toBeDefined();
    expect(profile!.profileId).toBe('me');
    expect(profile!.requiredDocumentKinds).toEqual(['passport', 'entry_stamp']);
  });

  it('returns undefined for unknown profile id', () => {
    const profile = resolveTourismRegistrationProfile({
      guestStay: { tourismRegistration: { enabled: true, profileId: 'unknown' } },
    });
    expect(profile).toBeUndefined();
  });
});

describe('finalizeGuestStayForSave', () => {
  it('keeps compliance config without room map data', () => {
    const result = finalizeGuestStayForSave({
      roomMapEnabled: false,
      guestStay: undefined,
      tourismRegistrationRequired: true,
    });
    expect(result).toEqual({
      tourismRegistration: { enabled: true, profileId: 'me' },
    });
  });

  it('merges config into room map guest stay', () => {
    const guestStay = {
      floors: [{ id: '1' }],
      rooms: [{ id: 'r1', label: 'A', floorId: '1' }],
      beds: [{ id: 'b1', roomId: 'r1' }],
    };

    const result = finalizeGuestStayForSave({
      roomMapEnabled: true,
      guestStay,
      tourismRegistrationRequired: true,
    });
    expect(result).toMatchObject({
      tourismRegistration: { enabled: true, profileId: 'me' },
      beds: guestStay.beds,
    });
    expect(result).not.toHaveProperty('tourismRegistrationRequired');
  });

  it('passes custom profile id', () => {
    const result = finalizeGuestStayForSave({
      roomMapEnabled: false,
      guestStay: undefined,
      tourismRegistrationRequired: true,
      tourismProfileId: 'me',
    });
    expect(result).toEqual({
      tourismRegistration: { enabled: true, profileId: 'me' },
    });
  });

  it('strips legacy boolean from output', () => {
    const result = finalizeGuestStayForSave({
      roomMapEnabled: false,
      guestStay: { tourismRegistrationRequired: true },
      tourismRegistrationRequired: true,
    });
    expect(result).not.toHaveProperty('tourismRegistrationRequired');
    expect(result).toHaveProperty('tourismRegistration');
  });

  it('persists planStayStatusEnabled without room map', () => {
    const result = finalizeGuestStayForSave({
      roomMapEnabled: false,
      guestStay: undefined,
      tourismRegistrationRequired: false,
      planStayStatusEnabled: true,
    });
    expect(result).toEqual({ planStayStatusEnabled: true });
  });

  it('omits planStayStatusEnabled when off', () => {
    const result = finalizeGuestStayForSave({
      roomMapEnabled: false,
      guestStay: { planStayStatusEnabled: true },
      tourismRegistrationRequired: false,
      planStayStatusEnabled: false,
    });
    expect(result).toBeUndefined();
  });

  it('merges planStayStatusEnabled into room map guest stay', () => {
    const guestStay = {
      floors: [{ id: '1' }],
      rooms: [{ id: 'r1', label: 'A', floorId: '1' }],
      beds: [{ id: 'b1', roomId: 'r1' }],
    };

    const result = finalizeGuestStayForSave({
      roomMapEnabled: true,
      guestStay,
      tourismRegistrationRequired: false,
      planStayStatusEnabled: true,
    });
    expect(result).toMatchObject({
      planStayStatusEnabled: true,
      beds: guestStay.beds,
    });
  });
});

describe('resolvePlanStayStatusEnabled', () => {
  it('defaults to false when missing', () => {
    expect(resolvePlanStayStatusEnabled(undefined)).toBe(false);
    expect(resolvePlanStayStatusEnabled({})).toBe(false);
    expect(resolvePlanStayStatusEnabled({ guestStay: {} })).toBe(false);
    expect(
      resolvePlanStayStatusEnabled({ guestStay: { planStayStatusEnabled: false } })
    ).toBe(false);
  });

  it('is true only when explicitly enabled', () => {
    expect(
      resolvePlanStayStatusEnabled({ guestStay: { planStayStatusEnabled: true } })
    ).toBe(true);
  });
});

describe('normalizeGuestStayComplianceOnRead', () => {
  it('strips false flag and empty shells', () => {
    expect(
      normalizeGuestStayComplianceOnRead({ tourismRegistrationRequired: false })
    ).toBeUndefined();
  });

  it('migrates legacy boolean to tourismRegistration on read', () => {
    const result = normalizeGuestStayComplianceOnRead({
      tourismRegistrationRequired: true,
    });
    expect(result).toEqual({
      tourismRegistration: { enabled: true, profileId: 'me' },
    });
    expect(result).not.toHaveProperty('tourismRegistrationRequired');
  });

  it('preserves tourismRegistration object', () => {
    const result = normalizeGuestStayComplianceOnRead({
      tourismRegistration: { enabled: true, profileId: 'me' },
    });
    expect(result).toEqual({
      tourismRegistration: { enabled: true, profileId: 'me' },
    });
  });

  it('preserves planStayStatusEnabled alone', () => {
    expect(
      normalizeGuestStayComplianceOnRead({ planStayStatusEnabled: true })
    ).toEqual({ planStayStatusEnabled: true });
  });

  it('strips planStayStatusEnabled false', () => {
    expect(
      normalizeGuestStayComplianceOnRead({ planStayStatusEnabled: false })
    ).toBeUndefined();
  });
});
