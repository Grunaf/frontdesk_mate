import { describe, expect, it } from 'vitest';

import { canEditReceptionStayOccupancy } from './canEditReceptionStayOccupancy';

describe('canEditReceptionStayOccupancy', () => {
  it('allows live stays without past-edit permission', () => {
    expect(
      canEditReceptionStayOccupancy({ stayEnded: false, canEditPastStays: false })
    ).toBe(true);
  });

  it('blocks ended stays without past-edit permission', () => {
    expect(
      canEditReceptionStayOccupancy({ stayEnded: true, canEditPastStays: false })
    ).toBe(false);
  });

  it('allows ended stays with past-edit permission', () => {
    expect(
      canEditReceptionStayOccupancy({ stayEnded: true, canEditPastStays: true })
    ).toBe(true);
  });
});
