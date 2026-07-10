import { describe, expect, it } from 'vitest';
import { resolveAnonymousStayEssentialBridgeIds } from './resolveAnonymousStayEssentialBridges';

describe('anonymous stay essential bridges', () => {
  it('shows reception and contact when both have content', () => {
    expect(
      resolveAnonymousStayEssentialBridgeIds({
        hasReceptionContent: true,
        hasContactContent: true,
      })
    ).toEqual(['reception', 'contact']);
  });

  it('shows only contact when reception has no content', () => {
    expect(
      resolveAnonymousStayEssentialBridgeIds({
        hasReceptionContent: false,
        hasContactContent: true,
      })
    ).toEqual(['contact']);
  });

  it('shows no bridges when nothing is configured', () => {
    expect(
      resolveAnonymousStayEssentialBridgeIds({
        hasReceptionContent: false,
        hasContactContent: false,
      })
    ).toEqual([]);
  });

  it('never exposes wifi checkout or night access before check-in', () => {
    const visible = resolveAnonymousStayEssentialBridgeIds({
      hasReceptionContent: true,
      hasContactContent: true,
    });
    expect(visible).not.toContain('wifi');
    expect(visible).not.toContain('checkout');
    expect(visible).not.toContain('nightAccess');
  });
});
