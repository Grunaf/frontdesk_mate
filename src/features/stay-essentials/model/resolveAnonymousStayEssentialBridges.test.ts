import { describe, expect, it } from 'vitest';
import { resolveAnonymousStayEssentialBridgeIds } from './resolveAnonymousStayEssentialBridges';

describe('anonymous stay essential bridges', () => {
  it('shows only reception when content exists', () => {
    expect(resolveAnonymousStayEssentialBridgeIds(true)).toEqual(['reception']);
  });

  it('shows no bridges when reception has no content', () => {
    expect(resolveAnonymousStayEssentialBridgeIds(false)).toEqual([]);
  });

  it('never exposes wifi checkout or night access before check-in', () => {
    const visible = resolveAnonymousStayEssentialBridgeIds(true);
    expect(visible).not.toContain('wifi');
    expect(visible).not.toContain('checkout');
    expect(visible).not.toContain('nightAccess');
  });
});
