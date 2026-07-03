import { describe, expect, it } from 'vitest';
import {
  DEFAULT_TOURISM_PROFILE_ID,
  getTourismRegistrationProfile,
  TOURISM_PROFILE_IDS,
} from './tourismRegistrationProfiles';

describe('tourismRegistrationProfiles', () => {
  it('has me as default profile', () => {
    expect(DEFAULT_TOURISM_PROFILE_ID).toBe('me');
  });

  it('returns me profile with expected document kinds', () => {
    const profile = getTourismRegistrationProfile('me');
    expect(profile).toBeDefined();
    expect(profile!.profileId).toBe('me');
    expect(profile!.countryNameKey).toBe('Montenegro');
    expect(profile!.requiredDocumentKinds).toEqual(['passport', 'entry_stamp']);
  });

  it('returns undefined for unknown profile', () => {
    expect(getTourismRegistrationProfile('zz')).toBeUndefined();
  });

  it('TOURISM_PROFILE_IDS includes me', () => {
    expect(TOURISM_PROFILE_IDS).toContain('me');
  });
});
