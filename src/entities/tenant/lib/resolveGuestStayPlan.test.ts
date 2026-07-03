import { describe, expect, it } from 'vitest';
import { resolveGuestFloorFromStay, resolveGuestStayPlan } from './resolveGuestStayPlan';
import type { TenantSettings } from '../model/settings';

const balkanStay: TenantSettings = {
  guestStay: {
    floors: [
      {
        id: '2',
        label: 'Floor 2',
        pathHint: 'Dorm doors are along the left corridor.',
      },
    ],
    rooms: [
      {
        id: 'vega',
        label: 'Vega',
        floorId: '2',
        doorImage: '/images/your-hostel/door.jpg',
      },
    ],
    beds: [
      {
        id: '4A',
        roomId: 'vega',
        x: 30,
        y: 30,
        bedType: 'bunk',
        topId: '4A-Top',
        bottomId: '4A-Bot',
      },
      { id: '4B', roomId: 'vega', x: 30, y: 110, bedType: 'single' },
    ],
  },
};

describe('resolveGuestStayPlan', () => {
  it('builds anchor, floor hint, room door, and layout beds from guest stay', () => {
    const plan = resolveGuestStayPlan(balkanStay, '4B');

    expect(plan.bedId).toBe('4B');
    expect(plan.bedLabel).toBe('2');
    expect(plan.bedSlot).toBe(2);
    expect(plan.bedTier).toBeUndefined();
    expect(plan.room?.label).toBe('Vega');
    expect(plan.floor?.label).toBe('Floor 2');
    expect(plan.layoutBeds).toHaveLength(2);
    expect(plan.layoutBeds[1]?.id).toBe('4B');
    expect(plan.steps).toHaveLength(2);
    expect(plan.hasContent).toBe(true);
  });

  it('resolves bunk tier IDs to the same room', () => {
    const plan = resolveGuestStayPlan(balkanStay, '4A-Top');

    expect(plan.bedId).toBe('4A-Top');
    expect(plan.bedLabel).toBe('1 · Upper');
    expect(plan.bedSlot).toBe(1);
    expect(plan.bedTier).toBe('upper');
    expect(plan.room?.label).toBe('Vega');
    expect(plan.layoutBeds).toHaveLength(2);
  });

  it('returns minimal plan when only runtime bed id is set', () => {
    const plan = resolveGuestStayPlan({}, '4B');

    expect(plan.room).toBeNull();
    expect(plan.layoutBeds).toHaveLength(0);
    expect(plan.hasContent).toBe(true);
  });

  it('returns empty plan when no bed is assigned', () => {
    const plan = resolveGuestStayPlan({});

    expect(plan.bedId).toBeNull();
    expect(plan.hasContent).toBe(false);
  });
});

describe('resolveGuestFloorFromStay', () => {
  it('resolves floor from bed → room chain', () => {
    expect(resolveGuestFloorFromStay(balkanStay, '4B')).toBe('2');
  });

  it('resolves floor from bunk tier id', () => {
    expect(resolveGuestFloorFromStay(balkanStay, '4A-Bot')).toBe('2');
  });

  it('returns null when bed is unknown', () => {
    expect(resolveGuestFloorFromStay(balkanStay, '9Z')).toBeNull();
  });
});
