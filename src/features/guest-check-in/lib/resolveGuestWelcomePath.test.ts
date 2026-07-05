import { describe, expect, it } from 'vitest';
import {
  parseGuestEntryParam,
  resolveGuestWelcomePath,
  resolveWelcomeStep,
} from './resolveGuestWelcomePath';

describe('parseGuestEntryParam', () => {
  it('accepts known entry values', () => {
    expect(parseGuestEntryParam('remote')).toBe('remote');
    expect(parseGuestEntryParam('door')).toBe('door');
    expect(parseGuestEntryParam('desk')).toBe('desk');
  });

  it('rejects unknown values', () => {
    expect(parseGuestEntryParam('inside')).toBeNull();
    expect(parseGuestEntryParam(null)).toBeNull();
  });
});

describe('resolveWelcomeStep', () => {
  it('defaults to route for unknown entry', () => {
    expect(resolveWelcomeStep({})).toBe('route');
  });

  it('maps remote to preparation', () => {
    expect(resolveWelcomeStep({ entry: 'remote' })).toBe('info');
  });

  it('maps door and onsite to arrival', () => {
    expect(resolveWelcomeStep({ entry: 'door' })).toBe('arrival');
    expect(resolveWelcomeStep({ modeOnsite: true })).toBe('arrival');
  });

  it('maps desk to preparation', () => {
    expect(resolveWelcomeStep({ entry: 'desk' })).toBe('info');
  });
});

describe('resolveGuestWelcomePath', () => {
  it('builds welcome path with step', () => {
    expect(resolveGuestWelcomePath({ locale: 'en' })).toBe('/en/welcome?step=route');
    expect(resolveGuestWelcomePath({ locale: 'en', entry: 'desk' })).toBe(
      '/en/welcome?step=info'
    );
    expect(resolveGuestWelcomePath({ locale: 'ru', entry: 'door' })).toBe(
      '/ru/welcome?step=arrival'
    );
  });

  it('preserves mode=onsite', () => {
    expect(resolveGuestWelcomePath({ locale: 'en', modeOnsite: true })).toBe(
      '/en/welcome?step=arrival&mode=onsite'
    );
  });
});
