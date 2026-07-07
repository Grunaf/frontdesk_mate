import { describe, expect, it } from 'vitest';
import {
  compileGuidedRouteNotesToSourceText,
  guidedRouteNotesMeetMinimum,
} from './compileGuidedRouteNotes';

describe('compileGuidedRouteNotes', () => {
  it('wraps notes with hub and path', () => {
    const text = compileGuidedRouteNotesToSourceText({
      hubLabel: 'Airport',
      routeMode: 'transit',
      notes: 'Bus 1 to old town.',
    });
    expect(text).toContain('Hub: Airport');
    expect(text).toContain('Public transit');
    expect(text).toContain('Bus 1 to old town.');
  });

  it('requires minimum note length', () => {
    expect(guidedRouteNotesMeetMinimum('', 'Airport', 'transit')).toBe(false);
    expect(guidedRouteNotesMeetMinimum('too short', 'Airport', 'transit')).toBe(false);
    expect(
      guidedRouteNotesMeetMinimum('Walk from terminal to bus stop near arrivals.', 'Airport', 'transit')
    ).toBe(true);
  });
});
