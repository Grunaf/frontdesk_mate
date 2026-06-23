import { describe, expect, it } from 'vitest';
import { appendGuestEntryToMagicLink, buildGuestMagicLinkUrl } from './buildMagicLinkUrl';

describe('buildGuestMagicLinkUrl', () => {
  it('builds token link without entry by default', () => {
    expect(buildGuestMagicLinkUrl('vega', 'en', 'abc123')).toBe(
      'http://vega.app.localhost:3000/en/check-in?t=abc123'
    );
  });

  it('adds entry param when provided', () => {
    expect(buildGuestMagicLinkUrl('vega', 'en', 'abc123', { entry: 'remote' })).toBe(
      'http://vega.app.localhost:3000/en/check-in?t=abc123&entry=remote'
    );
  });
});

describe('appendGuestEntryToMagicLink', () => {
  it('appends entry to an existing link', () => {
    expect(
      appendGuestEntryToMagicLink('http://vega.app.localhost:3000/en/check-in?t=abc123', 'desk')
    ).toBe('http://vega.app.localhost:3000/en/check-in?t=abc123&entry=desk');
  });
});
