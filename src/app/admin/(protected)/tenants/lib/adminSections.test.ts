import { describe, expect, it } from 'vitest';
import {
  ADMIN_SECTION_IDS,
  getAdminSectionStatus,
  normalizeAdminSectionId,
} from './adminSections';

describe('adminSections', () => {
  it('maps legacy arrival alias to arrival-journey', () => {
    expect(normalizeAdminSectionId('arrival')).toBe('arrival-journey');
    expect(ADMIN_SECTION_IDS).toContain('arrival-journey');
    expect(ADMIN_SECTION_IDS).not.toContain('arrival');
  });

  it('aggregates arrival-journey status from address, walk, and doors', () => {
    const preview = getAdminSectionStatus('arrival-journey', {
      cityPackId: 'sarajevo',
      settings: {},
    });
    expect(preview).not.toBe('ready');
  });
});
